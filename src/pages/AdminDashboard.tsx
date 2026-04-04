import React from "react";
import { UserRole } from "@/types/roles";
import { Users, Building2, Activity, ShieldCheck, TrendingUp, BarChart3, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts";
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget";
import { KPICard } from "@/components/dashboard/KPICard";

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role !== UserRole.ADMIN) {
    navigate('/');
    return null;
  }

  const { data: stats } = useQuery({
    queryKey: ['admin-summary-stats'],
    queryFn: async () => {
      const { count: centersCount } = await supabase.from('centers').select('*', { count: 'exact', head: true });
      const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: errorLogsCount } = await supabase.from('error_logs').select('*', { count: 'exact', head: true });
      const { data: globalInvoices } = await supabase.from('invoices').select('total_amount, paid_amount');

      const totalRevenue = globalInvoices?.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0) || 0;

      return {
        centers: centersCount || 0,
        totalUsers: usersCount || 0,
        errors: errorLogsCount || 0,
        revenue: totalRevenue
      };
    }
  });

  const { data: centerTrends } = useQuery({
    queryKey: ['admin-center-trends'],
    queryFn: async () => {
      const { data: centers } = await supabase.from('centers').select('id, name');
      const trends = [];
      for (const center of centers || []) {
        const { count: students } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('center_id', center.id);
        const { data: invoices } = await supabase.from('invoices').select('paid_amount').eq('center_id', center.id);
        const revenue = invoices?.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0) || 0;
        trends.push({ name: center.name, students: students || 0, revenue });
      }
      return trends;
    }
  });

  const { data: globalAiInsights = [] } = useQuery({
    queryKey: ['admin-global-ai-insights'],
    queryFn: async () => {
      const { data } = await supabase
        .from('predictive_scores')
        .select('*, students(name)')
        .eq('risk_level', 'High')
        .limit(10);

      return (data || []).map(d => ({
        id: d.id,
        type: 'risk' as const,
        level: d.risk_level as any,
        title: `High Academic Risk: ${d.students?.name}`,
        description: `Risk score ${d.risk_score}/100 based on attendance and grades.`,
        studentName: d.students?.name,
        factors: d.factors as any
      }));
    }
  });

  const kpis = [
    { label: "Total Centers", value: stats?.centers, icon: Building2, color: "blue", onClick: () => navigate("/admin/centers") },
    { label: "System Users", value: stats?.totalUsers, icon: Users, color: "green", onClick: () => navigate("/admin/users?feature=System%20Users") },
    { label: "Global Revenue", value: `NPR ${(stats?.revenue || 0).toLocaleString()}`, icon: TrendingUp, color: "purple", onClick: () => navigate("/admin/revenue?feature=Revenue%20Analytics") },
    { label: "System Errors", value: stats?.errors, icon: Activity, color: "rose", onClick: () => navigate("/admin/errors") },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Global System Overview
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <KPICard
              title={kpi.label}
              value={kpi.value ?? "..."}
              icon={kpi.icon}
              color={kpi.color}
              onClick={kpi.onClick}
            />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-strong rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-50">
              <CardTitle className="text-lg font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Center Performance Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={centerTrends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" />
                    <Bar dataKey="students" name="Total Students" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revenue" name="Total Revenue (NPR )" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <AIInsightsWidget insights={globalAiInsights} title="Global Risk Monitor" />
        </div>
      </div>

      <Card className="border-none shadow-strong rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
        <CardContent className="p-12">
          <div className="max-w-2xl space-y-6">
            <h2 className="text-3xl font-black tracking-tight">System Status</h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              All core services are operational. The global infrastructure is monitoring
              active sessions across all tuition centers. Automated backups and security
              protocols are synchronized.
            </p>
            <div className="flex gap-4 pt-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/5">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Network Stable</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/5">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Database Synced</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
