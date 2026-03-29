import React, { useState } from "react";
import { Users, FileText, DollarSign, Award, Briefcase, FileCheck, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StaffHRModule from "@/components/center/StaffHRModule";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ServerPagination } from "@/components/ui/server-pagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { usePagination } from "@/hooks/use-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hasPermission, hasActionPermission } from "@/utils/permissions";

export default function HRManagement() {
  const { user } = useAuth();
  const centerId = user?.center_id || "";
  const canEdit = hasActionPermission(user, 'hr_management', 'edit');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { page, setPage, pageSize, setPageSize } = usePagination();

  const isRestricted = user?.role === 'teacher' && user?.teacher_scope_mode !== 'full';

  const { data: teachersData, isLoading } = useQuery({
    queryKey: ["teachers-hr", centerId, isRestricted, user?.teacher_id, page, pageSize, searchQuery],
    queryFn: async () => {
      if (!centerId) return { data: [], count: 0 };
      let query = supabase
        .from("teachers")
        .select("*", { count: "exact" })
        .eq("center_id", centerId);

      if (isRestricted) {
        query = query.eq('id', user?.teacher_id);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order("name")
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!centerId,
    placeholderData: (previousData) => previousData
  });

  const teachers = teachersData?.data || [];
  const totalRows = teachersData?.count || 0;
  const totalPages = Math.ceil(totalRows / pageSize);

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
  const filteredTeachers = teachers;

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <Users className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Talent Hub
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Faculty Lifecycle & Payroll</p>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full md:w-72">
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Users className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search faculty..."
              className="w-full h-11 pl-10 pr-4 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all shadow-soft"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-4 rounded-[2.5rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden h-fit border border-white/20">
          <CardHeader className="bg-primary/5 border-b border-border/10 px-8 py-6">
            <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-tight">
              <Users className="h-5 w-5 text-primary" /> Faculty Roster
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/10 max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="p-12 text-center flex flex-col items-center gap-3">
                   <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing Roster...</p>
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="p-12 text-center space-y-4">
                   <Users className="h-12 w-12 text-slate-200 mx-auto opacity-20" />
                   <p className="text-sm font-medium text-slate-400 italic px-6">No faculty members found matching your criteria.</p>
                </div>
              ) : (
                <>
                {filteredTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className={cn(
                      "p-5 hover:bg-primary/5 cursor-pointer transition-all border-l-4 group",
                      selectedTeacherId === teacher.id ? "border-primary bg-primary/10" : "border-transparent"
                    )}
                    onClick={() => setSelectedTeacherId(teacher.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-slate-700 leading-none">{teacher.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{teacher.subject || "Instructor"}</p>
                      </div>
                      <Badge variant={teacher.is_active ? "success" : "secondary"} className="text-[8px] px-1.5 py-0">
                        {teacher.is_active ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </div>
                  </div>
                ))}
                <div className="p-4 border-t">
                  <ServerPagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalRows={totalRows}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-8">
          {selectedTeacherId ? (
            <div className="space-y-6">
              <Card className="rounded-[2.5rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden border border-white/20">
                <CardHeader className="bg-primary/5 border-b border-border/10 px-8 py-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Briefcase className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">{selectedTeacher?.name}</CardTitle>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{selectedTeacher?.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <Badge className="bg-blue-100 text-blue-700 border-none font-black text-[10px] tracking-tight">ID: {selectedTeacherId.slice(0, 8)}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <StaffHRModule teacherId={selectedTeacherId} teacherName={selectedTeacher?.name || ""} canEdit={canEdit} />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="rounded-[2.5rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden h-[500px] flex items-center justify-center border border-white/20">
              <div className="text-center space-y-6 px-12">
                <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center animate-bounce">
                  <ShieldCheck className="h-10 w-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tight text-foreground">Faculty Selection Required</h3>
                  <p className="text-muted-foreground font-medium italic max-w-sm mx-auto">Choose a profile from the roster to manage their human resource records, payroll, and contracts.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
