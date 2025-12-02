import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, AlertCircle, FileText, ArrowLeft, Wallet } from 'lucide-react';
import FeeManagement from '@/components/finance/FeeManagement';
import InvoiceManagement from '@/components/finance/InvoiceManagement';
import PaymentTracking from '@/components/finance/PaymentTracking';
import ExpenseManagement from '@/components/finance/ExpenseManagement';
import FinanceReports from '@/components/finance/FinanceReports';
import { formatCurrency } from '@/integrations/supabase/finance-types';

const AdminFinance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch invoices summary
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-summary', user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('total_amount, status')
        .eq('center_id', user.center_id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  // Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ['payments-total', user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('amount');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  // Fetch expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses-total', user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from('expenses')
        .select('amount')
        .eq('center_id', user.center_id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const outstanding = totalInvoiced - totalCollected;
  const netBalance = totalCollected - totalExpenses;

  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const unpaidCount = invoices.filter(i => ['pending', 'overdue'].includes(i.status)).length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Finance Management</h1>
            <p className="text-muted-foreground">Manage fees, invoices, payments, and reports</p>
          </div>
          <Button variant="outline" onClick={() => navigate(user?.role === 'admin' ? '/admin-dashboard' : '/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalInvoiced)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(outstanding)}</div>
              <p className="text-xs text-muted-foreground mt-1">{unpaidCount} unpaid invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <Wallet className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">After expenses</p>
            </CardContent>
          </Card>
        </div>

        {overdueCount > 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900">{overdueCount} overdue invoice{overdueCount > 1 ? 's' : ''}</p>
                <p className="text-sm text-orange-700">These invoices require immediate attention</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="invoices" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices"><InvoiceManagement /></TabsContent>
          <TabsContent value="fees"><FeeManagement /></TabsContent>
          <TabsContent value="payments"><PaymentTracking /></TabsContent>
          <TabsContent value="expenses"><ExpenseManagement /></TabsContent>
          <TabsContent value="reports"><FinanceReports /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminFinance;