# PayslipNG — 2026 Nigeria payroll & payslip generator

A static, offline-capable web app that helps Nigerian small employers run monthly payroll under the **Nigeria Tax Act 2025** (in force 1 January 2026). No sign-up, no server, and no network calls. Data lives only in the browser (localStorage).

## Features
- Employer details and a staff list. Each employee has basic, housing, transport and other allowances, plus state of residence, TIN, PFA, RSA PIN and bank details.
- PAYE uses the Fourth Schedule bands. Eligible deductions under s.30: employee pension (default 8% of basic + housing + transport), NHF (default 2.5% of basic, toggle), NHIS (toggle, default 5% of basic, editable), rent relief (20% of annual rent, max ₦500,000), life insurance premiums and owner-occupied mortgage interest. Employer pension defaults to 10%. All rates can be edited.
- Outputs:
  - Printable payslips (print or save as PDF).
  - Monthly remittance schedule covering PAYE, pension (employee, employer and total) and NHF/NHIS, with a PAYE subtotal for each state. The due date is the 10th of the following month.
  - Annual per-employee worksheet for the employer return due 31 January. It supports part-year months and shows the liability against PAYE deducted.
  - CSV exports and a JSON backup you can export and import.
- **Free:** up to 3 employees. **Pro:** unlimited employees with a one-time licence key.

## Tax sources (verified 11 Nov 2026)
- Nigeria Tax Act 2025 (Act No. 7, Official Gazette No. 117, 26 June 2025), **section 30** (eligible deductions and rent relief) and the **Fourth Schedule** (rates). The text was read at accountants.ng/acts/nigeria-tax-act-2025/30/ and /schedule-4/, and also in the gazette copy at tat.gov.ng.
- PwC Worldwide Tax Summaries, *Nigeria – Individual – Sample personal income tax calculation* and *Deductions* (last reviewed 29 May 2026). `tests/tax.test.js` reproduces the worked example exactly: ₦25m gross, ₦2m rent, 8% pension → taxable ₦22.6m, PAYE ₦4,176,000.
- Joint Tax Board 2026 PIT Guidelines (via research.md): PAYE is remitted by the 10th of the following month, and the employer annual return is due by 31 January.
- The pension base (basic + housing + transport) and the NHF rate (2.5% of basic) follow the Pension Reform Act 2014 and the NHF Act. The NHIS default is an assumption, so check it against your scheme.

**Not tax advice.** Verify figures with a tax adviser or your state IRS before remitting or filing.

## Run / test
```
python3 -m http.server 8000      # then open http://localhost:8000
node tests/tax.test.js           # unit tests (no dependencies)
# Pro licence keys are generated with a private script kept outside this repo
```

## Licensing (honest note)
Keys look like `PSNG-XXXX-XXXX-CCCC` and are checked **offline** against a checksum in `licence.js`. The check is **not tamper-proof**: anyone can read the source and get around it. It is an honour-system unlock. The key generator is kept private, but that does not make the scheme secure.

**Buy link placeholder:** in `index.html`, search for `BUY LINK PLACEHOLDER`. Replace `href="#"` on `#buyLink` with the Selar or Paystack product URL and remove `data-placeholder="true"`.

## Privacy
There are no accounts, cookies, analytics or network requests. The Content-Security-Policy sets `connect-src 'none'`. Data stays in the browser's localStorage until the user downloads a file.

## Known limitations
- Monthly PAYE is the annualised tax ÷ 12, and pay is assumed to be the same every month. It does not handle mid-year raises, bonuses, arrears or 13th-month pay.
- It does not compute benefits-in-kind, gratuity or termination payments, NSITF or ITF (employer levies), or any minimum-wage exemption.
- It does not file returns or make payments. Output formats are generic, not any specific state IRS or PenCom upload template.
- The licence check is client-side only.
