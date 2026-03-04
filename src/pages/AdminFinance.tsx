import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/integrations/supabase/finance-types";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, DollarSign, FileText, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import FeeManagement from '@/components/finance/FeeManagement';
import InvoiceManagement from '@/components/finance/InvoiceManagement';
import PaymentTracking from '@/components/finance/PaymentTracking';
import ExpenseManagement from '@/components/finance/ExpenseManagement';
import FinanceReports from '@/components/finance/FinanceReports';
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

  // Fetch payments - CORRECTED to filter by invoices belonging to the center
  const { data: payments = [] } = useQuery({
    queryKey: ['payments-total', user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      
      // First, get all invoice IDs for the current center
      const { data: centerInvoices, error: invError } = await supabase
        .from('invoices')
        .select('id')
        .eq('center_id', user.center_id);

      if (invError) throw invError;
      const invoiceIds = centerInvoices.map(inv => inv.id);

      if (invoiceIds.length === 0) return []; // No invoices, no payments

      // Then, fetch payments associated with these invoice IDs
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .in('invoice_id', invoiceIds); // Filter payments by invoice_id

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
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Finance Management</h1>
            <p className="text-muted-foreground text-lg">Manage fees, invoices, payments, and financial reports.</p>
          </div>
          <Button variant="outline" onClick={() => navigate(user?.role === 'admin' ? '/admin-dashboard' : '/')} className="rounded-2xl border-2">
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Total Invoiced", value: formatCurrency(totalInvoiced), icon: FileText, color: "text-blue-600", bgColor: "bg-blue-100" },
            { title: "Total Collected", value: formatCurrency(totalCollected), icon: TrendingUp, color: "text-green-600", bgColor: "bg-green-100", valueClass: "text-green-600" },
            { title: "Outstanding", value: formatCurrency(outstanding), icon: AlertCircle, color: "text-orange-600", bgColor: "bg-orange-100", valueClass: "text-orange-600", label: `${unpaidCount} unpaid invoices` },
            { title: "Net Balance", value: formatCurrency(netBalance), icon: Wallet, color: "text-purple-600", bgColor: "bg-purple-100", valueClass: netBalance >= 0 ? 'text-green-600' : 'text-red-600', label: "After expenses" },
          ].map((stat) => (
            <Card key={stat.title} className="border-none shadow-soft hover:shadow-medium transition-all duration-300 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
                <div className={cn("p-2 rounded-xl transition-transform group-hover:rotate-12", stat.bgColor)}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold tracking-tight", stat.valueClass)}>{stat.value}</div>
                {stat.label && <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>}
              </CardContent>
            </Card>
          ))}
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