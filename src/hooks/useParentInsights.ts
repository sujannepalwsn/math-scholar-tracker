import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { useMemo } from "react";

export interface ParentInsight {
  type: 'performance' | 'attendance' | 'homework' | 'finance' | 'discipline';
  level: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  message: string;
  value?: string | number;
  trend?: number;
}

export function useParentInsights(studentId: string | null) {
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  const startOfThisMonth = startOfMonth(today);
  const endOfThisMonth = endOfMonth(today);
  const startOfLastMonth = startOfMonth(subDays(startOfThisMonth, 1));
  const endOfLastMonth = endOfMonth(subDays(startOfThisMonth, 1));

  // 1. Fetch Attendance
  const { data: attendance = [] } = useQuery({
    queryKey: ['insights-attendance', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .gte('date', format(subDays(today, 60), 'yyyy-MM-dd'));
      if (error) throw error;
      return data;
    },
    enabled: !!studentId
  });

  // 2. Fetch Homework
  const { data: homework = [] } = useQuery({
    queryKey: ['insights-homework', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('student_homework_records')
        .select('*, homework(*)')
        .eq('student_id', studentId)
        .gte('created_at', subDays(today, 30).toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!studentId
  });

  // 3. Fetch Test Results
  const { data: testResults = [] } = useQuery({
    queryKey: ['insights-tests', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('test_results')
        .select('*, tests(*)')
        .eq('student_id', studentId)
        .order('date_taken', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!studentId
  });

  // 4. Fetch Exam Marks
  const { data: examMarks = [] } = useQuery({
    queryKey: ['insights-exams', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('exam_marks')
        .select('*, exam_subjects(*), exams(*)')
        .eq('student_id', studentId);
      if (error) throw error;
      return data;
    },
    enabled: !!studentId
  });

  // 5. Fetch Finance (Invoices)
  const { data: invoices = [] } = useQuery({
    queryKey: ['insights-finance', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('student_id', studentId);
      if (error) throw error;
      return data;
    },
    enabled: !!studentId
  });

  // 6. Fetch Learning Progress (student_chapters)
  const { data: chapters = [] } = useQuery({
    queryKey: ['insights-chapters', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('student_chapters')
        .select('*, lesson_plans(*)')
        .eq('student_id', studentId);
      if (error) throw error;
      return data;
    },
    enabled: !!studentId
  });

  const insights = useMemo(() => {
    if (!studentId) return [];

    const list: ParentInsight[] = [];

    // --- ATTENDANCE INSIGHTS ---
    const thisMonthAttendance = attendance.filter(a =>
      isWithinInterval(new Date(a.date), { start: startOfThisMonth, end: endOfThisMonth })
    );
    const lastMonthAttendance = attendance.filter(a =>
      isWithinInterval(new Date(a.date), { start: startOfLastMonth, end: endOfLastMonth })
    );

    const calcRate = (list: any[]) => list.length > 0 ? (list.filter(a => a.status === 'present').length / list.length) * 100 : 0;
    const thisMonthRate = calcRate(thisMonthAttendance);
    const lastMonthRate = calcRate(lastMonthAttendance);
    const attendanceTrend = thisMonthRate - lastMonthRate;

    if (thisMonthRate < 75 && thisMonthAttendance.length > 0) {
      list.push({
        type: 'attendance',
        level: 'critical',
        title: 'Attendance Alert',
        message: `Attendance has dropped to ${Math.round(thisMonthRate)}% this month. Threshold is 75%.`,
        value: `${Math.round(thisMonthRate)}%`,
        trend: attendanceTrend
      });
    } else if (attendanceTrend < -10) {
      list.push({
        type: 'attendance',
        level: 'warning',
        title: 'Attendance Declining',
        message: `Attendance is ${Math.round(Math.abs(attendanceTrend))}% lower than last month.`,
        value: `${Math.round(thisMonthRate)}%`,
        trend: attendanceTrend
      });
    }

    // --- HOMEWORK INSIGHTS ---
    const thisWeekHomework = homework.filter(h =>
      isWithinInterval(new Date(h.created_at), { start: startOfWeek(today), end: endOfWeek(today) })
    );
    const missingHomework = thisWeekHomework.filter(h => h.status === 'assigned' || h.status === 'late');

    if (missingHomework.length > 0) {
      list.push({
        type: 'homework',
        level: missingHomework.length > 2 ? 'critical' : 'warning',
        title: 'Homework Pending',
        message: `${missingHomework.length} assignments are currently pending or overdue this week.`,
        value: missingHomework.length
      });
    }

    // --- PERFORMANCE INSIGHTS ---
    // Combine test and exam percentages
    const testPercentages = testResults.map(tr => ({
      date: new Date(tr.date_taken || tr.created_at),
      pct: (tr.marks_obtained / (tr.tests?.total_marks || 100)) * 100
    }));

    const examPercentages = examMarks.map(em => ({
      date: new Date(em.exams?.exam_date || em.created_at),
      pct: (em.marks_obtained / (em.exam_subjects?.full_marks || 100)) * 100
    }));

    const allPerformances = [...testPercentages, ...examPercentages].sort((a, b) => b.date.getTime() - a.date.getTime());

    const recentPerf = allPerformances.slice(0, 5);
    const olderPerf = allPerformances.slice(5, 10);

    const calcAvg = (list: any[]) => list.length > 0
      ? list.reduce((acc, curr) => acc + curr.pct, 0) / list.length
      : 0;

    const recentAvg = calcAvg(recentPerf);
    const olderAvg = calcAvg(olderPerf);
    const perfTrend = recentAvg - olderAvg;

    if (perfTrend < -10 && olderPerf.length > 0) {
      list.push({
        type: 'performance',
        level: 'critical',
        title: 'Performance Drop',
        message: `Average test scores have declined by ${Math.round(Math.abs(perfTrend))}% recently.`,
        value: `${Math.round(recentAvg)}%`,
        trend: perfTrend
      });
    }

    // Weakest Subject
    const subjectStats: Record<string, { total: number, count: number }> = {};
    testResults.forEach(tr => {
      const subject = tr.tests?.subject;
      if (subject) {
        if (!subjectStats[subject]) subjectStats[subject] = { total: 0, count: 0 };
        subjectStats[subject].total += (tr.marks_obtained / (tr.tests?.total_marks || 100)) * 100;
        subjectStats[subject].count += 1;
      }
    });

    let weakestSubject = null;
    let minScore = 101;

    Object.entries(subjectStats).forEach(([subject, stats]) => {
      const avg = stats.total / stats.count;
      if (avg < minScore) {
        minScore = avg;
        weakestSubject = subject;
      }
    });

    if (weakestSubject && minScore < 60) {
      list.push({
        type: 'performance',
        level: 'warning',
        title: 'Subject Focus Required',
        message: `${weakestSubject} is currently the weakest subject with an average of ${Math.round(minScore)}%.`,
        value: weakestSubject
      });
    }

    // --- FINANCE INSIGHTS ---
    const totalDues = invoices.reduce((acc, inv) => acc + (inv.total_amount - (inv.paid_amount || 0)), 0);
    if (totalDues > 0) {
      list.push({
        type: 'finance',
        level: 'warning',
        title: 'Outstanding Fees',
        message: `There is an outstanding balance of ${totalDues.toLocaleString()} NPR.`,
        value: totalDues
      });
    }

    return list;
  }, [studentId, attendance, homework, testResults, invoices, chapters]);

  const stats = useMemo(() => {
    const totalChapters = chapters.length;
    const completedChapters = chapters.filter(c => c.completed).length;

    const totalHomework = homework.length;
    const completedHomework = homework.filter(h => h.status === 'completed' || h.status === 'checked').length;

    // Combine test and exam data for stats
    const testScores = testResults.map(tr => (tr.marks_obtained / (tr.tests?.total_marks || 100)) * 100);
    const examScores = examMarks.map(em => (em.marks_obtained / (em.exam_subjects?.full_marks || 100)) * 100);
    const allScores = [...testScores, ...examScores];

    const avgScore = allScores.length > 0
      ? allScores.reduce((acc, curr) => acc + curr, 0) / allScores.length
      : 0;

    return {
      attendanceRate: attendance.length > 0 ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100 : 0,
      homeworkCompletionRate: totalHomework > 0 ? (completedHomework / totalHomework) * 100 : 0,
      averageTestScore: avgScore,
      learningProgress: totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0,
      missedClasses: attendance.filter(a => a.status === 'absent').length,
      totalDues: invoices.reduce((acc, inv) => acc + (inv.total_amount - (inv.paid_amount || 0)), 0)
    };
  }, [attendance, homework, testResults, invoices, chapters]);

  return {
    insights,
    stats,
    isLoading: false // Simplified for now
  };
}
