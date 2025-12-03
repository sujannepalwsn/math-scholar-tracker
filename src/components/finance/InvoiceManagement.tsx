import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Eye, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/integrations/supabase/finance-types';

const InvoiceManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ student_id: '', total_amount: '', due_date: '' });

  const { data: students = [] } = useQuery({
    queryKey: ['students', user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, grade')
        .eq('center_id', user?.center_id!)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, students(name)')
        .eq('center_id', user?.center_id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error('Center ID not found');
      
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      
      const { error } = await supabase
        .from('invoices')
        .insert({
          center_id: user.center_id,
          student_id: createForm.student_id,
          invoice_number: invoiceNumber,
          total_amount: parseFloat(createForm.total_amount),
          due_date: createForm.due_date,
          invoice_date: new Date().toISOString().split('T')[0], // Set invoice_date to current date
          status: 'pending'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invoice created successfully');
      setShowCreateDialog(false);
      setCreateForm({ student_id: '', total_amount: '', due_date: '' });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to create invoice')
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const invoice = invoices.find(i => i.id === invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      // Update invoice status
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_amount: invoice.total_amount }) // Mark as fully paid
        .eq('id', invoiceId);
      if (invoiceError) throw invoiceError;

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          amount: invoice.total_amount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'cash'
        });
      if (paymentError) throw paymentError;
    },
    onSuccess: () => {
      toast.success('Invoice marked as paid');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to mark as paid')
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-slate-100 text-slate-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoice Management</CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Create Invoice</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Invoice</DialogTitle>
                  <DialogDescription>Create a new invoice for a student.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Student *</Label>
                    <Select value={createForm.student_id} onValueChange={(v) => setCreateForm({ ...createForm, student_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name} - {s.grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Amount (₹) *</Label>
                    <Input type="number" value={createForm.total_amount} onChange={(e) => setCreateForm({ ...createForm, total_amount: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date *</Label>
                    <Input type="date" value={createForm.due_date} onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })} />
                  </div>
                  <Button onClick={() => createInvoiceMutation.mutate()} disabled={!createForm.student_id || !createForm.total_amount || !createForm.due_date || createInvoiceMutation.isPending} className="w-full">
                    {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <p>Loading invoices...</p>
          ) : invoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No invoices created yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{(invoice as any).students?.name || 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                    <TableCell>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {invoice.status !== 'paid' && (
                        <Button variant="outline" size="sm" onClick={() => markAsPaidMutation.mutate(invoice.id)} disabled={markAsPaidMutation.isPending}>
                          <DollarSign className="h-4 w-4 mr-1" /> Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceManagement;