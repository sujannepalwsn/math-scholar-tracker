import React, { useState } from "react";
import { UserRole } from "@/types/roles";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  ClipboardCheck,
  Search,
  TrendingUp,
  BookOpen,
  Calendar,
  AlertTriangle,
  Award,
  ChevronRight,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChildSwitcher } from "@/components/parent/ChildSwitcher";

export default function ParentTests() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(() => {
    if (user?.student_id) return user.student_id;
    const linked = (user?.linked_students as any[]) || [];
    if (linked.length > 0) return typeof linked[0] === 'string' ? linked[0] : linked[0].id;
    return null;
  });

  const activeStudentId = selectedStudentId;

  // Fetch test results for active student
  const { data: results = [], isLoading } = useQuery({
    queryKey: ["parent-test-results", activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase
        .from("test_results")
        .select(`
          *,
          tests (
            name,
            subject,
            total_marks,
            date,
            lesson_plans (
              chapter,
              topic
            )
          )
        `)
        .eq("student_id", activeStudentId)
        .order("date_taken", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId,
  });

  const filteredResults = results.filter(r =>
    r.tests?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.tests?.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (percentage >= 60) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-rose-600 bg-rose-50 border-rose-100";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-emerald-500";
    if (percentage >= 60) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter p-4 md:p-8 bg-white min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Assessments & Tests
          </h1>
          <p className="text-slate-500 font-medium text-lg max-w-2xl">
            Track short-term academic performance, weekly assessments, and topical test results.
          </p>
          <ChildSwitcher selectedId={activeStudentId} onSelect={setSelectedStudentId} />
        </div>

        <div className="relative w-full md:w-72 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by subject or test..."
              className="pl-12 h-12 rounded-2xl bg-white border-slate-200 shadow-soft focus:ring-primary/20 transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 rounded-[2rem] bg-slate-50 animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6 border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
            <div className="p-6 rounded-full bg-white shadow-soft">
              <ClipboardCheck className="w-12 h-12 text-slate-200" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-black text-slate-900">No Tests Found</p>
              <p className="text-slate-500 font-medium">No assessment records matching your criteria.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredResults.map((result) => {
              const percentage = (result.marks_obtained / (result.tests?.total_marks || 100)) * 100;
              return (
                <Card key={result.id} className="group border-none shadow-medium hover:shadow-strong transition-all duration-500 rounded-[2.5rem] bg-white border border-slate-100 overflow-hidden flex flex-col">
                  <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100 p-8">
                    <div className="flex justify-between items-start mb-4">
                      <Badge className={cn("px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest border-none shadow-sm", getPerformanceColor(percentage))}>
                        {percentage.toFixed(0)}% Score
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-slate-200">
                        {result.tests?.subject}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-2xl font-black text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
                        {result.tests?.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(result.date_taken), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6 flex-1 flex flex-col">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end mb-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Proficiency Level</p>
                        <p className="text-sm font-black text-slate-900">{result.marks_obtained} / {result.tests?.total_marks}</p>
                      </div>
                      <Progress value={percentage} className="h-3 rounded-full bg-slate-100" indicatorClassName={getProgressColor(percentage)} />
                    </div>

                    {(result.tests?.lesson_plans) && (
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 group-hover:bg-white transition-colors">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Topical Focus</p>
                        </div>
                        <p className="text-sm font-bold text-slate-700">
                          {result.tests.lesson_plans.chapter}: {result.tests.lesson_plans.topic}
                        </p>
                      </div>
                    )}

                    <div className="pt-4 mt-auto border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-slate-300" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {percentage >= 80 ? "Exceeding Goals" : percentage >= 60 ? "On Track" : "Needs Review"}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
