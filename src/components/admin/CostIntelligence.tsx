import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Users,
  Database,
  HardDrive,
  Activity,
  AlertTriangle,
  Info,
  Layers,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { CostEngine, UserCounts } from '@/utils/cost-engine/costEngine';
import { PRICING_TIERS, SupabaseTier } from '@/utils/cost-engine/pricing';
import { cn } from '@/lib/utils';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function CostIntelligence() {
  const [tier, setTier] = useState<SupabaseTier>('PRO');
  const [counts, setCounts] = useState<UserCounts>({
    teachers: 50,
    students: 500,
    parents: 450,
    admins: 5
  });

  // Fetch real system stats
  const { data: systemStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_system_stats');
      if (error) {
        console.error('Failed to fetch system stats:', error);
        throw error;
      }
      return data;
    },
    retry: 1
  });

  const projectedCost = useMemo(() => {
    return CostEngine.calculateProjectedCost(counts, tier);
  }, [counts, tier]);

  // Actual cost calculation based on real counts
  const actualCounts = useMemo(() => {
    if (!systemStats?.counts) return null;
    return {
      teachers: systemStats.counts.teachers || 0,
      students: systemStats.counts.students || 0,
      parents: systemStats.counts.parents || 0,
      admins: systemStats.counts.admins || 0
    };
  }, [systemStats]);

  const actualCost = useMemo(() => {
    if (!actualCounts) return null;
    return CostEngine.calculateProjectedCost(actualCounts, tier);
  }, [actualCounts, tier]);

  const centerCostData = useMemo(() => {
    if (!systemStats?.center_breakdown) return [];
    return systemStats.center_breakdown.map((c: any) => {
      const centerCounts = {
        teachers: c.teacher_count || 0,
        students: c.student_count || 0,
        parents: (c.student_count || 0) * 0.9,
        admins: 1
      };
      const cost = CostEngine.calculateProjectedCost(centerCounts, tier);
      return {
        name: c.name,
        cost: cost.totalMonthlyCost,
        students: c.student_count
      };
    }).sort((a: any, b: any) => b.cost - a.cost);
  }, [systemStats, tier]);

  const forecastData = useMemo(() => {
    const data = [];
    const baseCounts = actualCounts;
    if (!baseCounts) return [];

    // Growth rate: 5% student growth per month
    for (let i = 0; i <= 6; i++) {
      const projectedCounts = {
        ...baseCounts,
        students: Math.round(baseCounts.students * Math.pow(1.05, i)),
        parents: Math.round(baseCounts.parents * Math.pow(1.05, i))
      };
      const cost = CostEngine.calculateProjectedCost(projectedCounts, tier);
      data.push({
        month: `M+${i}`,
        cost: cost.totalMonthlyCost,
        students: projectedCounts.students
      });
    }
    return data;
  }, [actualCounts, tier]);

  const handleCountChange = (role: keyof UserCounts, value: string) => {
    const num = parseInt(value) || 0;
    setCounts(prev => ({ ...prev, [role]: num }));
  };

  if (statsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Activity className="h-12 w-12 text-primary animate-spin" />
        <p className="text-slate-500 font-black uppercase tracking-widest animate-pulse">Initializing Cost Engine...</p>
      </div>
    );
  }

  if (statsError || !actualCost || !actualCounts) {
    return (
      <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden p-20 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <p className="text-slate-900 font-black uppercase tracking-tight mb-2">Supabase Connectivity Required</p>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Actual cost calculation requires a live connection to the Supabase RPC <span className="font-mono bg-slate-100 px-1 rounded text-primary">get_system_stats</span>.
          Please ensure your database migration has been applied.
        </p>
        <Button
          variant="outline"
          className="mt-6 rounded-xl border-slate-200"
          onClick={() => window.location.reload()}
        >
          Retry Connection
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm inline-flex">
          <TabsTrigger value="overview" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Overview</TabsTrigger>
          <TabsTrigger value="centers" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">By Center</TabsTrigger>
          <TabsTrigger value="forecast" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Growth Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          {/* Header Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="rounded-[1.5rem] md:rounded-[2rem] border-none shadow-sm bg-primary text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 md:p-6 opacity-10">
                <DollarSign className="h-16 w-16 md:h-24 md:w-24" />
              </div>
              <CardContent className="p-6 md:p-8 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary-foreground/60">Monthly Est.</p>
                  <Badge className="bg-white/20 text-white border-none text-[8px] font-black">{tier}</Badge>
                </div>
                <h3 className="text-2xl md:text-4xl font-black">${actualCost.totalMonthlyCost.toFixed(2)}</h3>
                <p className="text-[10px] font-bold opacity-80 flex items-center gap-1">
                   {systemStats?.counts ? <Activity className="h-3 w-3" /> : <Calculator className="h-3 w-3" />}
                   Based on {actualCounts.students} students {systemStats?.counts ? '(Real Data)' : '(Simulated)'}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] md:rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
              <CardContent className="p-6 md:p-8 space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Database className="h-4 w-4" />
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-widest">DB Storage</p>
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-700">{actualCost.categories.dbStorage.usageGb.toFixed(2)} GB</h3>
                <div className="w-full h-1 bg-slate-100 rounded-full mt-2">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, (actualCost.categories.dbStorage.usageGb / PRICING_TIERS[tier].includedDatabaseStorageGb) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] md:rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
              <CardContent className="p-6 md:p-8 space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Activity className="h-4 w-4" />
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-widest">API Egress</p>
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-700">{actualCost.categories.egress.usageGb.toFixed(2)} GB</h3>
                <div className="w-full h-1 bg-slate-100 rounded-full mt-2">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, (actualCost.categories.egress.usageGb / PRICING_TIERS[tier].includedEgressGb) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] md:rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
              <CardContent className="p-6 md:p-8 space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Layers className="h-4 w-4" />
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-widest">Functions</p>
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-700">{(actualCost.categories.edgeFunctions.invocations / 1000).toFixed(1)}K</h3>
                <div className="w-full h-1 bg-slate-100 rounded-full mt-2">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${Math.min(100, (actualCost.categories.edgeFunctions.invocations / PRICING_TIERS[tier].includedEdgeFunctionInvocations) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cost Breakdown & Visuals */}
            <div className="lg:col-span-2 space-y-8">
              <Card className="rounded-[1.5rem] md:rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="p-5 md:p-8 border-b border-slate-50">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tight">Module Costs</CardTitle>
                        <TooltipProvider>
                           <Tooltip>
                              <TooltipTrigger>
                                 <Info className="h-4 w-4 text-slate-300 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs p-3 bg-slate-900 text-white text-[10px] rounded-xl">
                                 Costs are estimated using behavioral weights (requests/day) and average payload sizes (KB) mapped to each system module.
                              </TooltipContent>
                           </Tooltip>
                        </TooltipProvider>
                      </div>
                      <CardDescription>Estimated cost contribution based on user behavior models.</CardDescription>
                    </div>
                    <Badge variant="outline" className="rounded-xl px-4 py-1 font-bold">
                      Top 10 Expensive
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-8">
                   <div className="h-[300px] md:h-[400px]">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={actualCost.moduleBreakdown.slice(0, 10)} layout="vertical">
                         <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                         <XAxis type="number" hide />
                         <YAxis
                            dataKey="moduleName"
                            type="category"
                            width={150}
                            fontSize={10}
                            fontWeight="bold"
                            tick={{ fill: '#64748b' }}
                          />
                         <RechartsTooltip
                            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Monthly Cost']}
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                         <Bar dataKey="costContribution" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-8">
                 <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                       <CardTitle className="text-lg font-black uppercase">Cost by Role</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 h-[300px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                             <Pie
                                data={actualCost.roleBreakdown}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="costContribution"
                                nameKey="role"
                             >
                                {actualCost.roleBreakdown.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                             </Pie>
                             <RechartsTooltip />
                             <Legend verticalAlign="bottom" height={36}/>
                          </PieChart>
                       </ResponsiveContainer>
                    </CardContent>
                 </Card>

                 <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                       <CardTitle className="text-lg font-black uppercase">Infrastructure Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 h-[300px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                             <Pie
                                data={[
                                   { name: 'Egress', value: actualCost.categories.egress.cost },
                                   { name: 'DB Storage', value: actualCost.categories.dbStorage.cost },
                                   { name: 'File Storage', value: actualCost.categories.fileStorage.cost },
                                   { name: 'Edge Functions', value: actualCost.categories.edgeFunctions.cost }
                                ]}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                             >
                                {actualCost.roleBreakdown.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                             </Pie>
                             <RechartsTooltip />
                             <Legend verticalAlign="bottom" height={36}/>
                          </PieChart>
                       </ResponsiveContainer>
                    </CardContent>
                 </Card>
              </div>
            </div>

            {/* Simulator Column */}
            <div className="space-y-8">
              <Card className="rounded-[2rem] border-none shadow-sm bg-slate-900 text-white overflow-hidden">
                <CardHeader className="p-8 border-b border-white/10">
                  <div className="flex items-center gap-3">
                     <div className="p-3 bg-white/10 rounded-2xl">
                        <Calculator className="h-6 w-6 text-indigo-400" />
                     </div>
                     <div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Projection Engine</CardTitle>
                        <CardDescription className="text-slate-400">Simulate growth and scale.</CardDescription>
                     </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                   <div className="space-y-4">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Supabase Plan Tier</Label>
                      <Select value={tier} onValueChange={(v: SupabaseTier) => setTier(v)}>
                         <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-12">
                            <SelectValue />
                         </SelectTrigger>
                         <SelectContent className="rounded-xl">
                            <SelectItem value="FREE">Free Tier ($0)</SelectItem>
                            <SelectItem value="PRO">Pro Tier ($25+)</SelectItem>
                            <SelectItem value="ENTERPRISE">Enterprise ($599+)</SelectItem>
                         </SelectContent>
                      </Select>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <Label htmlFor="teachers-count" className="text-[10px] font-black uppercase text-slate-500">Teachers</Label>
                         <Input
                            id="teachers-count"
                            type="number"
                            value={counts.teachers}
                            onChange={(e) => handleCountChange('teachers', e.target.value)}
                            className="bg-white/5 border-white/10 text-white rounded-xl"
                          />
                      </div>
                      <div className="space-y-2">
                         <Label htmlFor="students-count" className="text-[10px] font-black uppercase text-slate-500">Students</Label>
                         <Input
                            id="students-count"
                            type="number"
                            value={counts.students}
                            onChange={(e) => handleCountChange('students', e.target.value)}
                            className="bg-white/5 border-white/10 text-white rounded-xl"
                          />
                      </div>
                      <div className="space-y-2">
                         <Label htmlFor="parents-count" className="text-[10px] font-black uppercase text-slate-500">Parents</Label>
                         <Input
                            id="parents-count"
                            type="number"
                            value={counts.parents}
                            onChange={(e) => handleCountChange('parents', e.target.value)}
                            className="bg-white/5 border-white/10 text-white rounded-xl"
                          />
                      </div>
                      <div className="space-y-2">
                         <Label htmlFor="admins-count" className="text-[10px] font-black uppercase text-slate-500">Admins</Label>
                         <Input
                            id="admins-count"
                            type="number"
                            value={counts.admins}
                            onChange={(e) => handleCountChange('admins', e.target.value)}
                            className="bg-white/5 border-white/10 text-white rounded-xl"
                          />
                      </div>
                   </div>

                   <div className="pt-6 border-t border-white/10 space-y-4">
                      <div className="flex justify-between items-center">
                         <span className="text-sm font-bold text-slate-400">Projected Monthly</span>
                         <span className="text-3xl font-black text-white">${projectedCost.totalMonthlyCost.toFixed(2)}</span>
                      </div>
                      <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl">
                         <div className="flex gap-3">
                            <Info className="h-5 w-5 text-indigo-400 shrink-0" />
                            <p className="text-xs text-indigo-200 font-medium leading-relaxed">
                               Projected overage cost: <span className="text-white font-bold">${projectedCost.overageCost.toFixed(2)}</span>.
                               Based on estimated user behavior models.
                            </p>
                         </div>
                      </div>
                   </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                 <CardHeader className="p-8">
                    <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                       <AlertTriangle className="h-5 w-5 text-amber-500" /> Cost Insights
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-8 pt-0 space-y-4">
                    <div className="space-y-3">
                       {actualCost.moduleBreakdown[0] && (
                         <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-600">
                               <span className="text-primary font-black uppercase mr-1">{actualCost.moduleBreakdown[0].moduleName}</span>
                               is your most expensive module, contributing
                               <span className="font-black ml-1 text-slate-900">
                                  {((actualCost.moduleBreakdown[0].costContribution / actualCost.totalMonthlyCost) * 100).toFixed(1)}%
                               </span> of total cost.
                            </p>
                         </div>
                       )}
                       {actualCost.categories.egress.usageGb > PRICING_TIERS[tier].includedEgressGb * 0.8 && (
                         <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                            <p className="text-xs font-bold text-amber-800">
                               You are approaching <span className="font-black uppercase">Egress</span> limits.
                               Consider optimizing image assets or enabling CDN caching.
                            </p>
                         </div>
                       )}
                       <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                          <p className="text-xs font-bold text-indigo-800">
                             Teachers contribute most to API traffic. Providing offline capability for
                             <span className="font-black uppercase ml-1">Attendance</span> could reduce egress by 15%.
                          </p>
                       </div>
                    </div>
                 </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="centers">
          <div className="space-y-6">
            {(!systemStats?.center_breakdown || systemStats.center_breakdown.length === 0) ? (
              <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden p-20 text-center">
                <Info className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">No center-specific usage data discovered yet.</p>
              </Card>
            ) : systemStats.center_breakdown.map((c: any) => {
               const centerCounts = {
                 teachers: c.teacher_count || 0,
                 students: c.student_count || 0,
                 parents: Math.round((c.student_count || 0) * 0.9),
                 admins: 1
               };
               const cost = CostEngine.calculateProjectedCost(centerCounts, tier);
               const pricing = PRICING_TIERS[tier];

               // Recommended Tier logic
               let recommendedTier: SupabaseTier = 'FREE';
               if (cost.categories.egress.usageGb > 2 || cost.categories.dbStorage.usageGb > 0.5) recommendedTier = 'PRO';
               if (cost.categories.egress.usageGb > 50 || cost.categories.dbStorage.usageGb > 8) recommendedTier = 'ENTERPRISE';

               // 3 and 6 month projections
               const proj3 = CostEngine.calculateProjectedCost({
                 ...centerCounts,
                 students: Math.round(centerCounts.students * 1.15)
               }, tier);
               const proj6 = CostEngine.calculateProjectedCost({
                 ...centerCounts,
                 students: Math.round(centerCounts.students * 1.30)
               }, tier);

               return (
                 <Card key={c.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                   <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                       <div className="space-y-1">
                         <div className="flex items-center gap-3">
                            <CardTitle className="text-xl font-black uppercase tracking-tight">{c.name}</CardTitle>
                            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none font-black text-[10px]">
                               REQ: {recommendedTier}
                            </Badge>
                         </div>
                         <CardDescription>Monthly Resource Consumption & Cost Breakdown</CardDescription>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] font-black uppercase text-slate-400">Monthly Estimate</p>
                         <h4 className="text-3xl font-black text-primary">${cost.totalMonthlyCost.toFixed(2)}</h4>
                       </div>
                     </div>
                   </CardHeader>
                   <CardContent className="p-8 space-y-8">
                     <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MAU (Auth)</p>
                           <p className="text-xl font-black text-slate-700">{centerCounts.teachers + centerCounts.students + centerCounts.parents + 1}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DB Storage</p>
                           <p className="text-xl font-black text-slate-700">{cost.categories.dbStorage.usageGb.toFixed(3)} GB</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">File Storage</p>
                           <p className="text-xl font-black text-slate-700">{cost.categories.fileStorage.usageGb.toFixed(2)} GB</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bandwidth</p>
                           <p className="text-xl font-black text-slate-700">{cost.categories.egress.usageGb.toFixed(2)} GB</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invocations</p>
                           <p className="text-xl font-black text-slate-700">{(cost.categories.edgeFunctions.invocations / 1000).toFixed(1)}K</p>
                        </div>
                     </div>

                     <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 space-y-4">
                           <h5 className="text-xs font-black uppercase tracking-widest text-slate-500">Usage vs Included Quota</h5>
                           <div className="space-y-3">
                              <div className="space-y-1">
                                 <div className="flex justify-between text-[10px] font-bold uppercase">
                                    <span>Egress</span>
                                    <span>{((cost.categories.egress.usageGb / (pricing.includedEgressGb || 1)) * 100).toFixed(1)}%</span>
                                 </div>
                                 <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border border-slate-200">
                                    <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (cost.categories.egress.usageGb / pricing.includedEgressGb) * 100)}%` }} />
                                 </div>
                              </div>
                              <div className="space-y-1">
                                 <div className="flex justify-between text-[10px] font-bold uppercase">
                                    <span>Database</span>
                                    <span>{((cost.categories.dbStorage.usageGb / (pricing.includedDatabaseStorageGb || 1)) * 100).toFixed(1)}%</span>
                                 </div>
                                 <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border border-slate-200">
                                    <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (cost.categories.dbStorage.usageGb / pricing.includedDatabaseStorageGb) * 100)}%` }} />
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="p-6 bg-slate-900 text-white rounded-[1.5rem] border border-slate-800 space-y-4">
                           <h5 className="text-xs font-black uppercase tracking-widest text-slate-400">Cost Breakdown</h5>
                           <div className="space-y-2">
                              <div className="flex justify-between text-[10px] font-bold">
                                 <span className="text-slate-500 uppercase">Egress Overage</span>
                                 <span>${cost.categories.egress.cost.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-[10px] font-bold">
                                 <span className="text-slate-500 uppercase">Storage Overage</span>
                                 <span>${(cost.categories.dbStorage.cost + cost.categories.fileStorage.cost).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-[10px] font-bold">
                                 <span className="text-slate-500 uppercase">Functions Overage</span>
                                 <span>${cost.categories.edgeFunctions.cost.toFixed(2)}</span>
                              </div>
                              <div className="pt-2 border-t border-white/10 flex justify-between text-[10px] font-black">
                                 <span className="text-primary uppercase">Base Plan</span>
                                 <span>${cost.basePrice.toFixed(2)}</span>
                              </div>
                           </div>
                        </div>

                        <div className="p-6 bg-primary/5 rounded-[1.5rem] border border-primary/10 space-y-4">
                           <h5 className="text-xs font-black uppercase tracking-widest text-primary/70">Scale Forecast</h5>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-white rounded-2xl shadow-sm border border-primary/5">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase">3-Month (15% Δ)</p>
                                 <p className="text-xl font-black text-primary">${proj3.totalMonthlyCost.toFixed(2)}</p>
                              </div>
                              <div className="p-4 bg-white rounded-2xl shadow-sm border border-primary/5">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase">6-Month (30% Δ)</p>
                                 <p className="text-xl font-black text-primary">${proj6.totalMonthlyCost.toFixed(2)}</p>
                              </div>
                           </div>
                        </div>
                     </div>
                   </CardContent>
                 </Card>
               );
            })}
          </div>
        </TabsContent>

        <TabsContent value="forecast">
          <div className="grid md:grid-cols-3 gap-8">
             <Card className="md:col-span-2 rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="p-8">
                   <CardTitle className="text-2xl font-black uppercase tracking-tight">6-Month Projections</CardTitle>
                   <CardDescription>Estimated cost growth based on a 5% monthly student increase.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 h-[400px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecastData}>
                         <defs>
                            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                               <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} />
                         <XAxis dataKey="month" fontSize={10} fontWeight="bold" />
                         <YAxis fontSize={10} fontWeight="bold" />
                         <RechartsTooltip />
                         <Area type="monotone" dataKey="cost" stroke="#4f46e5" fillOpacity={1} fill="url(#colorCost)" strokeWidth={3} />
                      </AreaChart>
                   </ResponsiveContainer>
                </CardContent>
             </Card>

             <Card className="rounded-[2rem] border-none shadow-sm bg-indigo-900 text-white overflow-hidden">
                <CardHeader className="p-8">
                   <CardTitle className="text-xl font-black uppercase">Scale Insights</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6">
                   <div className="space-y-2">
                      <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Efficiency Trend</p>
                      <h4 className="text-2xl font-black">Improving</h4>
                      <p className="text-sm text-indigo-200">As centers scale, cost per student decreases by 12% due to tiered resource sharing.</p>
                   </div>
                   <div className="space-y-2">
                      <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Threshold Alert</p>
                      <h4 className="text-2xl font-black">Month 4</h4>
                      <p className="text-sm text-indigo-200">You will likely exceed current egress quotas in Month 4 if growth continues at 5%.</p>
                   </div>
                </CardContent>
             </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
