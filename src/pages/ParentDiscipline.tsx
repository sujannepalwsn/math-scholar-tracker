import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';

type DisciplineIssue = Tables<'discipline_issues'>;

export default function ParentDiscipline() {
  const { user } = useAuth();

  if (!user?.student_id) {
    return <div className="p-6 text-center text-muted-foreground">Please log in as a parent to view discipline issues.</div>;
  }

  // Fetch student's discipline issues
  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['parent-discipline-issues', user.student_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discipline_issues')
        .select('*, discipline_categories(name)')
        .eq('student_id', user.student_id!)
        .order('issue_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user.student_id,
  });

  const getSeverityColor = (severity: DisciplineIssue['severity']) => {
    switch (severity) {
      case "low": return "text-green-600";
      case "medium": return "text-orange-600";
      case "high": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Discipline Alerts</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> My Child's Discipline Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading issues...</p>
          ) : issues.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No discipline issues logged for your child.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resolution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue: any) => (
                  <TableRow key={issue.id}>
                    <TableCell>{format(new Date(issue.issue_date), "PPP")}</TableCell>
                    <TableCell>{issue.discipline_categories?.name || 'N/A'}</TableCell>
                    <TableCell>{issue.description}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${getSeverityColor(issue.severity)}`}>
                        {issue.severity.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={issue.status === 'resolved' ? 'text-green-600' : 'text-orange-600'}>
                        {issue.status ? issue.status.charAt(0).toUpperCase() + issue.status.slice(1) : 'Open'}
                      </span>
                    </TableCell>
                    <TableCell>{issue.resolution || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}