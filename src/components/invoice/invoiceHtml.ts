import type { InvoiceWithItems, BusinessProfile, HSNSummaryRow } from '../../types';
import { buildHsnSummary } from '../../utils/taxCalculator';
import { numberToWords } from '../../utils/numberToWords';
import { formatCurrencyINR } from '../../utils/formatCurrency';

export function generateInvoiceHtml(
  invoice: InvoiceWithItems,
  business: BusinessProfile,
  logoBase64?: string
): string {
  const hsnSummary: HSNSummaryRow[] = buildHsnSummary(invoice.items);
  const hsnTotals = hsnSummary.reduce(
    (acc, r) => ({
      taxable_value: acc.taxable_value + r.taxable_value,
      cgst_amount: acc.cgst_amount + r.cgst_amount,
      sgst_amount: acc.sgst_amount + r.sgst_amount,
      total_tax: acc.total_tax + r.total_tax,
    }),
    { taxable_value: 0, cgst_amount: 0, sgst_amount: 0, total_tax: 0 }
  );

  const fmtDate = (d: string) => {
    if (!d) return '';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [y, m, day] = d.split('-');
    return `${parseInt(day)}-${months[parseInt(m)-1]}-${y}`;
  };

  const logoHtml = logoBase64
    ? `<div style="text-align:center;margin-bottom:6px"><img src="${logoBase64}" style="max-height:60px;object-fit:contain" alt="Logo"/></div>`
    : '';

  const cancelledBanner = invoice.cancelled
    ? `<div style="background:#DC2626;color:#fff;text-align:center;font-weight:bold;font-size:14px;padding:6px;margin-bottom:6px;letter-spacing:2px">*** CANCELLED INVOICE ***</div>`
    : '';

  const itemRows = invoice.items.map(item => `
    <tr>
      <td style="${cellC}">${item.sl_no}</td>
      <td style="${cell}">${escHtml(item.description)}</td>
      <td style="${cellC}">${escHtml(item.hsn_sac)}</td>
      <td style="${cellR}">${item.quantity}</td>
      <td style="${cellR}">${formatCurrencyINR(item.rate)}</td>
      <td style="${cellC}">${escHtml(item.per)}</td>
      <td style="${cellR}">${formatCurrencyINR(item.amount)}</td>
    </tr>
    <tr>
      <td style="${cell}"></td>
      <td style="${cell};text-align:right;font-style:italic;padding-right:8px">CGST</td>
      <td style="${cell}"></td>
      <td style="${cell}"></td>
      <td style="${cellR}">${item.cgst_rate}%</td>
      <td style="${cell}"></td>
      <td style="${cellR}">${formatCurrencyINR(item.cgst_amount)}</td>
    </tr>
    <tr>
      <td style="${cell}"></td>
      <td style="${cell};text-align:right;font-style:italic;padding-right:8px">SGST</td>
      <td style="${cell}"></td>
      <td style="${cell}"></td>
      <td style="${cellR}">${item.sgst_rate}%</td>
      <td style="${cell}"></td>
      <td style="${cellR}">${formatCurrencyINR(item.sgst_amount)}</td>
    </tr>
  `).join('');

  const hsnRows = hsnSummary.map(row => `
    <tr>
      <td style="${cell}">${escHtml(row.hsn_sac)}</td>
      <td style="${cellR}">${formatCurrencyINR(row.taxable_value)}</td>
      <td style="${cellR}">${row.cgst_rate}%</td>
      <td style="${cellR}">${formatCurrencyINR(row.cgst_amount)}</td>
      <td style="${cellR}">${row.sgst_rate}%</td>
      <td style="${cellR}">${formatCurrencyINR(row.sgst_amount)}</td>
      <td style="${cellR}">${formatCurrencyINR(row.total_tax)}</td>
    </tr>
  `).join('');

  const metaRow = (l: string, v: string, l2: string, v2: string) => `
    <tr>
      <td style="${cellBold};width:25%;white-space:nowrap;background:#fafafa">${escHtml(l)}</td>
      <td style="${cell};width:25%">${escHtml(v)}</td>
      <td style="${cellBold};width:25%;white-space:nowrap;background:#fafafa">${escHtml(l2)}</td>
      <td style="${cell};width:25%">${escHtml(v2)}</td>
    </tr>`;

  const sellerAddr = [business.address1, business.address2, [business.city, business.state, business.pincode].filter(Boolean).join(', ')].filter(Boolean).map(l => `<div style="margin-bottom:2px">${escHtml(l)}</div>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; background: #fff; }
  @media print {
    @page { size: A4; margin: 10mm 14mm; }
    body { margin: 0; }
  }
</style>
</head>
<body>
<div style="width:210mm;min-height:297mm;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:11px;background:#fff;padding:10mm 14mm;box-sizing:border-box">

  ${cancelledBanner}
  ${logoHtml}

  <div style="text-align:center;font-weight:bold;font-size:15px;border:1px solid #000;padding:7px 4px;letter-spacing:2px">Tax Invoice</div>

  <!-- Seller | Invoice Meta -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #000;border-top:none">
    <tr>
      <td style="width:50%;border-right:1px solid #000;padding:8px 10px;vertical-align:top">
        <div style="font-weight:bold;font-size:15px;margin-bottom:4px">${escHtml(business.business_name)}</div>
        ${sellerAddr}
        ${business.gstin ? `<div style="margin-top:4px"><strong>GSTIN/UIN:</strong> ${escHtml(business.gstin)}</div>` : ''}
        ${business.pan ? `<div><strong>PAN:</strong> ${escHtml(business.pan)}</div>` : ''}
        ${business.phone ? `<div><strong>Ph:</strong> ${escHtml(business.phone)}</div>` : ''}
        ${business.email ? `<div><strong>Email:</strong> ${escHtml(business.email)}</div>` : ''}
      </td>
      <td style="width:50%;padding:0;vertical-align:top">
        <table style="width:100%;border-collapse:collapse">
          ${metaRow('Invoice No.', invoice.invoice_number, 'Dated', fmtDate(invoice.invoice_date))}
          ${metaRow('Delivery Note', invoice.delivery_note, 'Payment Terms', invoice.payment_terms)}
          ${metaRow("Buyer's Order No.", invoice.buyer_order_number, 'Dated', fmtDate(invoice.buyer_order_date))}
          ${metaRow('Dispatch Doc No.', invoice.dispatch_doc_number, 'Doc Date', fmtDate(invoice.dispatch_doc_date))}
          ${metaRow('Dispatched through', invoice.dispatched_through, 'Destination', invoice.destination)}
          <tr>
            <td colspan="4" style="${cell};border-top:none"><strong>Terms of Delivery: </strong>${escHtml(invoice.delivery_terms)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Consignee | Buyer -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #000;border-top:none">
    <tr>
      <td style="width:50%;border-right:1px solid #000;padding:8px 10px;vertical-align:top">
        <div style="font-weight:bold;font-size:11px;margin-bottom:4px;text-decoration:underline">Consignee (Ship to)</div>
        <div style="font-weight:bold;margin-bottom:2px">${escHtml(invoice.ship_to_name || invoice.buyer_name)}</div>
        <div style="margin-bottom:2px">${escHtml(invoice.ship_to_address || invoice.buyer_address)}</div>
        ${invoice.ship_to_gstin ? `<div><strong>GSTIN:</strong> ${escHtml(invoice.ship_to_gstin)}</div>` : ''}
        ${invoice.ship_to_state ? `<div><strong>State:</strong> ${escHtml(invoice.ship_to_state)}</div>` : ''}
      </td>
      <td style="width:50%;padding:8px 10px;vertical-align:top">
        <div style="font-weight:bold;font-size:11px;margin-bottom:4px;text-decoration:underline">Buyer (Bill to)</div>
        <div style="font-weight:bold;margin-bottom:2px">${escHtml(invoice.buyer_name)}</div>
        <div style="margin-bottom:2px">${escHtml(invoice.buyer_address)}</div>
        ${invoice.buyer_gstin ? `<div><strong>GSTIN:</strong> ${escHtml(invoice.buyer_gstin)}</div>` : ''}
        ${invoice.buyer_pan ? `<div><strong>PAN:</strong> ${escHtml(invoice.buyer_pan)}</div>` : ''}
        ${invoice.buyer_state ? `<div><strong>State:</strong> ${escHtml(invoice.buyer_state)}${invoice.buyer_state_code ? `, Code: ${escHtml(invoice.buyer_state_code)}` : ''}</div>` : ''}
      </td>
    </tr>
  </table>

  <!-- Items Table -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #000;border-top:none">
    <thead>
      <tr>
        <th style="${th};${cellC};width:4%">Sl</th>
        <th style="${th};width:32%">Description of Goods</th>
        <th style="${th};${cellC};width:10%">HSN/SAC</th>
        <th style="${thR};width:10%">Quantity</th>
        <th style="${thR};width:9%">Rate</th>
        <th style="${thR};width:6%">Per</th>
        <th style="${thR};width:14%">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr style="font-weight:bold">
        <td style="${cell}"></td>
        <td style="${cell}">Total</td>
        <td style="${cell}"></td>
        <td style="${cellR}">${invoice.total_quantity} ${invoice.items[0]?.unit || ''}</td>
        <td style="${cell}"></td>
        <td style="${cell}"></td>
        <td style="${cellR};font-size:11px">&#8377;${formatCurrencyINR(invoice.grand_total)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Amount in Words -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #000;border-top:none">
    <tr>
      <td style="${cell};width:85%"><strong>Amount Chargeable (in words): </strong>${numberToWords(invoice.grand_total)}</td>
      <td style="${cell};text-align:right;font-size:9px;width:15%">E. &amp; O.E</td>
    </tr>
  </table>

  <!-- HSN Summary -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #000;border-top:none">
    <thead>
      <tr>
        <th style="${th}">HSN/SAC</th>
        <th style="${thR}">Taxable Value</th>
        <th style="${thR}">CGST Rate</th>
        <th style="${thR}">CGST Amt</th>
        <th style="${thR}">SGST Rate</th>
        <th style="${thR}">SGST Amt</th>
        <th style="${thR}">Total Tax</th>
      </tr>
    </thead>
    <tbody>
      ${hsnRows}
      <tr style="font-weight:bold">
        <td style="${cell}">Total</td>
        <td style="${cellR}">${formatCurrencyINR(hsnTotals.taxable_value)}</td>
        <td style="${cell}"></td>
        <td style="${cellR}">${formatCurrencyINR(hsnTotals.cgst_amount)}</td>
        <td style="${cell}"></td>
        <td style="${cellR}">${formatCurrencyINR(hsnTotals.sgst_amount)}</td>
        <td style="${cellR}">${formatCurrencyINR(hsnTotals.total_tax)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Tax Amount in Words -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #000;border-top:none">
    <tr>
      <td style="${cell}"><strong>Tax Amount (in words): </strong>${numberToWords(hsnTotals.total_tax)}</td>
    </tr>
  </table>

  <!-- Bank Details | Signature -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #000;border-top:none">
    <tr>
      <td style="${cell};width:55%;border-right:1px solid #000;padding:8px 10px;vertical-align:top">
        <div style="font-weight:bold;margin-bottom:5px">Company's Bank Details</div>
        ${business.bank_name ? `<div style="margin-bottom:2px">Bank Name: ${escHtml(business.bank_name)}</div>` : ''}
        ${business.account_number ? `<div style="margin-bottom:2px">A/c No.: ${escHtml(business.account_number)}</div>` : ''}
        ${business.ifsc_code ? `<div style="margin-bottom:2px">Branch &amp; IFS Code: ${escHtml(business.branch)} / ${escHtml(business.ifsc_code)}</div>` : ''}
        ${business.swift_code ? `<div>SWIFT Code: ${escHtml(business.swift_code)}</div>` : ''}
      </td>
      <td style="${cell};width:45%;text-align:right;vertical-align:bottom;padding:8px 12px;height:80px">
        <div style="margin-bottom:32px">for ${escHtml(business.business_name)}</div>
        <div style="border-top:1px solid #000;display:inline-block;padding-top:3px;min-width:140px">Authorised Signatory</div>
        ${business.signatory_name ? `<div style="font-size:10px;margin-top:2px">${escHtml(business.signatory_name)}</div>` : ''}
      </td>
    </tr>
  </table>

  <!-- Declaration -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #000;border-top:none">
    <tr>
      <td style="${cell};font-style:italic;font-size:10px;padding:6px 10px">
        Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
      </td>
    </tr>
  </table>

  <div style="text-align:center;margin-top:10px;font-size:10px;color:#555">This is a Computer Generated Invoice</div>
</div>
</body>
</html>`;
}

function escHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const border = 'border:1px solid #000';
const cell = `${border};padding:5px 7px;font-size:11px;vertical-align:top`;
const cellR = `${cell};text-align:right`;
const cellC = `${cell};text-align:center`;
const cellBold = `${cell};font-weight:bold`;
const th = `${border};padding:6px 7px;font-size:11px;font-weight:bold;background:#f5f5f5;text-align:left;vertical-align:middle`;
const thR = `${th};text-align:right`;
