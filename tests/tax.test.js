// Run: node tests/tax.test.js
const assert = require('assert');
const T = require('../tax.js');
const L = require('../licence.js');
let pass = 0; const t = (name, fn) => { fn(); pass++; console.log('ok -', name); };

// 1. Published worked example: PwC Worldwide Tax Summaries, Nigeria – Individual –
//    Sample personal income tax calculation (last reviewed 29 May 2026):
//    gross NGN 25,000,000; rent NGN 2,000,000; pension 8% of gross; no NHF
//    => rent relief 400,000; taxable 22,600,000; PAYE 4,176,000; net 18,424,000.
t('PwC sample: NGN 25m gross, 2m rent', () => {
  const m = T.computeMonthly({ basic: 25000000 / 12, rent: 2000000 }, {});
  assert.strictEqual(m.annual.rentRelief, 400000);
  assert.strictEqual(m.annual.pension, 2000000);
  assert.strictEqual(m.annual.chargeable, 22600000);
  assert.strictEqual(m.annual.tax, 4176000);
  assert.strictEqual(m.annual.bands[1].tax, 330000);
  assert.strictEqual(m.annual.bands[2].tax, 1620000);
  assert.strictEqual(m.annual.bands[3].tax, 2226000);
  assert.strictEqual(m.paye, 348000);
  assert.strictEqual(Math.round(m.net * 12), 25000000 - 2000000 - 4176000); // 18,824,000 cash after pension & PAYE
});

// 2. Fourth Schedule band edges (NTA 2025)
t('band edges', () => {
  assert.strictEqual(T.annualTax(800000).tax, 0);
  assert.strictEqual(T.annualTax(3000000).tax, 330000);
  assert.strictEqual(T.annualTax(12000000).tax, 1950000);
  assert.strictEqual(T.annualTax(25000000).tax, 4680000);
  assert.strictEqual(T.annualTax(50000000).tax, 10430000);
  assert.strictEqual(T.annualTax(60000000).tax, 12930000);
  assert.strictEqual(T.annualTax(-5).tax, 0);
});

// 3. Rent relief: 20% of rent, max NGN 500,000 (s.30(2)(a)(vi))
t('rent relief cap', () => {
  assert.strictEqual(T.rentRelief(1000000), 200000);
  assert.strictEqual(T.rentRelief(2500000), 500000);
  assert.strictEqual(T.rentRelief(10000000), 500000);
  assert.strictEqual(T.rentRelief(0), 0);
});

// 4. Hand-checked SME example with NHF and pension base = basic+housing+transport
t('SME employee with NHF, NHIS off', () => {
  // basic 150k, housing 75k, transport 50k, other 25k => gross 300k/m, 3.6m/yr
  const m = T.computeMonthly({ basic: 150000, housing: 75000, transport: 50000, other: 25000, nhf: true, rent: 1200000 }, {});
  assert.strictEqual(m.eePension, 22000);   // 8% of 275k
  assert.strictEqual(m.erPension, 27500);   // 10% of 275k
  assert.strictEqual(m.nhf, 3750);          // 2.5% of basic
  // deductions/yr = (22000+3750)*12 + 240000 rent relief = 549,000 ; chargeable 3,051,000
  assert.strictEqual(m.annual.chargeable, 3051000);
  // tax = 330,000 + 51,000*18% = 339,180 ; monthly 28,265
  assert.strictEqual(m.annual.tax, 339180);
  assert.strictEqual(m.paye, 28265);
  assert.strictEqual(m.net, 300000 - 22000 - 3750 - 28265);
});

// 5. Low earner pays no PAYE (chargeable under NGN 800,000)
t('low earner zero PAYE', () => {
  const m = T.computeMonthly({ basic: 70000 }, {});
  assert.strictEqual(m.paye, 0);
});

// 6. Annual worksheet for part year
t('annual part-year', () => {
  const a = T.computeAnnual({ basic: 150000, housing: 75000, transport: 50000, other: 25000, nhf: true, rent: 1200000 }, {}, 12);
  assert.strictEqual(a.taxLiability, 339180);
  assert.strictEqual(a.difference, 0);
  const h = T.computeAnnual({ basic: 300000 }, {}, 6);
  assert.strictEqual(h.gross, 1800000);
  assert.ok(h.taxLiability < h.payeDeducted); // under-recovery flagged as over-deduction
});

// 7. Licence keys
t('licence keys', () => {
  for (let i = 0; i < 50; i++) assert.ok(L.isValid(L.make()));
  assert.ok(!L.isValid('PSNG-AAAA-BBBB-CCCC'));
  assert.ok(!L.isValid(''));
  const k = L.make(); assert.ok(L.isValid(k.toLowerCase().replace(/-/g, ' ')));
});
console.log(`\n${pass} test groups passed`);
