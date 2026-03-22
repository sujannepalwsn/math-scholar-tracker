import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts"
import { cn } from "@/lib/utils"
import { Tooltip } from "@/components/ui/tooltip";

const FinanceReports = () => {
  const { user } = useAuth();

  // Fetch invoices summary
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-summary-report', user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('total_amount, status, invoice_date')
        .eq('center_id', user?.center_id!);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  // Fetch payments summary
  const { data: payments = [] } = useQuery({
    queryKey: ['payments-summary-report', user?.center_id],
    queryFn: async () => {
      // Get all invoice IDs first
      const { data: centerInvoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('center_id', user?.center_id!);

      const invoiceIds = centerInvoices?.map(inv => inv.id) || [];
      if (invoiceIds.length === 0) return [];

      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .in('invoice_id', invoiceIds);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  // Fetch expense breakdown
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['expense-breakdown-report', user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('category, amount, expense_date')
        .eq('center_id', user?.center_id!);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.center_id
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#71717a'];

  const expenseGrouped = expenses.reduce((acc: any, curr) => {
    const category = curr.category || 'Other';
    if (!acc[category]) acc[category] = 0;
    acc[category] += Number(curr.amount);
    return acc;
  }, {});

  const pieData = Object.entries(expenseGrouped).map(([name, value]) => ({
    name: name.toUpperCase(),
    value
  }));

  // Trend Data Processing
  const trendData = (() => {
    const monthlyData: Record<string, { month: string, revenue: number, expenses: number }> = {};

    payments.forEach(p => {
      const month = new Date(p.payment_date).toLocaleString('default', { month: 'short' });
      if (!monthlyData[month]) monthlyData[month] = { month, revenue: 0, expenses: 0 };
      monthlyData[month].revenue += Number(p.amount);
    });

    expenses.forEach(e => {
      const month = new Date(e.expense_date).toLocaleString('default', { month: 'short' });
      if (!monthlyData[month]) monthlyData[month] = { month, revenue: 0, expenses: 0 };
      monthlyData[month].expenses += Number(e.amount);
    });

    return Object.values(monthlyData);
  })();

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue vs Expenses Trend */}
        <Card className="border-none shadow-strong rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-white/20 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black uppercase tracking-tight">Fiscal Performance Trend</CardTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Monthly revenue vs expenditure</p>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#64748b'}} tickFormatter={(value) => `रु${value/1000}k`} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Category Breakdown */}
        <Card className="border-none shadow-strong rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-white/20 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black uppercase tracking-tight">Allocation Breakdown</CardTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Expenditure by operational category</p>
          </CardHeader>
          <CardContent className="pt-6">
            {expensesLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pieData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground italic text-sm">
                No expense data available
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="h-[250px] w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3 w-full">
                  {pieData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-xs font-bold text-slate-600 group-hover:text-primary transition-colors">{item.name}</span>
                      </div>
                      <span className="text-xs font-black">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Revenue Analysis */}
      <Card className="border-none shadow-strong rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-white/20 p-8">
        <CardHeader className="px-0 pb-6">
          <CardTitle className="text-xl font-black uppercase tracking-tight">Revenue Stream Analysis</CardTitle>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Invoiced vs Realized capital per month</p>
        </CardHeader>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#64748b'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#64748b'}} />
              <RechartsTooltip
                cursor={{fill: '#f1f5f9'}}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Bar dataKey="revenue" name="Collected Revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default FinanceReports;
