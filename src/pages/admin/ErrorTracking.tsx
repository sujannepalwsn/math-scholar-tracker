import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logger } from "@/utils/logger";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bot,
  Bug,
  Calendar,
  Database,
  Eye,
  Filter,
  Layout,
  Search,
  ShieldAlert,
  User as UserIcon,
  XCircle,
  Terminal,
  Activity,
  ChevronLeft,
  ChevronRight,
  RefreshCcw
} from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-800 border-blue-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200 animate-pulse",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  runtime: <Bug className="w-4 h-4 text-blue-500" />,
  api: <Activity className="w-4 h-4 text-green-500" />,
  database: <Database className="w-4 h-4 text-purple-500" />,
  ui: <Layout className="w-4 h-4 text-orange-500" />,
};

export default function ErrorTracking() {
  const [selectedError, setSelectedError] = useState<any>(null);
  const [filters, setFilters] = useState({
    module: "all",
    severity: "all",
    role: "all",
    search: "",
    startDate: "",
    endDate: "",
  });
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, refetch, error: queryError } = useQuery({
    queryKey: ["error_logs", filters, page],
    queryFn: async () => {
      try {
        let query = supabase
          .from("error_logs")
          .select("*", { count: "exact" })
          .order("timestamp", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (filters.module !== "all") query = query.eq("module", filters.module);
        if (filters.severity !== "all") query = query.eq("severity", filters.severity);
        if (filters.role !== "all") query = query.eq("user_context->>role", filters.role);
        if (filters.startDate) {
          query = query.gte("timestamp", new Date(filters.startDate).toISOString());
        }
        if (filters.endDate) {
          // Set to end of day
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          query = query.lte("timestamp", end.toISOString());
        }
        if (filters.search) {
          query = query.or(`message.ilike.%${filters.search}%,module.ilike.%${filters.search}%,component.ilike.%${filters.search}%`);
        }

        const { data, count, error } = await query;
        if (error) {
          console.error("Supabase query error:", error);
          throw error;
        }
        return { data, count };
      } catch (err) {
        console.error("Error fetching error logs:", err);
        throw err;
      }
    },
  });

  // Enable real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('error-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'error_logs'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const uniqueModules = ["Lessons", "Attendance", "Finance", "Auth", "Inventory", "Reports", "Testing", "Global"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-primary" />
            Error Tracking & Observability
          </h1>
          <p className="text-muted-foreground mt-1">
            Production-ready logs for autonomous AI debugging.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {queryError && (
            <Badge variant="destructive" className="mr-4">
              Connection Error: {String(queryError)}
            </Badge>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              const loadingToast = toast.loading("Logging test error...");
              try {
                // Reset filters to see the new error
                setFilters({
                  module: "Testing",
                  severity: "all",
                  role: "all",
                  search: "",
                  startDate: "",
                  endDate: "",
                });

                await logger.error("Manual Test Error Triggered", new Error("This is a simulated system failure for AI Debugging validation."), {
                  module: "Testing",
                  component: "ErrorDashboard",
                  action: "manual_test_click",
                  severity: "high",
                  payload: { test: true, timestamp: Date.now() }
                });

                toast.dismiss(loadingToast);
                toast.success("Manual test error logged!");

                // Force an immediate refetch
                setTimeout(async () => {
                  await refetch();
                }, 500);
              } catch (err) {
                toast.dismiss(loadingToast);
                toast.error("Failed to log error");
                console.error("Manual trigger failed:", err);
              }
            }}
            className="h-9"
          >
            <ShieldAlert className="mr-2 h-4 w-4" />
            Trigger Test Error
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilters({
                module: "all",
                severity: "all",
                role: "all",
                search: "",
                startDate: "",
                endDate: "",
              });
              refetch();
            }}
            className="h-9"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reset & Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <Filter className="w-4 h-4" />
            Active Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages, modules..."
                className="pl-9 h-9"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <Select value={filters.module} onValueChange={(v) => setFilters({ ...filters, module: v })}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {uniqueModules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.severity} onValueChange={(v) => setFilters({ ...filters, severity: v })}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.role} onValueChange={(v) => setFilters({ ...filters, role: v })}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="User Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="center">Center</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 items-center md:col-span-4 lg:col-span-2">
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground uppercase font-bold whitespace-nowrap">From:</span>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground uppercase font-bold whitespace-nowrap">To:</span>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[180px] font-bold uppercase text-[10px] text-muted-foreground">Timestamp</TableHead>
                <TableHead className="w-[120px] font-bold uppercase text-[10px] text-muted-foreground">User Context</TableHead>
                <TableHead className="w-[100px] font-bold uppercase text-[10px] text-muted-foreground">Module</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-muted-foreground">Error Message</TableHead>
                <TableHead className="w-[80px] font-bold uppercase text-[10px] text-muted-foreground text-center">Status</TableHead>
                <TableHead className="w-[100px] font-bold uppercase text-[10px] text-muted-foreground">Severity</TableHead>
                <TableHead className="w-[80px] font-bold uppercase text-[10px] text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7} className="h-16 text-center text-muted-foreground animate-pulse">
                      Loading logs...
                    </TableCell>
                  </TableRow>
                ))
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                    No errors found. System is healthy.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((error) => (
                  <TableRow key={error.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedError(error)}>
                    <TableCell className="font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 opacity-50" />
                        {format(new Date(error.timestamp), "MMM d, HH:mm:ss")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 text-xs font-semibold">
                          <UserIcon className="w-3 h-3" />
                          {error.user_context?.name || "Anonymous"}
                        </div>
                        <Badge variant="outline" className="w-fit text-[9px] h-4 py-0 uppercase">
                          {error.user_context?.role || "Guest"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        {TYPE_ICONS[error.error_type] || <Bug className="w-4 h-4" />}
                        {error.module}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[400px]">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold truncate">{error.message}</span>
                        <span className="text-[10px] text-muted-foreground truncate opacity-70">
                          {error.component} • {error.action}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-mono text-xs font-bold ${error.status_code >= 400 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {error.status_code || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] h-5 px-1.5 py-0 border ${SEVERITY_COLORS[error.severity] || "bg-gray-100"}`}>
                        {error.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t">
          <div className="text-[11px] text-muted-foreground">
            Showing <span className="font-bold text-foreground">{data?.data?.length || 0}</span> of <span className="font-bold text-foreground">{data?.count || 0}</span> total logs
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page === 0}
              onClick={(e) => { e.stopPropagation(); setPage(p => p - 1); }}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!data?.count || (page + 1) * pageSize >= data.count}
              onClick={(e) => { e.stopPropagation(); setPage(p => p + 1); }}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b bg-muted/30">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-xl flex items-center gap-2">
                  {TYPE_ICONS[selectedError?.error_type]}
                  Error Details
                </DialogTitle>
                <DialogDescription className="text-xs font-mono break-all pr-8">
                  ID: {selectedError?.id}
                </DialogDescription>
              </div>
              <Badge className={`uppercase text-[10px] ${SEVERITY_COLORS[selectedError?.severity]}`}>
                {selectedError?.severity}
              </Badge>
            </div>
            <div className="mt-4 flex items-center gap-2 p-2 bg-primary/5 border border-primary/10 rounded-md">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-medium text-primary">
                AI Debugger Status: <span className="font-bold underline cursor-help" title="This error was automatically broadcasted to your AI Studio webhook via Supabase pg_net trigger.">Sent to Webhook</span>
              </span>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-8">
              {/* Primary Error Message */}
              <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                <h3 className="text-sm font-bold text-destructive flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4" />
                  Exception Message
                </h3>
                <p className="text-sm font-semibold">{selectedError?.message}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User Context */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      User Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Username:</span>
                      <span className="font-semibold">{selectedError?.user_context?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Role:</span>
                      <span className="font-semibold">{selectedError?.user_context?.role}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Center ID:</span>
                      <span className="font-mono text-xs">{selectedError?.user_context?.centerId}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Technical Context */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      Technical Meta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Module:</span>
                      <span className="font-semibold">{selectedError?.module}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Component:</span>
                      <span className="font-semibold">{selectedError?.component}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Action:</span>
                      <span className="font-semibold">{selectedError?.action}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stack Trace */}
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                  <Terminal className="w-4 h-4 text-muted-foreground" />
                  Stack Trace
                </h3>
                <pre className="p-4 bg-muted text-[10px] font-mono rounded-lg overflow-x-auto border whitespace-pre-wrap leading-relaxed max-h-[300px]">
                  {selectedError?.stack || "No stack trace available."}
                </pre>
              </div>

              {/* Request Data & Schema Context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-muted-foreground">
                    <Activity className="w-4 h-4" />
                    Request Context
                  </h3>
                  <pre className="p-3 bg-muted/50 text-[10px] font-mono rounded-lg border">
                    {JSON.stringify(selectedError?.request_context, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-muted-foreground">
                    <Database className="w-4 h-4" />
                    Schema Context (AI)
                  </h3>
                  <div className="p-3 bg-muted/50 text-[10px] font-mono rounded-lg border italic text-muted-foreground">
                    {selectedError?.schema_context || "No schema context provided for this error."}
                  </div>
                </div>
              </div>

              {/* Device Info */}
              <div className="pt-4 border-t">
                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3">Device Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(selectedError?.device_info || {}).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-[10px] text-muted-foreground uppercase">{key.replace(/_/g, ' ')}</div>
                      <div className="text-xs font-medium truncate" title={String(value)}>{String(value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 bg-muted/30 border-t flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setSelectedError(null)}>
              Close Details
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
