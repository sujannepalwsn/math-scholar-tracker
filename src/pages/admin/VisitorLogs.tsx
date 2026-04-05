import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Activity,
  Clock,
  ChevronRight,
  ChevronDown,
  Filter,
  BarChart3,
  MousePointer2,
  AlertCircle,
  TrendingUp,
  PieChart as PieChartIcon,
  ArrowRight
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const VisitorLogs = () => {
  const [visitorTypeFilter, setVisitorTypeFilter] = useState<string>("all");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['visitor-sessions', visitorTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from('sessions')
        .select(`
          *,
          visitors!inner (
            visitor_type,
            user_id,
            location,
            users (
              username,
              role
            )
          )
        `)
        .order('session_start', { ascending: false });

      if (visitorTypeFilter !== 'all') {
        query = query.eq('visitors.visitor_type', visitorTypeFilter);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    }
  });

  const { data: sessionEvents } = useQuery({
    queryKey: ['session-events', expandedSession],
    enabled: !!expandedSession,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('session_id', expandedSession!)
        .order('timestamp', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: analytics } = useQuery({
    queryKey: ['visitor-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_visitor_analytics');
      if (error) throw error;
      return data;
    }
  });

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

  const funnelData = analytics?.funnel ? [
    { name: 'Landing', value: analytics.funnel.landing },
    { name: 'Trial', value: analytics.funnel.trial },
    { name: 'Signup', value: analytics.funnel.signup },
    { name: 'Active', value: analytics.funnel.active },
  ] : [];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Visitor Logs & Analytics</h1>
          <p className="text-slate-500 font-medium">Track real-time user sessions and behavioral insights.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl border-slate-200">
            <Filter className="h-4 w-4 mr-2" /> Filter Range
          </Button>
          <Button
            className="bg-primary text-white rounded-xl shadow-lg shadow-primary/20"
            onClick={() => {
              if (!sessions || sessions.length === 0) {
                toast.error("No data to export");
                return;
              }
              const headers = ["Visitor Type", "User", "Role", "Duration", "Entry Page", "Exit Page", "Start Time"];
              const rows = sessions.map(s => [
                s.visitors.visitor_type,
                s.visitors.users?.username || 'Anonymous',
                s.visitors.users?.role || '-',
                s.duration || 'Active',
                s.entry_page,
                s.exit_page || '-',
                format(new Date(s.session_start), 'yyyy-MM-dd HH:mm:ss')
              ]);
              const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement("a");
              const url = URL.createObjectURL(blob);
              link.setAttribute("href", url);
              link.setAttribute("download", `visitor_logs_${format(new Date(), 'yyyyMMdd')}.csv`);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              toast.success("Logs exported successfully");
            }}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="logs" className="space-y-8">
        <TabsList className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
          <TabsTrigger value="logs" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Logs</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-6">
          <Card className="border-none shadow-sm overflow-hidden rounded-[2rem]">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight uppercase">Session Feed</CardTitle>
                  <CardDescription className="font-medium">Browse individual user journeys.</CardDescription>
                </div>
                <Select value={visitorTypeFilter} onValueChange={setVisitorTypeFilter}>
                  <SelectTrigger className="w-[180px] rounded-xl">
                    <SelectValue placeholder="Visitor Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="registered">Registered</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Visitor Type</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500">User / ID</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Role</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Duration</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Entry Page</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Exit Page</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Start Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionsLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-20 font-bold text-slate-400">Loading sessions...</TableCell></TableRow>
                  ) : sessions?.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-20 font-bold text-slate-400">No sessions found.</TableCell></TableRow>
                  ) : (
                    sessions?.map((session) => (
                      <React.Fragment key={session.id}>
                        <TableRow
                          className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                          onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                        >
                          <TableCell>
                            {expandedSession === session.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "rounded-lg font-black text-[10px] uppercase",
                              session.visitors.visitor_type === 'registered' ? "border-indigo-200 text-indigo-600 bg-indigo-50" :
                              session.visitors.visitor_type === 'trial' ? "border-emerald-200 text-emerald-600 bg-emerald-50" :
                              "border-slate-200 text-slate-600 bg-slate-50"
                            )}>
                              {session.visitors.visitor_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-slate-700">
                            {session.visitors.users?.username || 'Anonymous'}
                          </TableCell>
                          <TableCell className="font-bold text-slate-500 uppercase text-[10px]">
                            {session.visitors.users?.role || '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {session.duration || 'Active'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {session.entry_page}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {session.exit_page || '-'}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-600">
                            {format(new Date(session.session_start), 'MMM d, HH:mm')}
                          </TableCell>
                        </TableRow>
                        {expandedSession === session.id && (
                          <TableRow className="bg-slate-50/30">
                            <TableCell colSpan={8} className="p-8">
                              <div className="space-y-6">
                                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                                     <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="text-[10px] font-black uppercase text-slate-400 mb-1">IP Address</div>
                                        <div className="font-bold text-slate-700">{session.visitors.ip_address || 'Unknown'}</div>
                                     </div>
                                     <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Location</div>
                                        <div className="font-bold text-slate-700">
                                           {session.visitors.location ?
                                              `${session.visitors.location.city}, ${session.visitors.location.country}` :
                                              'Unknown'}
                                        </div>
                                     </div>
                                     <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Fingerprint</div>
                                        <div className="font-bold text-slate-700 truncate">{session.visitors.fingerprint_id || 'N/A'}</div>
                                     </div>
                                  </div>

                                <div className="flex items-center justify-between">
                                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Event Timeline</h4>
                                  <Badge className="bg-white border-slate-100 text-slate-500">{sessionEvents?.length || 0} Events</Badge>
                                </div>
                                <div className="space-y-4">
                                  {sessionEvents?.map((event, i) => (
                                    <div key={event.id} className="flex gap-4 items-start group">
                                      <div className="w-24 text-[10px] font-bold text-slate-400 pt-1">
                                        {format(new Date(event.timestamp), 'HH:mm:ss')}
                                      </div>
                                      <div className="flex-1 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group-hover:border-primary/20 transition-colors">
                                        <div className="flex items-center gap-3 mb-1">
                                          <Badge className={cn(
                                            "text-[8px] font-black uppercase",
                                            event.event_type === 'page_view' ? "bg-blue-100 text-blue-600" :
                                            event.event_type === 'feature_action' ? "bg-primary/10 text-primary" :
                                            "bg-slate-100 text-slate-500"
                                          )}>
                                            {event.event_type}
                                          </Badge>
                                          <span className="font-black text-xs uppercase tracking-tight">{event.event_name}</span>
                                        </div>
                                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                                          <pre className="text-[10px] text-slate-400 font-mono mt-2 bg-slate-50 p-2 rounded-lg">
                                            {JSON.stringify(event.metadata, null, 2)}
                                          </pre>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard title="Total Visitors" value={analytics?.total_visitors.toString() || "0"} icon={Users} color="indigo" />
            <KPICard title="Active Users (DAU)" value={analytics?.dau.toString() || "0"} icon={Activity} color="emerald" />
            <KPICard title="Retention (MAU)" value={analytics?.mau.toString() || "0"} icon={TrendingUp} color="amber" />
            <KPICard title="Most Active Role" value={analytics?.active_role?.role || "-"} icon={Users} color="rose" />
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-primary" /> Visitor Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.type_dist}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analytics?.type_dist?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" /> Conversion Funnel
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex flex-col justify-center gap-4">
                 {funnelData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-4">
                       <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                          <span className="font-black text-xs uppercase tracking-widest text-slate-500">{item.name}</span>
                          <span className="font-black text-xl">{item.value}</span>
                       </div>
                       {i < funnelData.length - 1 && (
                          <ArrowRight className="h-6 w-6 text-slate-300 shrink-0" />
                       )}
                    </div>
                 ))}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" /> Feature Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.feature_usage}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={8} fontStyle="bold" hide />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm rounded-[2rem] bg-indigo-900 text-white p-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-12 opacity-10">
                <BarChart3 className="h-40 w-40" />
             </div>
             <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3">
                   <div className="p-3 bg-white/10 rounded-2xl">
                      <AlertCircle className="h-6 w-6 text-indigo-300" />
                   </div>
                   <h3 className="text-2xl font-black uppercase tracking-tighter">Behavioral Insights</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300">Top Drop-off Pages</h4>
                      <ul className="space-y-2">
                         {analytics?.top_drop_offs?.map((p: any) => (
                           <li key={p.name} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                              <span className="font-bold text-sm truncate max-w-[200px]">{p.name}</span>
                              <Badge className="bg-indigo-500 text-white">{p.value} Exits</Badge>
                           </li>
                         ))}
                      </ul>
                   </div>
                   <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300">Intelligence Highlights</h4>
                      <div className="space-y-3">
                         {analytics?.top_drop_offs?.[0] && (
                           <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                              <p className="text-sm font-bold"><span className="text-indigo-300">Drop-off Alert:</span> Users are frequently dropping off at <span className="text-white underline">{analytics.top_drop_offs[0].name}</span>.</p>
                           </div>
                         )}
                         {analytics?.feature_usage?.[0] && (
                           <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                              <p className="text-sm font-bold"><span className="text-indigo-300">Feature Trend:</span> <span className="text-white underline">{analytics.feature_usage[0].name}</span> is currently your most engaged feature.</p>
                           </div>
                         )}
                         <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <p className="text-sm font-bold"><span className="text-indigo-300">Peak Load:</span> System traffic peaks at <span className="text-white underline">{analytics?.peak_usage?.hour}:00</span>. Consider scheduling maintenance outside this window.</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VisitorLogs;
