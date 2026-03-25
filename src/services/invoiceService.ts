import apiClient from '../lib/apiClient';
import type { Invoice, InvoiceItem, InvoiceSummary, InvoiceWithItems } from '../types';

export async function getNextInvoiceNumber(): Promise<string> {
  const [profileRes, invoicesRes] = await Promise.all([
    apiClient.get<{ invoice_prefix: string }>('/invoice/profile'),
    apiClient.get<InvoiceSummary[]>('/invoice/invoices'),
  ]);
  const prefix = profileRes.data.invoice_prefix || 'INV';
  const invoices = invoicesRes.data;
  // Find highest number used so far for this prefix
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  let max = 0;
  for (const inv of invoices) {
    const m = inv.invoice_number.match(pattern);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

export async function getInvoices(): Promise<InvoiceSummary[]> {
  const res = await apiClient.get<InvoiceSummary[]>('/invoice/invoices');
  return res.data;
}

export async function getInvoiceById(id: string): Promise<InvoiceWithItems | null> {
  const res = await apiClient.get<InvoiceWithItems>(`/invoice/invoices/${id}`);
  return res.data ?? null;
}

export async function createInvoice(
  invoiceData: Omit<Invoice, 'id' | 'created_at'>,
  items: InvoiceItem[]
): Promise<string> {
  const res = await apiClient.post<Invoice>('/invoice/invoices', {
    ...invoiceData,
    items,
  });
  return res.data.id!;
}

export async function updateInvoice(
  id: string,
  invoiceData: Omit<Invoice, 'id' | 'created_at'>,
  items: InvoiceItem[]
): Promise<void> {
  await apiClient.patch(`/invoice/invoices/${id}`, {
    ...invoiceData,
    items,
  });
}

export async function finalizeInvoice(id: string): Promise<void> {
  await apiClient.patch(`/invoice/invoices/${id}/finalize`);
}

export async function cancelInvoice(id: string): Promise<void> {
  await apiClient.delete(`/invoice/invoices/${id}`);
}
