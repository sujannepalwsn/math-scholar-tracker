import React, { useState, useMemo, useEffect } from "react";
import { UserRole } from "@/types/roles";
import { AlertCircle, ArrowLeft, FileText, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Target, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import FeeManagement from '@/components/finance/FeeManagement';
import InvoiceManagement from '@/components/finance/InvoiceManagement';
import PaymentTracking from '@/components/finance/PaymentTracking';
import ExpenseManagement from '@/components/finance/ExpenseManagement';
import FinanceReports from '@/components/finance/FinanceReports';
import FinanceSettings from '@/components/finance/FinanceSettings';
import { cn, formatCurrency } from "@/lib/utils"
import { hasPermission, hasActionPermission } from "@/utils/permissions";
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid, Bar, BarChart, Legend, Cell, Pie, PieChart } from "recharts";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";

const AdminFinance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "invoices";

  const isRestricted = user?.role === UserRole.TEACHER && user?.teacher_scope_mode !== 'full';
  const canEdit = hasActionPermission(user, 'finance', 'edit');

  // Fetch invoices summary
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-summary', user?.center_id, user?.role, user?.teacher_id, isRestricted],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from('invoices')
        .select('total_amount, status, student_id')
        .eq('center_id', user.center_id);

      if (user?.role === UserRole.TEACHER && user?.teacher_id && isRestricted) {
        // Teachers only see invoices for their assigned grades
        const { data: assignments } = await supabase.from('class_teacher_assignments').select('grade').eq('teacher_id', user.teacher_id);
        const { data: schedules } = await supabase.from('period_schedules').select('grade').eq('teacher_id', user.teacher_id);
        const grades = Array.from(new Set([...(assignments?.map(a => a.grade) || []), ...(schedules?.map(s => s.grade) || [])]));

        if (grades.length > 0) {
          const { data: gradeStudents } = await supabase.from('students').select('id').in('grade', grades);
          const studentIds = gradeStudents?.map(s => s.id) || [];
          query = query.in('student_id', studentIds);
        } else {
          return [];
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
    queryKey: ['payments-total', user?.center_id, user?.role, user?.teacher_id, isRestricted],
    queryFn: async () => {
      if (!user?.center_id) return [];
      
      // First, get all invoice IDs for the current center
      let invQuery = supabase
        .from('invoices')
        .select('id, student_id')
        .eq('center_id', user.center_id);

      if (user?.role === UserRole.TEACHER && user?.teacher_id && isRestricted) {
        const { data: assignments } = await supabase.from('class_teacher_assignments').select('grade').eq('teacher_id', user.teacher_id);
        const { data: schedules } = await supabase.from('period_schedules').select('grade').eq('teacher_id', user.teacher_id);
        const grades = Array.from(new Set([...(assignments?.map(a => a.grade) || []), ...(schedules?.map(s => s.grade) || [])]));

        if (grades.length > 0) {
          const { data: gradeStudents } = await supabase.from('students').select('id').in('grade', grades);
          const studentIds = gradeStudents?.map(s => s.id) || [];
          invQuery = invQuery.in('student_id', studentIds);
        } else {
          return [];
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
    queryKey: ['expenses-total', user?.center_id, user?.role, user?.id, isRestricted],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from('expenses')
        .select('amount')
        .eq('center_id', user.center_id);

      if (user?.role === UserRole.TEACHER && isRestricted) {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const isDemo = user?.username === 'demo@eduflow.com' || user?.username === 'demo';

  const totalInvoiced = isDemo ? 125400 : invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalCollected = isDemo ? 108200 : payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = isDemo ? 42500 : expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const outstanding = totalInvoiced - totalCollected;
  const netBalance = totalCollected - totalExpenses;

  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const unpaidCount = invoices.filter(i => ['pending', 'overdue'].includes(i.status)).length;

  // Collection Rate
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  // Budget adherence (mocked for visual improvement since we don't have a budget table yet)
  const budgetAdherence = 85;

  // Trend data for sparklines (Mocked for current view)
  const sparklineData = [
    { value: 400 }, { value: 300 }, { value: 600 }, { value: 800 }, { value: 500 }, { value: 900 }, { value: 700 }
  ];

  const collectionHistory = [
    { name: 'Jan', revenue: 45000, expenses: 32000 },
    { name: 'Feb', revenue: 52000, expenses: 35000 },
    { name: 'Mar', revenue: 48000, expenses: 31000 },
    { name: 'Apr', revenue: 61000, expenses: 38000 },
    { name: 'May', revenue: 55000, expenses: 40000 },
    { name: 'Jun', revenue: 67000, expenses: 42000 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
                <Wallet className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                  Treasury Hub
                </h1>
                <div className="flex items-center gap-2 mt-1">
                   <div className="h-2 w-2 rounded-full bg-primary" />
                   <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Fiscal Management Matrix</p>
                </div>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(user?.role === UserRole.ADMIN ? '/admin-dashboard' : '/')} className="rounded-xl h-11 border-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Control Center
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Revenue Flow", value: totalInvoiced, icon: FileText, color: "blue", desc: "Total Invoiced Assets", delta: 12, tab: "invoices" },
            { title: "Capital Collected", value: totalCollected, icon: TrendingUp, color: "green", desc: "Realized Liquidity", delta: 8, tab: "payments" },
            { title: "Risk Exposure", value: outstanding, icon: AlertCircle, color: "orange", desc: `${unpaidCount} Pending Receivables`, delta: -5, tab: "invoices" },
            { title: "Net Liquidity", value: netBalance, icon: Wallet, color: "purple", desc: "Post-Expenditure Balance", delta: 15, tab: "reports" },
          ].map((stat) => (
            <KPICard
              key={stat.title}
              title={stat.title}
              value={formatCurrency(stat.value)}
              icon={stat.icon}
              color={stat.color}
              description={stat.desc}
              delta={stat.delta}
              trendData={sparklineData}
              onClick={() => setSearchParams({ tab: stat.tab })}
            />
          ))}
        </div>

        {/* Collection Velocity & Monthly Revenue Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <Card className="lg:col-span-2 border-none shadow-soft rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20 p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Monthly Revenue Analytics
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Trailing 6-month capital inflow & outflow</p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={collectionHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                    <RechartsTooltip
                       contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff' }}
                       itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </Card>

           <Card className="border-none shadow-soft rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20 p-8 flex flex-col justify-between">
              <div className="space-y-1 mb-8">
                <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
                  <Target className="h-5 w-5 text-emerald-500" />
                  Collection Velocity
                </h3>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Realized Liquidity index</p>
              </div>

              <div className="relative h-48 flex items-center justify-center">
                 {/* Gauge Chart Mockup with CSS/Tailwind */}
                 <div className="w-48 h-24 overflow-hidden relative">
                    <div className="w-48 h-48 rounded-full border-[16px] border-muted/10 relative">
                       <div
                         className="absolute inset-[-16px] rounded-full border-[16px] border-emerald-500 border-b-transparent border-l-transparent transition-all duration-1000"
                         style={{ transform: `rotate(${(collectionRate / 100 * 180) - 45}deg)` }}
                       />
                    </div>
                 </div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-4 text-center">
                    <p className="text-4xl font-black tracking-tighter text-emerald-500">{collectionRate}%</p>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground">Optimal</p>
                 </div>
              </div>

              <div className="space-y-4 pt-8 border-t border-white/5">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-muted-foreground">Target Velocity</span>
                    <span>90%</span>
                 </div>
                 <Progress value={collectionRate} className="h-1.5 bg-muted/10" />
              </div>
           </Card>
        </div>

        {/* Financial Health Snapshot (Original, kept for completeness) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 hidden">
          <Card className="lg:col-span-2 border-none shadow-soft rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Efficiency Indicators
                </h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Institutional fiscal health benchmarks</p>
              </div>
            </div>

            <div className="space-y-10">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight">Collection Velocity</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Realized revenue vs potential</p>
                  </div>
                  <p className="text-2xl font-black text-green-600">{collectionRate}%</p>
                </div>
                <Progress value={collectionRate} className="h-3 bg-muted/20" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight">Budget Adherence</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Expenditure optimization index</p>
                  </div>
                  <p className="text-2xl font-black text-blue-600">{budgetAdherence}%</p>
                </div>
                <Progress value={budgetAdherence} className="h-3 bg-muted/20" />
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-soft rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="p-3 bg-white/10 rounded-2xl w-fit">
                <Wallet className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">Fiscal Strength</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                Your institution's net liquidity is currently <span className="text-green-400 font-black">{netBalance >= 0 ? 'Optimal' : 'Needs Review'}</span> based on recent capital cycles.
              </p>
            </div>

            <div className="pt-8 border-t border-white/10 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Asset Velocity</span>
                <span className="flex items-center gap-1 text-green-400 font-black text-xs">
                  <ArrowUpRight className="h-3 w-3" /> HIGH
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Risk Profile</span>
                <span className="flex items-center gap-1 text-orange-400 font-black text-xs">
                   MODERATE
                </span>
              </div>
            </div>
          </Card>
        </div>

        {overdueCount > 0 && (
          <div className="flex items-center gap-4 p-6 bg-red-50/50 backdrop-blur-sm border border-red-100 rounded-3xl text-red-700 shadow-soft animate-in slide-in-from-top-2 mb-12">
            <div className="p-3 rounded-2xl bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-tight">{overdueCount} Critical Receivables Detected</p>
              <p className="text-xs font-bold opacity-70 uppercase tracking-widest mt-0.5">Immediate liquidation protocol recommended for overdue invoices.</p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val })} className="space-y-8">
          <TabsList className="flex flex-nowrap w-full overflow-x-auto h-14 bg-card/40 backdrop-blur-md rounded-[2rem] p-1.5 border border-border/40 shadow-soft custom-scrollbar">
            <TabsTrigger value="invoices" className="rounded-[1.5rem] flex-1 min-w-[100px] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[10px] tracking-widest">Invoices</TabsTrigger>
            <TabsTrigger value="fees" className="rounded-[1.5rem] flex-1 min-w-[100px] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[10px] tracking-widest">Fees</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-[1.5rem] flex-1 min-w-[100px] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[10px] tracking-widest">Payments</TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-[1.5rem] flex-1 min-w-[100px] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[10px] tracking-widest">Expenses</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-[1.5rem] flex-1 min-w-[100px] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[10px] tracking-widest">Analytics</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-[1.5rem] flex-1 min-w-[100px] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium font-black uppercase text-[10px] tracking-widest">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices"><InvoiceManagement canEdit={canEdit} /></TabsContent>
          <TabsContent value="fees"><FeeManagement canEdit={canEdit} /></TabsContent>
          <TabsContent value="payments"><PaymentTracking canEdit={canEdit} /></TabsContent>
          <TabsContent value="expenses"><ExpenseManagement canEdit={canEdit} /></TabsContent>
          <TabsContent value="reports"><FinanceReports /></TabsContent>
          <TabsContent value="settings"><FinanceSettings centerId={user?.center_id || ""} canEdit={canEdit} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminFinance;