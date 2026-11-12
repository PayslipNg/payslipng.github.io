/* PayslipNG tax engine — Nigeria Tax Act 2025 (Act No. 7), effective 1 January 2026.
 * Sources: NTA 2025 s.30 (eligible deductions incl. rent relief) and Fourth Schedule (rates),
 * as published in the Official Gazette No. 117 of 26 June 2025; PwC Worldwide Tax Summaries
 * "Nigeria – Individual – Sample personal income tax calculation" (reviewed 29 May 2026).
 * Informational only — not tax advice. */
(function (root) {
  'use strict';
  var BANDS = [ // [width of band in NGN, rate]
    [800000, 0], [2200000, 0.15], [9000000, 0.18], [13000000, 0.21], [25000000, 0.23], [Infinity, 0.25]
  ];
  var RENT_RELIEF_RATE = 0.20, RENT_RELIEF_CAP = 500000;
  function r2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }
  function num(x) { x = Number(x); return isFinite(x) && x > 0 ? x : 0; }

  function annualTax(chargeable, bands) {
    var B = bands || BANDS;
    var left = Math.max(0, num(chargeable)), tax = 0, lines = [];
    for (var i = 0; i < B.length; i++) {
      var amt = Math.min(left, B[i][0]);
      var t = amt * B[i][1];
      lines.push({ band: B[i][0], rate: B[i][1], amount: r2(amt), tax: r2(t) });
      tax += t; left -= amt;
      if (left <= 0) break;
    }
    return { tax: r2(tax), lines: lines };
  }
  function rentRelief(annualRent) { return r2(Math.min(num(annualRent) * RENT_RELIEF_RATE, RENT_RELIEF_CAP)); }

  /* Generic mode: cfg.mode='generic', cfg.bands=[[width,rate],...] (last width Infinity), cfg.allowance = annual tax-free allowance/personal deduction; rent relief is not applied. */
  var DEFAULTS = { pensionEe: 8, pensionEr: 10, nhfRate: 2.5, nhisRate: 5 };

  /* emp: monthly basic, housing, transport, other; flags pension(bool), nhf(bool), nhis(bool);
   * annual rent, lifePremium, mortgageInterest; monthly otherDeduction (post-tax, e.g. loan).
   * cfg: pensionEe %, pensionEr %, nhfRate %, nhisRate % */
  function computeMonthly(emp, cfg) {
    cfg = Object.assign({}, DEFAULTS, cfg || {});
    var basic = num(emp.basic), housing = num(emp.housing), transport = num(emp.transport), other = num(emp.other);
    var gross = basic + housing + transport + other;
    var pensionBase = basic + housing + transport; // Pension Reform Act 2014: % of monthly emoluments (basic, housing, transport)
    var usePension = emp.pension !== false;
    var eePension = usePension ? pensionBase * num(cfg.pensionEe) / 100 : 0;
    var erPension = usePension ? pensionBase * num(cfg.pensionEr) / 100 : 0;
    var nhf = emp.nhf ? basic * num(cfg.nhfRate) / 100 : 0;
    var nhis = emp.nhis ? basic * num(cfg.nhisRate) / 100 : 0;
    var annualGross = gross * 12;
    var gen = cfg.mode === 'generic', rr = gen ? 0 : rentRelief(emp.rent);
    var life = num(emp.lifePremium), mort = num(emp.mortgageInterest);
    var annualDeductions = (eePension + nhf + nhis) * 12 + rr + life + mort;
    var allow = gen ? num(cfg.allowance) : 0;
    var chargeable = Math.max(0, annualGross - annualDeductions - allow);
    var at = annualTax(chargeable, gen ? cfg.bands : null);
    var paye = r2(at.tax / 12);
    var otherDed = num(emp.otherDeduction);
    var net = gross - eePension - nhf - nhis - paye - otherDed;
    return {
      basic: r2(basic), housing: r2(housing), transport: r2(transport), other: r2(other), gross: r2(gross),
      pensionBase: r2(pensionBase), eePension: r2(eePension), erPension: r2(erPension), nhf: r2(nhf), nhis: r2(nhis),
      paye: paye, otherDeduction: r2(otherDed), net: r2(net),
      annual: { gross: r2(annualGross), pension: r2(eePension * 12), nhf: r2(nhf * 12), nhis: r2(nhis * 12), rentRelief: rr,
        lifePremium: r2(life), mortgageInterest: r2(mort), deductions: r2(annualDeductions), chargeable: r2(chargeable),
        tax: at.tax, bands: at.lines },
      effectiveRate: annualGross ? r2(at.tax / annualGross * 100) : 0
    };
  }

  /* Annual worksheet for months actually worked (same monthly pay assumed). Reliefs that are annual
   * amounts (rent relief, life premium, mortgage interest) are claimed in full; tax is recomputed on actual-year income. */
  function computeAnnual(emp, cfg, months) {
    months = Math.max(0, Math.min(12, Math.floor(num(months === undefined ? 12 : months))));
    var m = computeMonthly(emp, cfg);
    var gross = m.gross * months, pen = m.eePension * months, nhf = m.nhf * months, nhis = m.nhis * months;
    var ded = pen + nhf + nhis + m.annual.rentRelief + m.annual.lifePremium + m.annual.mortgageInterest;
    var gen = cfg && cfg.mode === 'generic', allow = gen ? num(cfg.allowance) * months / 12 : 0;
    var chargeable = Math.max(0, gross - ded - allow);
    var at = annualTax(chargeable, gen ? cfg.bands : null);
    var deducted = r2(m.paye * months);
    return { months: months, gross: r2(gross), pension: r2(pen), erPension: r2(m.erPension * months), nhf: r2(nhf), nhis: r2(nhis),
      rentRelief: m.annual.rentRelief, lifePremium: m.annual.lifePremium, mortgageInterest: m.annual.mortgageInterest,
      deductions: r2(ded), chargeable: r2(chargeable), taxLiability: at.tax, payeDeducted: deducted,
      difference: r2(at.tax - deducted) };
  }

  var api = { BANDS: BANDS, RENT_RELIEF_CAP: RENT_RELIEF_CAP, DEFAULTS: DEFAULTS, annualTax: annualTax, rentRelief: rentRelief,
    computeMonthly: computeMonthly, computeAnnual: computeAnnual, r2: r2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PayTax = api;
})(this);
