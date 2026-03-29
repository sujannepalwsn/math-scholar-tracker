import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ServerPagination } from "@/components/ui/server-pagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { usePagination } from "@/hooks/use-pagination";
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

const PAYMENT_METHODS = ['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'other'];

const PaymentTracking = ({ canEdit }: { canEdit?: boolean }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    invoice_id: '',
    amount: '',
    payment_method: 'cash',
    reference_number: ''
  });

  const { page, setPage, pageSize, setPageSize } = usePagination();

  // Fetch unpaid invoices
  const { data: unpaidInvoices = [] } = useQuery({
    queryKey: ['unpaid-invoices', user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, students(name)')
        .eq('center_id', user?.center_id!)
        .neq('status', 'paid')
        .order('due_date');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  // Fetch payments - filtered by center through invoices
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', user?.center_id, page, pageSize],
    queryFn: async () => {
      if (!user?.center_id) return { data: [], count: 0 };

      // First get invoice IDs for this center
      const { data: centerInvoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('center_id', user.center_id);
      
      if (!centerInvoices || centerInvoices.length === 0) return { data: [], count: 0 };
      
      const invoiceIds = centerInvoices.map(i => i.id);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('payments')
        .select('*, invoices(invoice_number, center_id, students(name))', { count: "exact" })
        .in('invoice_id', invoiceIds)
        .order('payment_date', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!user?.center_id,
    placeholderData: (previousData) => previousData
  });

  const payments = paymentsData?.data || [];
  const totalRows = paymentsData?.count || 0;
  const totalPages = Math.ceil(totalRows / pageSize);

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error('Access Denied: You do not have permission to record payments.');
      if (!paymentForm.invoice_id || !paymentForm.amount) throw new Error('Please fill required fields');

      const invoice = unpaidInvoices.find(i => i.id === paymentForm.invoice_id);
      if (!invoice) throw new Error('Invoice not found');

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: paymentForm.invoice_id,
          amount: parseFloat(paymentForm.amount),
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentForm.payment_method,
          reference_number: paymentForm.reference_number || null
        });
      if (paymentError) throw paymentError;

      // Update invoice status if fully paid
      const totalPaid = parseFloat(paymentForm.amount);
      if (totalPaid >= invoice.total_amount) {
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ status: 'paid' })
          .eq('id', paymentForm.invoice_id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      toast.success('Payment recorded successfully');
      setShowPaymentDialog(false);
      setPaymentForm({ invoice_id: '', amount: '', payment_method: 'cash', reference_number: '' });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['unpaid-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to record payment')
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Records</CardTitle>
            {canEdit && (
              <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Record Payment</Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>Enter payment details.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Invoice *</Label>
                    <Select value={paymentForm.invoice_id} onValueChange={(v) => setPaymentForm({ ...paymentForm, invoice_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Invoice" /></SelectTrigger>
                      <SelectContent>
                        {unpaidInvoices.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.invoice_number} - {(inv as any).students?.name} ({formatCurrency(inv.total_amount)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (Rs.) *</Label>
                    <Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reference Number</Label>
                    <Input value={paymentForm.reference_number} onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })} />
                  </div>
                  <Button onClick={() => recordPaymentMutation.mutate()} disabled={!paymentForm.invoice_id || !paymentForm.amount || recordPaymentMutation.isPending} className="w-full">
                    {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                  </Button>
                </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {paymentsLoading && !payments.length ? (
            <TableSkeleton columns={6} rows={pageSize} />
          ) : payments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No payments recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6 py-4">Invoice</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="pr-6">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium px-6 py-4">{(payment as any).invoices?.invoice_number || '-'}</TableCell>
                      <TableCell>{(payment as any).invoices?.students?.name || '-'}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{payment.payment_method?.replace('_', ' ') || '-'}</TableCell>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell className="pr-6">{payment.reference_number || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <ServerPagination
            currentPage={page}
            totalPages={totalPages}
            totalRows={totalRows}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentTracking;