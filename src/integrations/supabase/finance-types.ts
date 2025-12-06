// Finance types aligned with database schema

export type FeeHeading = {
  id: string;
  center_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
};

export type FeeStructure = {
  id: string;
  center_id: string;
  fee_heading_id: string;
  class?: string;
  amount: number;
  frequency: string;
  created_at: string;
};

export type Invoice = {
  id: string;
  center_id: string;
  student_id: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  due_date?: string;
  status: string;
  invoice_date?: string;
  invoice_month?: number;
  invoice_year?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type InvoiceWithItems = Invoice & {
  students?: {
    id: string;
    name: string;
    parent_name?: string;
  };
};

export type Payment = {
  id: string;
  invoice_id: string;
  amount: number;
  amount_paid?: number;
  payment_date: string;
  payment_method?: string;
  reference_number?: string;
  created_at: string;
};

export type Expense = {
  id: string;
  center_id: string;
  category: string;
  description?: string;
  amount: number;
  expense_date: string;
  vendor?: string;
  receipt_url?: string;
  created_by?: string;
  created_at: string;
};

export type FinancialSummary = {
  total_invoiced: number;
  total_collected: number;
  total_outstanding: number;
  total_expenses: number;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

export const isInvoiceOverdue = (dueDate: string): boolean => {
  return new Date(dueDate) < new Date();
};