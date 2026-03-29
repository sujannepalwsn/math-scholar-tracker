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
import { ServerPagination } from "@/components/ui/server-pagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { usePagination } from "@/hooks/use-pagination";
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

const EXPENSE_CATEGORIES = ['salaries', 'rent', 'utilities', 'materials', 'maintenance', 'transport', 'admin', 'other'];

const ExpenseManagement = ({ canEdit }: { canEdit?: boolean }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    category: 'admin',
    description: '',
    amount: '',
    vendor: ''
  });

  const { page, setPage, pageSize, setPageSize } = usePagination();

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', user?.center_id, page, pageSize],
    queryFn: async () => {
      if (!user?.center_id) return { data: [], count: 0 };
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('expenses')
        .select('*', { count: "exact" })
        .eq('center_id', user.center_id)
        .order('expense_date', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!user?.center_id,
    placeholderData: (previousData) => previousData
  });

  const expenses = expensesData?.data || [];
  const totalRows = expensesData?.count || 0;
  const totalPages = Math.ceil(totalRows / pageSize);

  const createExpenseMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error('Center ID not found');
      if (!canEdit) throw new Error('Access Denied: You do not have permission to record expenses.');

      const { error } = await supabase
        .from('expenses')
        .insert({
          center_id: user.center_id,
          category: expenseForm.category,
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          expense_date: new Date().toISOString().split('T')[0],
          vendor: expenseForm.vendor || null,
          created_by: user.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Expense recorded successfully');
      setShowExpenseDialog(false);
      setExpenseForm({ category: 'admin', description: '', amount: '', vendor: '' });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to record expense');
    }
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      salaries: 'bg-red-100 text-red-800',
      rent: 'bg-orange-100 text-orange-800',
      utilities: 'bg-yellow-100 text-yellow-800',
      materials: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-purple-100 text-purple-800',
      transport: 'bg-green-100 text-green-800',
      admin: 'bg-slate-100 text-foreground/90',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Expense Records</CardTitle>
            {canEdit && (
              <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Expense
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Expense</DialogTitle>
                  <DialogDescription>Enter details for a new expense.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <select
                      id="category"
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl"
                    >
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Input
                      id="description"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      placeholder="e.g., Monthly office rent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (Rs.) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor">Vendor</Label>
                    <Input
                      id="vendor"
                      value={expenseForm.vendor}
                      onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                      placeholder="Vendor name"
                    />
                  </div>
                  <Button
                    onClick={() => createExpenseMutation.mutate()}
                    disabled={!expenseForm.description || !expenseForm.amount || createExpenseMutation.isPending}
                    className="w-full"
                  >
                    {createExpenseMutation.isPending ? 'Recording...' : 'Record Expense'}
                  </Button>
                </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {expensesLoading && !expenses.length ? (
            <TableSkeleton columns={5} rows={pageSize} />
          ) : expenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No expenses recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6 py-4">Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="pr-6">Vendor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium px-6 py-4">{expense.description}</TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
                      </TableCell>
                      <TableCell>{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                      <TableCell className="pr-6">{expense.vendor || '-'}</TableCell>
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

export default ExpenseManagement;