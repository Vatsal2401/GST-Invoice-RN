import apiClient from '../lib/apiClient';
import type { Payment, PaymentInput, LedgerEntry } from '../types';

export async function addPayment(customerId: string, data: Omit<PaymentInput, 'customer_id'>): Promise<string> {
  const res = await apiClient.post<Payment>('/invoice/payments', {
    ...data,
    customer_id: customerId,
  });
  return res.data.id;
}

export async function deletePayment(id: string): Promise<void> {
  await apiClient.delete(`/invoice/payments/${id}`);
}

export async function getCustomerLedger(
  customerId: string,
  fromDate?: string,
  toDate?: string
): Promise<LedgerEntry[]> {
  const params: Record<string, string> = {};
  if (fromDate) params.from = fromDate;
  if (toDate) params.to = toDate;
  const res = await apiClient.get<LedgerEntry[]>(
    `/invoice/payments/customer/${customerId}/ledger`,
    { params }
  );
  return res.data;
}
