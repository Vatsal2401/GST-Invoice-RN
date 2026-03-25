import type { Customer, LedgerEntry } from '../../types';
import { formatCurrencyINR } from '../../utils/formatCurrency';

function escHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)}-${months[parseInt(m)-1]}-${y}`;
}

export function generateLedgerHtml(
  customer: Customer,
  entries: LedgerEntry[],
  fromDate: string,
  toDate: string,
  businessName = '',
  logoBase64?: string
): string {
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const closing = totalDebit - totalCredit;

  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" style="max-height:44px;object-fit:contain;display:block;margin:0 auto 4px" alt="Logo"/>`
    : '';

  const border = 'border:1px solid #000';
  const cell = `${border};padding:3px 6px;font-size:10px;vertical-align:top`;
  const cellR = `${cell};text-align:right`;
  const th = `${border};padding:4px 6px;font-size:10px;font-weight:bold;background:#f0f0f0;text-align:left`;
  const thR = `${th};text-align:right`;

  const entryRows = entries.length === 0
    ? `<tr><td colspan="7" style="${cell};text-align:center;padding:12px;color:#888">No transactions in this period</td></tr>`
    : entries.map((e, i) => `
      <tr key="${i}">
        <td style="${cell}">${fmtDate(e.date)}</td>
        <td style="${cell};font-weight:${e.vch_type === 'Debit Note' ? 'bold' : 'normal'}">
          ${e.vch_type === 'Receipt' ? `By <strong>${escHtml(e.particulars)}</strong>` : `To <strong>${escHtml(e.particulars)}</strong>`}
        </td>
        <td style="${cell}">${escHtml(e.narration)}</td>
        <td style="${cell};font-weight:bold">${escHtml(e.vch_type)}</td>
        <td style="${cellR}">${escHtml(e.vch_no)}</td>
        <td style="${cellR}">${e.debit > 0 ? formatCurrencyINR(e.debit) : ''}</td>
        <td style="${cellR}">${e.credit > 0 ? formatCurrencyINR(e.credit) : ''}</td>
      </tr>
    `).join('');

  const closingRow = closing >= 0
    ? `<tr>
        <td style="${cell}">By</td>
        <td colspan="4" style="${cell};font-weight:bold">Closing Balance</td>
        <td style="${cellR}"></td>
        <td style="${cellR}">${formatCurrencyINR(closing)}</td>
       </tr>`
    : `<tr>
        <td style="${cell}">To</td>
        <td colspan="4" style="${cell};font-weight:bold">Closing Balance (Advance)</td>
        <td style="${cellR}">${formatCurrencyINR(Math.abs(closing))}</td>
        <td style="${cellR}"></td>
       </tr>`;

  const grandDebit = totalDebit + (closing < 0 ? Math.abs(closing) : 0);
  const grandCredit = totalCredit + (closing >= 0 ? closing : 0);

  const outstandingLabel = closing > 0
    ? `<span style="color:#DC2626;font-weight:bold">Outstanding: ${formatCurrencyINR(closing)}</span>`
    : closing < 0
    ? `<span style="color:#16A34A;font-weight:bold">Advance: ${formatCurrencyINR(Math.abs(closing))}</span>`
    : `<span style="color:#16A34A;font-weight:bold">Fully Settled</span>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; background: #fff; }
  @media print {
    @page { size: A4; margin: 10mm 12mm; }
  }
</style>
</head>
<body>
<div style="width:210mm;min-height:297mm;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:10px;background:#fff;padding:10mm 12mm;box-sizing:border-box">

  <!-- Business Header -->
  <div style="text-align:center;margin-bottom:4px">
    ${logoHtml}
    ${businessName ? `<div style="font-weight:bold;font-size:14px">${escHtml(businessName)}</div>` : ''}
  </div>
  <div style="border-bottom:1px solid #000;margin-bottom:6px;padding-bottom:4px"></div>

  <!-- Customer Header -->
  <div style="text-align:center;margin-bottom:6px">
    <div style="font-weight:bold;font-size:13px">${escHtml(customer.name)}</div>
    <div style="font-size:10px;color:#444">Ledger Account</div>
    ${customer.address ? `<div style="font-size:10px">${escHtml(customer.address)}</div>` : ''}
    ${(customer.city || customer.state) ? `<div style="font-size:10px">${escHtml([customer.city, customer.state].filter(Boolean).join(', '))}</div>` : ''}
    ${customer.gstin ? `<div style="font-size:10px">GSTIN: ${escHtml(customer.gstin)}</div>` : ''}
  </div>

  <!-- Date Range -->
  <div style="text-align:center;font-size:10px;margin-bottom:8px">
    ${fmtDate(fromDate)} to ${fmtDate(toDate)}
  </div>

  <!-- Ledger Table -->
  <table style="width:100%;border-collapse:collapse;${border}">
    <thead>
      <tr>
        <th style="${th};width:14%">Date</th>
        <th style="${th};width:24%">Particulars</th>
        <th style="${th};width:18%">Narration</th>
        <th style="${th};width:12%">Vch Type</th>
        <th style="${thR};width:10%">Vch No.</th>
        <th style="${thR};width:11%">Debit</th>
        <th style="${thR};width:11%">Credit</th>
      </tr>
    </thead>
    <tbody>
      ${entryRows}
      <tr>
        <td style="${cell}"></td>
        <td colspan="4" style="${cell}"></td>
        <td style="${cellR};font-weight:bold">${formatCurrencyINR(totalDebit)}</td>
        <td style="${cellR};font-weight:bold">${formatCurrencyINR(totalCredit)}</td>
      </tr>
      ${closingRow}
      <tr style="font-weight:bold;background:#f0f0f0">
        <td style="${cell}"></td>
        <td colspan="4" style="${cell}"></td>
        <td style="${cellR}">${formatCurrencyINR(grandDebit)}</td>
        <td style="${cellR}">${formatCurrencyINR(grandCredit)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Outstanding Summary -->
  <div style="margin-top:8px;font-size:10px;display:flex;justify-content:flex-end;gap:24px;text-align:right">
    <span><strong>Total Sales:</strong> ${formatCurrencyINR(totalDebit)}</span>
    &nbsp;&nbsp;&nbsp;
    <span><strong>Total Received:</strong> ${formatCurrencyINR(totalCredit)}</span>
    &nbsp;&nbsp;&nbsp;
    ${outstandingLabel}
  </div>

  <div style="text-align:center;margin-top:10px;font-size:9px;color:#888">This is a Computer Generated Ledger Statement</div>
</div>
</body>
</html>`;
}
