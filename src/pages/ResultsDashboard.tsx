import React, { useMemo, useState } from "react";
import { Award, BarChart3, Percent, TrendingUp, Users, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { getGradeFormal } from "@/lib/utils";

export default function ResultsDashboard() {
  const { user } = useAuth();
  const centerId = user?.center_id;
  const [selectedExamId, setSelectedExamId] = useState<string>("");

  const { data: exams = [] } = useQuery({
    queryKey: ["exams-list-dashboard", centerId, user?.role, user?.teacher_id],
    queryFn: async () => {
      if (!centerId) return [];
      let query = supabase
        .from("exams")
        .select("*")
        .eq("center_id", centerId)
        .order("created_at", { ascending: false });

      if (user?.role === 'parent') {
        query = query.eq("status", "published");
      }

      if (user?.role === "teacher") {
        query = query.eq("created_by", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["result-subjects", selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const { data, error } = await supabase.from("exam_subjects").select("*").eq("exam_id", selectedExamId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExamId,
  });

  const { data: marks = [] } = useQuery({
    queryKey: ["result-marks", selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const { data, error } = await supabase.from("exam_marks").select("*, students(name)").eq("exam_id", selectedExamId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExamId,
  });

  const analytics = useMemo(() => {
    if (!marks.length || !subjects.length) return null;

    // Group marks by student
    const byStudent: Record<string, { name: string; total: number; fullTotal: number }> = {};
    marks.forEach((m: any) => {
      const sid = m.student_id;
      const subj = subjects.find((s: any) => s.id === m.exam_subject_id);
      if (!subj) return;
      if (!byStudent[sid]) byStudent[sid] = { name: m.students?.name || "Unknown", total: 0, fullTotal: 0 };
      byStudent[sid].total += (m.marks_obtained || 0);
      byStudent[sid].fullTotal += subj.full_marks;
    });

    const studentResults = Object.values(byStudent).map((s) => ({
      ...s,
      percentage: s.fullTotal > 0 ? (s.total / s.fullTotal) * 100 : 0,
    }));

    const totalStudents = studentResults.length;
    const passCount = studentResults.filter((s) => {
      // Check if all subjects passed
      const studentMarks = marks.filter((m: any) => m.student_id === Object.keys(byStudent).find(k => byStudent[k] === s));
      return s.percentage >= 40;
    }).length;
    const failCount = totalStudents - passCount;
    const classAvg = totalStudents > 0 ? studentResults.reduce((a, b) => a + b.percentage, 0) / totalStudents : 0;
    const topPerformer = studentResults.sort((a, b) => b.percentage - a.percentage)[0];

    // Subject-wise performance
    const subjectPerf = subjects.map((subj: any) => {
      const subjectMarks = marks.filter((m: any) => m.exam_subject_id === subj.id);
      const avg = subjectMarks.length > 0 ? subjectMarks.reduce((a: number, m: any) => a + (m.marks_obtained || 0), 0) / subjectMarks.length : 0;
      return { name: subj.subject_name, average: Math.round(avg * 10) / 10, fullMarks: subj.full_marks };
    });

    return {
      classAvg: Math.round(classAvg * 10) / 10,
      topPerformer,
      passCount,
      failCount,
      totalStudents,
      passPercentage: totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0,
      subjectPerf,
      pieData: [
        { name: "Pass", value: passCount, color: "hsl(var(--primary))" },
        { name: "Fail", value: failCount, color: "hsl(var(--destructive))" },
      ],
    };
  }, [marks, subjects]);

  return (
    <div className="space-y-6">
      <PageHeader title="Results Dashboard" description="Analytics and statistics for published exams" />

      <Card>
        <CardContent className="p-4">
          <Select value={selectedExamId} onValueChange={setSelectedExamId}>
            <SelectTrigger><SelectValue placeholder="Select an exam" /></SelectTrigger>
            <SelectContent>
              {exams.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name} - Grade {e.grade}
                  {e.status === 'draft' && " (Draft)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {analytics && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold text-foreground">{analytics.classAvg}%</p>
                <p className="text-sm text-muted-foreground">Class Average</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-lg font-bold text-foreground">{analytics.topPerformer?.name}</p>
                <p className="text-sm text-muted-foreground">Top: {analytics.topPerformer?.percentage.toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Percent className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold text-foreground">{analytics.passPercentage}%</p>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <XCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p className="text-2xl font-bold text-foreground">{analytics.failCount}</p>
                <p className="text-sm text-muted-foreground">Failed Students</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Subject Performance Bar Chart */}
            <Card>
              <CardHeader><CardTitle className="text-base">Subject Performance</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.subjectPerf}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="average" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pass vs Fail Pie Chart */}
            <Card>
              <CardHeader><CardTitle className="text-base">Pass vs Fail</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={analytics.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {analytics.pieData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {selectedExamId && !analytics && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No marks data found for this exam.</CardContent></Card>
      )}
    </div>
  );
}
