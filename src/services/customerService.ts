import apiClient from '../lib/apiClient';
import type { Customer, CustomerInput } from '../types';

export async function getCustomers(): Promise<Customer[]> {
  const res = await apiClient.get<Customer[]>('/invoice/customers');
  return res.data;
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const res = await apiClient.get<Customer>(`/invoice/customers/${id}`);
  return res.data ?? null;
}

export async function createCustomer(data: CustomerInput): Promise<string> {
  const res = await apiClient.post<Customer>('/invoice/customers', data);
  return res.data.id;
}

export async function updateCustomer(id: string, data: CustomerInput): Promise<void> {
  await apiClient.patch(`/invoice/customers/${id}`, data);
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiClient.delete(`/invoice/customers/${id}`);
}
