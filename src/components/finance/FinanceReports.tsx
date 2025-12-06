import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/integrations/supabase/finance-types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const FinanceReports = () => {
  const { user } = useAuth();

  // Fetch invoices summary
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-summary', user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('total_amount, status')
        .eq('center_id', user?.center_id!);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  // Fetch payments summary
  const { data: payments = [] } = useQuery({
    queryKey: ['payments-summary', user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('invoice_id', user?.center_id!);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  // Fetch expense breakdown
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['expense-breakdown', user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('category, amount')
        .eq('center_id', user?.center_id!);

      if (error) throw error;

      const grouped: Record<string, number> = {};
      data?.forEach((expense) => {
        grouped[expense.category] = (grouped[expense.category] || 0) + Number(expense.amount);
      });

      return Object.entries(grouped).map(([category, amount]) => ({
        name: category.toUpperCase(),
        value: amount
      }));
    },
    enabled: !!user?.center_id
  });

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

  // Calculate totals
  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvoiced)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalInvoiced > 0 ? `${Math.round((totalCollected / totalInvoiced) * 100)}%` : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {expensesLoading ? (
            <p>Loading expense data...</p>
          ) : expenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No expenses recorded</p>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              <ResponsiveContainer width={300} height={300}>
                <PieChart>
                  <Pie
                    data={expenses}
                    cx={150}
                    cy={150}
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenses.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1">
                <h3 className="font-semibold mb-4">Expense Summary</h3>
                <div className="space-y-3">
                  {expenses.map((expense, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm">{expense.name}</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(expense.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceReports;