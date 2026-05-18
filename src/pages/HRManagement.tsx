import React, { useState } from "react";
import { UserRole } from "@/types/roles";
import { Users, FileText, DollarSign, Award, Briefcase, FileCheck, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StaffHRModule from "@/components/center/StaffHRModule";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  const isRestricted = user?.role === UserRole.TEACHER && user?.teacher_scope_mode !== 'full';

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["teachers-hr", centerId, isRestricted, user?.teacher_id],
    queryFn: async () => {
      let query = supabase.from("teachers").select("*").eq("center_id", centerId);

      if (isRestricted) {
        query = query.eq('id', user?.teacher_id);
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
  });

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <Users className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Talent Hub
              </h1>
              <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                 <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-[10px] md:text-sm font-bold uppercase tracking-widest">Faculty Lifecycle</p>
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
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-4 rounded-[1.5rem] md:rounded-[2.5rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden h-fit border border-white/20">
          <CardHeader className="bg-primary/5 border-b border-border/10 px-6 md:px-8 py-4 md:py-6">
            <CardTitle className="flex items-center gap-3 text-base md:text-lg font-black uppercase tracking-tight">
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
                filteredTeachers.map((teacher) => (
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
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-8">
          {selectedTeacherId ? (
            <div className="space-y-6">
              <Card className="rounded-[1.5rem] md:rounded-[2.5rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden border border-white/20">
                <CardHeader className="bg-primary/5 border-b border-border/10 px-5 md:px-8 py-5 md:py-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">{selectedTeacher?.name}</CardTitle>
                        <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">{selectedTeacher?.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <Badge className="bg-blue-100 text-blue-700 border-none font-black text-[10px] tracking-tight">ID: {selectedTeacherId.slice(0, 8)}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-8">
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
