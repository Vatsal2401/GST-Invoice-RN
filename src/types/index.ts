export interface BusinessProfile {
  id: string;
  business_name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch: string;
  swift_code: string;
  signatory_name: string;
  invoice_prefix: string;
  logo_url: string;
}

export type BusinessProfileInput = Omit<BusinessProfile, 'id'>;

export interface Customer {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  state_code: string;
  pincode: string;
  gstin: string;
  pan: string;
  phone: string;
  created_at: string;
}

export type CustomerInput = Omit<Customer, 'id' | 'created_at'>;

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  sl_no: number;
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  rate: number;
  per: string;
  amount: number;
  cgst_rate: number;
  sgst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
}

export interface Invoice {
  id?: string;
  invoice_number: string;
  invoice_date: string;
  customer_id?: string | null;
  buyer_name: string;
  buyer_address: string;
  buyer_gstin: string;
  buyer_pan: string;
  buyer_state: string;
  buyer_state_code: string;
  ship_to_name: string;
  ship_to_address: string;
  ship_to_gstin: string;
  ship_to_state: string;
  delivery_note: string;
  payment_terms: string;
  delivery_terms: string;
  buyer_order_number: string;
  buyer_order_date: string;
  dispatch_doc_number: string;
  dispatch_doc_date: string;
  dispatched_through: string;
  destination: string;
  total_quantity: number;
  taxable_value: number;
  cgst_total: number;
  sgst_total: number;
  grand_total: number;
  status: 'DRAFT' | 'FINAL';
  cancelled: boolean;
  created_at?: string;
}

export interface InvoiceSummary {
  id: string;
  invoice_number: string;
  invoice_date: string;
  buyer_name: string;
  grand_total: number;
  status: 'DRAFT' | 'FINAL';
  cancelled: boolean;
  created_at: string;
  customer_name?: string;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
}

export interface Payment {
  id: string;
  customer_id: string;
  payment_date: string;
  amount: number;
  mode: string;
  reference: string;
  narration: string;
  created_at: string;
}

export type PaymentInput = Omit<Payment, 'id' | 'created_at'>;

export interface LedgerEntry {
  date: string;
  particulars: string;
  narration: string;
  vch_type: string;
  vch_no: string;
  debit: number;
  credit: number;
  ref_type: 'invoice' | 'payment';
  ref_id: string;
}

export interface HSNSummaryRow {
  hsn_sac: string;
  taxable_value: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  total_tax: number;
}

export interface InvoiceTotals {
  taxable_value: number;
  cgst_total: number;
  sgst_total: number;
  grand_total: number;
  total_quantity: number;
}
