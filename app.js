/* PayslipNG app — all data in localStorage, no network calls. */
(function () {
  'use strict';
  var KEY = 'payslipng.v1', FREE_LIMIT = 3, T = window.PayTax, L = window.PayLicence;
  var STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT Abuja','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var CUR = '₦';
  function fmt(n) { return CUR + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function plain(n) { return Number(n || 0).toFixed(2); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function thisMonth() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

  function blank() { return { version: 1, employer: { name: '', address: '', tin: '', penCode: '', period: thisMonth(), payDate: '', pensionEe: 8, pensionEr: 10, nhfRate: 2.5, nhisRate: 5, mode: 'ng', currency: '₦', allowance: 0, bands: '' }, staff: [], licence: '' }; }
  var db;
  function load() { try { db = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch (e) { db = blank(); } db = sanitize(db); }
  function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
  function sanitize(d) {
    var b = blank(); if (!d || typeof d !== 'object') return b;
    var e = Object.assign(b.employer, d.employer && typeof d.employer === 'object' ? d.employer : {});
    var staff = Array.isArray(d.staff) ? d.staff.filter(function (s) { return s && typeof s === 'object'; }).map(function (s) { s.id = s.id || uid(); return s; }) : [];
    return { version: 1, employer: e, staff: staff, licence: typeof d.licence === 'string' ? d.licence : '' };
  }
  function isPro() { return L.isValid(db.licence); }
  function active() { return isPro() ? db.staff : db.staff.slice(0, FREE_LIMIT); }
  function parseBands(txt) { // lines: "width, rate%"; blank/"rest" width = remaining income
    var out = String(txt || '').split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var p = l.split(/[,;\t]/); var w = parseFloat(String(p[0]).replace(/[^0-9.]/g, '')); var r = parseFloat(String(p[1]).replace('%', ''));
      return [isFinite(w) && w > 0 ? w : Infinity, (isFinite(r) ? r : 0) / 100];
    });
    var i = out.findIndex(function (b) { return b[0] === Infinity; });
    if (i >= 0) out = out.slice(0, i + 1); else out.push([Infinity, out.length ? out[out.length - 1][1] : 0]);
    return out;
  }
  function cfg() { var e = db.employer; CUR = e.mode === 'generic' ? ((e.currency || '').trim() ? e.currency.trim() + ' ' : '') : '₦';
    var c = { pensionEe: e.pensionEe, pensionEr: e.pensionEr, nhfRate: e.nhfRate, nhisRate: e.nhisRate };
    if (e.mode === 'generic') { c.mode = 'generic'; c.bands = parseBands(e.bands); c.allowance = e.allowance; } return c; }
  function periodText() { var p = db.employer.period || thisMonth(); var d = new Date(p + '-01T00:00:00'); return isNaN(d) ? p : d.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }); }
  function dueText() { var p = (db.employer.period || thisMonth()).split('-'); var d = new Date(+p[0], +p[1], 10); return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }); }

  // ---------- tabs
  function show(tab) {
    $$('.tabs button').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
    $$('.tab').forEach(function (s) { s.classList.toggle('hidden', s.id !== 'tab-' + tab); });
    render();
  }
  $$('.tabs button').forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.tab); }); });

  // ---------- employer
  var ef = $('#employerForm');
  function fillEmployer() { cfg(); Object.keys(db.employer).forEach(function (k) { if (ef.elements[k]) ef.elements[k].value = db.employer[k]; }); }
  ef.addEventListener('submit', function (ev) {
    ev.preventDefault();
    ['name', 'address', 'tin', 'penCode', 'period', 'payDate', 'mode', 'currency', 'bands'].forEach(function (k) { db.employer[k] = ef.elements[k].value.trim(); });
    db.employer.allowance = Math.max(0, parseFloat(ef.elements.allowance.value) || 0);
    ['pensionEe', 'pensionEr', 'nhfRate', 'nhisRate'].forEach(function (k) { var v = parseFloat(ef.elements[k].value); db.employer[k] = isFinite(v) && v >= 0 ? v : T.DEFAULTS[k]; });
    save(); $('#empSaved').textContent = 'Saved ✓'; setTimeout(function () { $('#empSaved').textContent = ''; }, 2000); render();
  });

  // ---------- staff
  var sf = $('#staffForm');
  var NUMS = ['basic', 'housing', 'transport', 'other', 'rent', 'lifePremium', 'mortgageInterest', 'otherDeduction', 'months'];
  var TXT = ['name', 'staffId', 'title', 'state', 'tin', 'pfa', 'rsa', 'bank'];
  $('#states').innerHTML = STATES.map(function (s) { return '<option value="' + s + '">'; }).join('');
  function resetStaffForm() { sf.reset(); sf.elements.id.value = ''; $('#staffSubmit').textContent = 'Add employee'; $('#staffFormTitle').textContent = 'Add employee'; }
  $('#staffReset').addEventListener('click', function () { setTimeout(resetStaffForm, 0); });
  sf.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var id = sf.elements.id.value;
    if (!id && !isPro() && db.staff.length >= FREE_LIMIT) { banner('The free version handles up to ' + FREE_LIMIT + ' employees. Activate Pro in “Data & Pro” to add more.'); return; }
    var s = id ? db.staff.find(function (x) { return x.id === id; }) : { id: uid() };
    TXT.forEach(function (k) { s[k] = sf.elements[k].value.trim(); });
    NUMS.forEach(function (k) { var v = parseFloat(sf.elements[k].value); s[k] = isFinite(v) && v >= 0 ? v : (k === 'months' ? 12 : 0); });
    s.months = Math.min(12, Math.round(s.months));
    ['pension', 'nhf', 'nhis'].forEach(function (k) { s[k] = sf.elements[k].checked; });
    if (!id) db.staff.push(s);
    save(); resetStaffForm(); render();
  });
  function editStaff(id) {
    var s = db.staff.find(function (x) { return x.id === id; }); if (!s) return;
    resetStaffForm(); sf.elements.id.value = id;
    TXT.concat(NUMS).forEach(function (k) { sf.elements[k].value = s[k] == null ? '' : s[k]; });
    ['pension', 'nhf', 'nhis'].forEach(function (k) { sf.elements[k].checked = k === 'pension' ? s[k] !== false : !!s[k]; });
    $('#staffSubmit').textContent = 'Save changes'; $('#staffFormTitle').textContent = 'Edit ' + s.name; $('#staffDetails').open = true;
    sf.scrollIntoView({ behavior: 'smooth' });
  }
  function delStaff(id) { var s = db.staff.find(function (x) { return x.id === id; }); if (s && confirm('Remove ' + s.name + '?')) { db.staff = db.staff.filter(function (x) { return x.id !== id; }); save(); render(); } }
  $('#staffList').addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (!b) return; if (b.dataset.edit) editStaff(b.dataset.edit); if (b.dataset.del) delStaff(b.dataset.del); });

  function banner(msg) { var b = $('#limitBanner'); b.innerHTML = esc(msg) + ' <a href="#pricing" class="btn small" id="goPro">See Pro</a>'; b.classList.remove('hidden'); }
  function hideBanner() { $('#limitBanner').classList.add('hidden'); }
  document.addEventListener('click', function (ev) { if (ev.target.id === 'goPro') { ev.preventDefault(); show('data'); } });

  // ---------- renderers
  function renderStaff() {
    var a = active();
    $('#staffCount').textContent = db.staff.length + (isPro() ? ' employees · Pro' : ' of ' + FREE_LIMIT + ' (free)');
    $('#staffList').innerHTML = db.staff.length ? db.staff.map(function (s, i) {
      var m = T.computeMonthly(s, cfg()), off = i >= a.length;
      return '<div class="staff"><div><strong>' + esc(s.name) + '</strong> <span class="meta">' + esc(s.title || '') + (off ? ' · not included (free limit)' : '') + '</span><div class="meta">Gross ' + fmt(m.gross) + ' · PAYE ' + fmt(m.paye) + ' · Net ' + fmt(m.net) + '</div></div>' +
        '<div><button class="btn small" data-edit="' + esc(s.id) + '">Edit</button> <button class="btn small danger" data-del="' + esc(s.id) + '">Remove</button></div></div>';
    }).join('') : '<p class="muted">No staff yet. Add your first employee below.</p>';
    if (!isPro() && db.staff.length > FREE_LIMIT) banner('Only the first ' + FREE_LIMIT + ' employees are included in outputs on the free version.'); else if (isPro() || db.staff.length < FREE_LIMIT) hideBanner();
  }
  function row(label, v) { return '<span>' + esc(label) + '</span><span>' + fmt(v) + '</span>'; }
  function renderPayslips() {
    var e = db.employer; $('#periodLabel').textContent = periodText();
    var a = active();
    $('#payslips').innerHTML = a.length ? a.map(function (s) {
      var m = T.computeMonthly(s, cfg());
      return '<article class="slip"><header><div><h3>' + esc(e.name || 'Your business name') + '</h3><div class="muted small">' + esc(e.address) + (e.tin ? ' · TIN ' + esc(e.tin) : '') + '</div></div>' +
        '<div class="ar"><strong>PAYSLIP</strong><div class="small">' + esc(periodText()) + (e.payDate ? ' · paid ' + esc(e.payDate) : '') + '</div></div></header>' +
        '<div class="kv mb"><span>Employee</span><span><strong>' + esc(s.name) + '</strong></span><span>Staff ID / title</span><span>' + esc([s.staffId, s.title].filter(Boolean).join(' · ') || '—') + '</span>' +
        '<span>Tax ID / State</span><span>' + esc([s.tin, s.state].filter(Boolean).join(' · ') || '—') + '</span><span>PFA / RSA PIN</span><span>' + esc([s.pfa, s.rsa].filter(Boolean).join(' · ') || '—') + '</span>' +
        (s.bank ? '<span>Paid to</span><span>' + esc(s.bank) + '</span>' : '') + '</div>' +
        '<div class="cols"><div><strong>Earnings</strong><div class="kv">' + row('Basic', m.basic) + row('Housing', m.housing) + row('Transport', m.transport) + row('Other allowances', m.other) + '<span><strong>Gross pay</strong></span><span><strong>' + fmt(m.gross) + '</strong></span></div></div>' +
        '<div><strong>Deductions</strong><div class="kv">' + row('PAYE tax', m.paye) + row('Pension (employee)', m.eePension) + row('NHF', m.nhf) + row('NHIS', m.nhis) + row('Other deductions', m.otherDeduction) +
        '<span><strong>Total deductions</strong></span><span><strong>' + fmt(m.gross - m.net) + '</strong></span></div></div></div>' +
        '<div class="net"><span>Net pay</span><span>' + fmt(m.net) + '</span></div>' +
        '<p class="small muted">Employer pension contribution: ' + fmt(m.erPension) + '. Annual chargeable income ' + fmt(m.annual.chargeable) + ' (rent relief ' + fmt(m.annual.rentRelief) + '); effective tax rate ' + m.effectiveRate + '%. PAYE under Nigeria Tax Act 2025.</p></article>';
    }).join('') : '<div class="card muted">Add staff to generate payslips.</div>';
  }
  function remitData() {
    return active().map(function (s) { var m = T.computeMonthly(s, cfg()); return { s: s, m: m }; });
  }
  function renderRemit() {
    var e = db.employer, d = remitData(), tot = { paye: 0, ee: 0, er: 0, nhf: 0, nhis: 0, gross: 0 }, byState = {};
    var rows = d.map(function (x) {
      tot.paye += x.m.paye; tot.ee += x.m.eePension; tot.er += x.m.erPension; tot.nhf += x.m.nhf; tot.nhis += x.m.nhis; tot.gross += x.m.gross;
      var st = x.s.state || 'State not set'; byState[st] = (byState[st] || 0) + x.m.paye;
      return '<tr><td>' + esc(x.s.name) + '</td><td class="l">' + esc(x.s.state || '—') + '</td><td class="l">' + esc(x.s.tin || '') + '</td><td>' + fmt(x.m.gross) + '</td><td>' + fmt(x.m.paye) + '</td><td class="l">' + esc(x.s.pfa || '') + '</td><td class="l">' + esc(x.s.rsa || '') + '</td><td>' + fmt(x.m.eePension) + '</td><td>' + fmt(x.m.erPension) + '</td><td>' + fmt(x.m.eePension + x.m.erPension) + '</td><td>' + fmt(x.m.nhf) + '</td><td>' + fmt(x.m.nhis) + '</td></tr>';
    }).join('');
    $('#remit').innerHTML = '<h3>' + esc(e.name || 'Your business name') + ' — remittance schedule for ' + esc(periodText()) + '</h3><p class="small">Due by <strong>' + esc(dueText()) + '</strong> (10th of the following month). PAYE goes to the tax authority of each employee\'s state of residence.' + (e.tin ? ' Employer TIN: ' + esc(e.tin) + '.' : '') + (e.penCode ? ' Pension employer code: ' + esc(e.penCode) + '.' : '') + '</p>' +
      '<div class="table"><table><thead><tr><th>Employee</th><th class="l">State</th><th class="l">TIN</th><th>Gross</th><th>PAYE</th><th class="l">PFA</th><th class="l">RSA PIN</th><th>Pension EE</th><th>Pension ER</th><th>Pension total</th><th>NHF</th><th>NHIS</th></tr></thead><tbody>' + (rows || '<tr><td colspan="12" class="l muted">No staff yet.</td></tr>') + '</tbody>' +
      '<tfoot><tr><td>Total</td><td></td><td></td><td>' + fmt(tot.gross) + '</td><td>' + fmt(tot.paye) + '</td><td></td><td></td><td>' + fmt(tot.ee) + '</td><td>' + fmt(tot.er) + '</td><td>' + fmt(tot.ee + tot.er) + '</td><td>' + fmt(tot.nhf) + '</td><td>' + fmt(tot.nhis) + '</td></tr></tfoot></table></div>' +
      '<h3>PAYE by state</h3><div class="table"><table><tbody>' + Object.keys(byState).sort().map(function (k) { return '<tr><td>' + esc(k) + '</td><td>' + fmt(byState[k]) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function annualData() { return active().map(function (s) { return { s: s, a: T.computeAnnual(s, cfg(), s.months == null ? 12 : s.months) }; }); }
  function renderAnnual() {
    var e = db.employer, d = annualData(), tot = { gross: 0, ded: 0, ch: 0, tax: 0, paid: 0 };
    var rows = d.map(function (x) {
      var a = x.a; tot.gross += a.gross; tot.ded += a.deductions; tot.ch += a.chargeable; tot.tax += a.taxLiability; tot.paid += a.payeDeducted;
      return '<tr><td>' + esc(x.s.name) + '</td><td class="l">' + esc(x.s.tin || '') + '</td><td class="l">' + esc(x.s.state || '') + '</td><td>' + a.months + '</td><td>' + fmt(a.gross) + '</td><td>' + fmt(a.pension) + '</td><td>' + fmt(a.nhf) + '</td><td>' + fmt(a.nhis) + '</td><td>' + fmt(a.rentRelief) + '</td><td>' + fmt(a.lifePremium + a.mortgageInterest) + '</td><td>' + fmt(a.chargeable) + '</td><td>' + fmt(a.taxLiability) + '</td><td>' + fmt(a.payeDeducted) + '</td><td>' + fmt(a.difference) + '</td></tr>';
    }).join('');
    $('#annual').innerHTML = '<h3>' + esc(e.name || 'Your business name') + ' — employee income &amp; PAYE worksheet, year ended 31 December 2026</h3><p class="small">Supports the employer annual return due <strong>31 January 2027</strong>. Assumes the same monthly pay for each month worked. Difference = annual liability − PAYE deducted (positive = under-deducted).</p>' +
      '<div class="table"><table><thead><tr><th>Employee</th><th class="l">TIN</th><th class="l">State</th><th>Months</th><th>Gross</th><th>Pension</th><th>NHF</th><th>NHIS</th><th>Rent relief</th><th>Life/mortgage</th><th>Chargeable</th><th>Tax liability</th><th>PAYE deducted</th><th>Difference</th></tr></thead><tbody>' + (rows || '<tr><td colspan="14" class="l muted">No staff yet.</td></tr>') + '</tbody>' +
      '<tfoot><tr><td>Total</td><td></td><td></td><td></td><td>' + fmt(tot.gross) + '</td><td colspan="5"></td><td>' + fmt(tot.ch) + '</td><td>' + fmt(tot.tax) + '</td><td>' + fmt(tot.paid) + '</td><td>' + fmt(tot.tax - tot.paid) + '</td></tr></tfoot></table></div>';
  }
  function renderLicence() {
    var st = $('#licenceStatus');
    if (isPro()) { st.className = 'ok'; st.textContent = 'Pro active — unlimited employees.'; } else { st.className = 'muted'; st.textContent = 'Free version: up to ' + FREE_LIMIT + ' employees.'; }
  }
  function render() { renderStaff(); renderPayslips(); renderRemit(); renderAnnual(); renderLicence(); }

  // ---------- print & CSV
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { document.body.className = 'print-' + b.dataset.print; window.print(); setTimeout(function () { document.body.className = ''; }, 500); }); });
  function csvCell(v) { v = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function download(name, text, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100); }
  function csv(rows) { return '\ufeff' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n'); }
  $$('[data-csv]').forEach(function (b) { b.addEventListener('click', function () {
    var k = b.dataset.csv, p = db.employer.period || thisMonth(), rows;
    if (k === 'annual') {
      rows = [['Employee', 'Staff ID', 'TIN', 'State', 'Months', 'Gross', 'Pension', 'NHF', 'NHIS', 'Rent relief', 'Life premium', 'Mortgage interest', 'Chargeable income', 'Tax liability', 'PAYE deducted', 'Difference']];
      annualData().forEach(function (x) { var a = x.a; rows.push([x.s.name, x.s.staffId, x.s.tin, x.s.state, a.months, plain(a.gross), plain(a.pension), plain(a.nhf), plain(a.nhis), plain(a.rentRelief), plain(a.lifePremium), plain(a.mortgageInterest), plain(a.chargeable), plain(a.taxLiability), plain(a.payeDeducted), plain(a.difference)]); });
      download('payslipng-annual-2026.csv', csv(rows), 'text/csv');
    } else {
      rows = [['Period', 'Employee', 'Staff ID', 'TIN', 'State', 'PFA', 'RSA PIN', 'Basic', 'Housing', 'Transport', 'Other', 'Gross', 'PAYE', 'Pension EE', 'Pension ER', 'NHF', 'NHIS', 'Other deductions', 'Net pay']];
      remitData().forEach(function (x) { var m = x.m, s = x.s; rows.push([p, s.name, s.staffId, s.tin, s.state, s.pfa, s.rsa, plain(m.basic), plain(m.housing), plain(m.transport), plain(m.other), plain(m.gross), plain(m.paye), plain(m.eePension), plain(m.erPension), plain(m.nhf), plain(m.nhis), plain(m.otherDeduction), plain(m.net)]); });
      download('payslipng-' + k + '-' + p + '.csv', csv(rows), 'text/csv');
    }
  }); });

  // ---------- backup / licence
  $('#exportBtn').addEventListener('click', function () { download('payslipng-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(db, null, 2), 'application/json'); });
  $('#importFile').addEventListener('change', function (ev) {
    var f = ev.target.files[0]; if (!f) return; var r = new FileReader();
    r.onload = function () { try { var d = sanitize(JSON.parse(r.result)); if (!confirm('Replace current data with this backup (' + d.staff.length + ' staff)?')) return; db = d; save(); fillEmployer(); render(); alert('Backup restored.'); } catch (e) { alert('That file is not a valid PayslipNG backup.'); } ev.target.value = ''; };
    r.readAsText(f);
  });
  $('#wipeBtn').addEventListener('click', function () { if (confirm('Delete ALL PayslipNG data from this browser? Download a backup first if you need it.')) { localStorage.removeItem(KEY); load(); fillEmployer(); render(); } });
  $('#licenceForm').addEventListener('submit', function (ev) {
    ev.preventDefault(); var k = ev.target.elements.key.value.trim();
    if (L.isValid(k)) { db.licence = k.toUpperCase(); save(); hideBanner(); render(); } else { var st = $('#licenceStatus'); st.className = 'err'; st.textContent = 'That licence key is not valid.'; }
  });
  $('#buyLink').addEventListener('click', function (ev) { if (this.dataset.placeholder === 'true') { ev.preventDefault(); alert('Pro purchase is opening soon. Thank you for your interest!'); } });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
  load(); cfg(); fillEmployer(); render();
})();
