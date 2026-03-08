import React, { useState } from "react";
import { AlertCircle, ArrowLeft, FileText, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import FeeManagement from '@/components/finance/FeeManagement';
import InvoiceManagement from '@/components/finance/InvoiceManagement';
import PaymentTracking from '@/components/finance/PaymentTracking';
import ExpenseManagement from '@/components/finance/ExpenseManagement';
import FinanceReports from '@/components/finance/FinanceReports';
import { formatCurrency } from "@/integrations/supabase/finance-types"
import { cn } from "@/lib/utils"

const AdminFinance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch invoices summary
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-summary', user?.center_id, user?.role, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from('invoices')
        .select('total_amount, status, student_id')
        .eq('center_id', user.center_id);

      if (user?.role === 'teacher' && user?.teacher_id) {
        // Teachers only see invoices for their grade
        const { data: teacher } = await supabase.from('teachers').select('grade').eq('id', user.teacher_id).single();
        if (teacher?.grade) {
          const { data: students } = await supabase.from('students').select('id').eq('grade', teacher.grade);
          const studentIds = students?.map(s => s.id) || [];
          query = query.in('student_id', studentIds);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  // Fetch payments - CORRECTED to filter by invoices belonging to the center
  const { data: payments = [] } = useQuery({
    queryKey: ['payments-total', user?.center_id, user?.role, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      
      // First, get all invoice IDs for the current center
      let invQuery = supabase
        .from('invoices')
        .select('id, student_id')
        .eq('center_id', user.center_id);

      if (user?.role === 'teacher' && user?.teacher_id) {
        const { data: teacher } = await supabase.from('teachers').select('grade').eq('id', user.teacher_id).single();
        if (teacher?.grade) {
          const { data: students } = await supabase.from('students').select('id').eq('grade', teacher.grade);
          const studentIds = students?.map(s => s.id) || [];
          invQuery = invQuery.in('student_id', studentIds);
        }
      }

      const { data: centerInvoices, error: invError } = await invQuery;

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
    queryKey: ['expenses-total', user?.center_id, user?.role, user?.id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from('expenses')
        .select('amount')
        .eq('center_id', user.center_id);

      if (user?.role === 'teacher') {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query;
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
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
              Treasury Matrix
            </h1>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <p className="text-muted-foreground text-sm font-medium">Fiscal management and revenue optimization.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(user?.role === 'admin' ? '/admin-dashboard' : '/')} className="rounded-xl h-11 border-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Control Center
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Revenue Flow", value: formatCurrency(totalInvoiced), icon: FileText, color: "text-blue-600", bgColor: "bg-blue-500/10", desc: "Total Invoiced Assets" },
            { title: "Capital Collected", value: formatCurrency(totalCollected), icon: TrendingUp, color: "text-green-600", bgColor: "bg-green-500/10", valueClass: "text-green-600", desc: "Realized Liquidity" },
            { title: "Risk Exposure", value: formatCurrency(outstanding), icon: AlertCircle, color: "text-orange-600", bgColor: "bg-orange-500/10", valueClass: "text-orange-600", desc: `${unpaidCount} Pending Receivables` },
            { title: "Net Liquidity", value: formatCurrency(netBalance), icon: Wallet, color: "text-purple-600", bgColor: "bg-purple-500/10", valueClass: netBalance >= 0 ? 'text-green-600' : 'text-red-600', desc: "Post-Expenditure Balance" },
          ].map((stat) => (
            <Card key={stat.title} className="border-none shadow-strong hover:-translate-y-1 transition-all duration-500 group rounded-[2rem] bg-card/40 backdrop-blur-md border border-border/20">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                   <div className={cn("p-3 rounded-2xl transition-transform group-hover:rotate-6", stat.bgColor)}>
                    <stat.icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{stat.title}</p>
                    <h3 className={cn("text-2xl font-black tracking-tighter mt-1", stat.valueClass)}>{stat.value}</h3>
                  </div>
                </div>
                <div className="pt-4 border-t border-muted/10">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {overdueCount > 0 && (
          <div className="flex items-center gap-4 p-6 bg-red-50/50 backdrop-blur-sm border border-red-100 rounded-3xl text-red-700 shadow-soft animate-in slide-in-from-top-2">
            <div className="p-3 rounded-2xl bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-tight">{overdueCount} Critical Receivables Detected</p>
              <p className="text-xs font-bold opacity-70 uppercase tracking-widest mt-0.5">Immediate liquidation protocol recommended for overdue invoices.</p>
            </div>
          </div>
        )}

        <Tabs defaultValue="invoices" className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 h-14 bg-card/40 backdrop-blur-md rounded-[2rem] p-1.5 border border-border/40 shadow-soft">
            <TabsTrigger value="invoices" className="rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[10px] tracking-widest">Invoices</TabsTrigger>
            <TabsTrigger value="fees" className="rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[10px] tracking-widest">Fees</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[10px] tracking-widest">Payments</TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[10px] tracking-widest">Expenses</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[10px] tracking-widest">Analytics</TabsTrigger>
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