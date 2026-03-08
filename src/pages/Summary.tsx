import React, { useState } from "react";
import { Download, Users } from "lucide-react";
import { cn, safeFormatDate } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth } from "date-fns"

interface StudentSummary {
  id: string;
  name: string;
  grade: string;
  present: number;
  absent: number;
  total: number;
  percentage: number;
  absentDates: string[];
}

export default function Summary() {
  const { user } = useAuth();
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>(format(new Date(), "yyyy-MM"));

  // Fetch students
  const { data: students } = useQuery({
    queryKey: ["students", user?.center_id],
    queryFn: async () => {
      let query = supabase.from("students").select("*").order("name");
      if (user?.role !== "admin" && user?.center_id) query = query.eq("center_id", user.center_id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    } });

  // Fetch attendance
  const studentIds = students?.map((s) => s.id) || [];
  const { data: allAttendance } = useQuery({
    queryKey: ["all-attendance", user?.center_id, studentIds.length > 0 ? studentIds.join(",") : "", user?.role, user?.id],
    queryFn: async () => {
      if (!studentIds.length) return [];
      let query = supabase
        .from("attendance")
        .select("*")
        .in("student_id", studentIds);

      if (user?.role === 'teacher') {
        query = query.eq('marked_by', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!studentIds.length });

  const grades = [...new Set(students?.map((s) => s.grade) || [])];

  const summaryData: StudentSummary[] =
    students
      ?.map((student) => {
        const studentAttendance = allAttendance?.filter((a) => a.student_id === student.id) || [];

        // Apply month filter
        const filteredAttendance = studentAttendance.filter((a) => {
          if (!monthFilter) return true;
          const date = parseISO(a.date);
          const start = startOfMonth(parseISO(monthFilter + "-01"));
          const end = endOfMonth(parseISO(monthFilter + "-01"));
          return isWithinInterval(date, { start, end });
        });

        const present = filteredAttendance.filter((a) => a.status === "present").length;
        const absent = filteredAttendance.filter((a) => a.status === "absent").length;
        const total = present + absent;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        const absentDates = filteredAttendance
          .filter((a) => a.status === "absent")
          .map((a) => a.date)
          .sort();

        return {
          id: student.id,
          name: student.name,
          grade: student.grade,
          present,
          absent,
          total,
          percentage,
          absentDates };
      })
      .filter((s) => gradeFilter === "all" || s.grade === gradeFilter) || [];

  const exportToCSV = () => {
    if (!summaryData || !summaryData.length) return;

    const headers = ["Name", "Grade", "Present", "Absent", "Total Days", "Attendance %", "Absent Dates"];
    const rows = summaryData.map((student) => [
      student.name,
      student.grade,
      student.present,
      student.absent,
      student.total,
      `${student.percentage}%`,
      student.absentDates.join("; "),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-summary-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Attendance Insights
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">View detailed statistics and student trends.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={exportToCSV} className="rounded-xl h-11 border-2">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <Card className="relative border-none shadow-medium p-6 overflow-hidden bg-card/60 backdrop-blur-2xl border border-white/30 rounded-3xl">
          <div className="flex flex-wrap gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Grade</label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-[160px] h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
                  <SelectItem value="all">All Grades</SelectItem>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Month</label>
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="flex h-11 w-[180px] rounded-xl border border-border/20 bg-card/50 backdrop-blur-sm px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 shadow-sm hover:border-primary/30"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            Student Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summaryData.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-center">Total Days</TableHead>
                    <TableHead className="text-center">Attendance %</TableHead>
                    <TableHead>Absent Dates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryData.map((student) => (
                    <TableRow key={student.id} className="group transition-all duration-300">
                      <TableCell className="font-black text-slate-700 group-hover:text-primary transition-colors">{student.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg font-bold">
                          {student.grade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 text-green-600 font-bold text-xs">
                          {student.present}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-600 font-bold text-xs">
                          {student.absent}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-500">{student.total}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={student.percentage >= 75 ? "default" : "destructive"}
                          className={cn(
                            "rounded-xl px-3 py-1 font-black",
                            student.percentage >= 75 ? "bg-green-500/20 text-green-700 hover:bg-green-500/30 border-none" : "shadow-sm"
                          )}
                        >
                          {student.percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] max-w-xs overflow-x-auto text-muted-foreground font-medium">
                        <div className="flex flex-wrap gap-1">
                          {student.absentDates.length > 0
                            ? student.absentDates.map((d) => (
                              <span key={d} className="px-1.5 py-0.5 rounded bg-red-500/5 text-red-600 border border-red-500/10">
                                {safeFormatDate(d, "MMM d")}
                              </span>
                            ))
                            : <span className="text-green-600 font-bold">PERFECT ATTENDANCE</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No attendance data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
