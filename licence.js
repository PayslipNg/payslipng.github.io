/* PayslipNG Pro licence check — OFFLINE and NOT tamper-proof.
 * Anyone who reads this source can bypass it; it exists to make paying the easy, honest path.
 * Key format: PSNG-XXXX-XXXX-CCCC where CCCC is a checksum of the first two groups. */
(function (root) {
  'use strict';
  var SALT = 'payslipng-2026-v1';
  var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function fnv(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
  function checksum(body) { var h = fnv(SALT + '|' + body), out = ''; for (var i = 0; i < 4; i++) { out += ALPHA[h % 32]; h = Math.floor(h / 32); } return out; }
  function normalise(k) { return String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function isValid(key) {
    var k = normalise(key);
    if (!/^PSNG[A-Z0-9]{12}$/.test(k)) return false;
    var body = k.slice(4, 8) + '-' + k.slice(8, 12);
    return checksum(body) === k.slice(12, 16);
  }
  function make(rand) {
    rand = rand || Math.random; var g = function () { var s = ''; for (var i = 0; i < 4; i++) s += ALPHA[Math.floor(rand() * 32)]; return s; };
    var body = g() + '-' + g(); return 'PSNG-' + body + '-' + checksum(body);
  }
  var api = { isValid: isValid, make: make };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PayLicence = api;
})(this);
