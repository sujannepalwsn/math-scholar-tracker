import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, CheckCircle, XCircle, Clock, FileUp, Image } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';

type StudentHomeworkRecord = Tables<'student_homework_records'>;

export default function ParentHomework() {
  const { user } = useAuth();

  if (!user?.student_id) {
    return <div className="p-6 text-center text-muted-foreground">Please log in as a parent to view homework.</div>;
  }

  // Fetch student's homework records
  const { data: homeworkStatus = [], isLoading } = useQuery({
    queryKey: ['parent-homework-records', user.student_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_homework_records')
        .select('*, homework(*)')
        .eq('student_id', user.student_id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user.student_id,
  });

  const getHomeworkStatusIcon = (status: StudentHomeworkRecord['status']) => {
    switch (status) {
      case 'completed':
      case 'checked':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'assigned':
      default:
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const todaysHomework = homeworkStatus.filter((hs: any) => hs.homework?.due_date && format(new Date(hs.homework.due_date), "yyyy-MM-dd") === today && hs.status !== 'completed');
  const upcomingHomework = homeworkStatus.filter((hs: any) => hs.homework?.due_date && !isPast(new Date(hs.homework.due_date)) && format(new Date(hs.homework.due_date), "yyyy-MM-dd") !== today && hs.status !== 'completed');
  const completedHomework = homeworkStatus.filter((hs: any) => hs.status === 'completed');
  const overdueHomework = homeworkStatus.filter((hs: any) => hs.homework?.due_date && isPast(new Date(hs.homework.due_date)) && hs.status !== 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Homework</h1>
      </div>

      <Tabs defaultValue="today" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle>Today's Homework</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading homework...</p>
              ) : todaysHomework.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No homework due today!</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Teacher Remarks</TableHead>
                      <TableHead>Attachments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todaysHomework.map((hs: any) => (
                      <TableRow key={hs.id}>
                        <TableCell className="font-medium">{hs.homework?.title}</TableCell>
                        <TableCell>{hs.homework?.subject}</TableCell>
                        <TableCell>{format(new Date(hs.homework?.due_date), "PPP")}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          {getHomeworkStatusIcon(hs.status)} {hs.status.replace('_', ' ').toUpperCase()}
                        </TableCell>
                        <TableCell>{hs.teacher_remarks || "-"}</TableCell>
                        <TableCell>
                          {hs.homework?.attachment_url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={supabase.storage.from("homework-attachments").getPublicUrl(hs.homework.attachment_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                                <FileUp className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Homework</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading homework...</p>
              ) : upcomingHomework.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No upcoming homework!</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Teacher Remarks</TableHead>
                      <TableHead>Attachments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingHomework.map((hs: any) => (
                      <TableRow key={hs.id}>
                        <TableCell className="font-medium">{hs.homework?.title}</TableCell>
                        <TableCell>{hs.homework?.subject}</TableCell>
                        <TableCell>{format(new Date(hs.homework?.due_date), "PPP")}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          {getHomeworkStatusIcon(hs.status)} {hs.status.replace('_', ' ').toUpperCase()}
                        </TableCell>
                        <TableCell>{hs.teacher_remarks || "-"}</TableCell>
                        <TableCell>
                          {hs.homework?.attachment_url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={supabase.storage.from("homework-attachments").getPublicUrl(hs.homework.attachment_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                                <FileUp className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Homework</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading homework...</p>
              ) : completedHomework.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No completed homework yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Teacher Remarks</TableHead>
                      <TableHead>Attachments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedHomework.map((hs: any) => (
                      <TableRow key={hs.id}>
                        <TableCell className="font-medium">{hs.homework?.title}</TableCell>
                        <TableCell>{hs.homework?.subject}</TableCell>
                        <TableCell>{format(new Date(hs.homework?.due_date), "PPP")}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          {getHomeworkStatusIcon(hs.status)} {hs.status.replace('_', ' ').toUpperCase()}
                        </TableCell>
                        <TableCell>{hs.teacher_remarks || "-"}</TableCell>
                        <TableCell>
                          {hs.homework?.attachment_url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={supabase.storage.from("homework-attachments").getPublicUrl(hs.homework.attachment_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                                <FileUp className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Homework</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading homework...</p>
              ) : overdueHomework.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No overdue homework!</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Teacher Remarks</TableHead>
                      <TableHead>Attachments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueHomework.map((hs: any) => (
                      <TableRow key={hs.id}>
                        <TableCell className="font-medium">{hs.homework?.title}</TableCell>
                        <TableCell>{hs.homework?.subject}</TableCell>
                        <TableCell>{format(new Date(hs.homework?.due_date), "PPP")}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          {getHomeworkStatusIcon(hs.status)} {hs.status.replace('_', ' ').toUpperCase()}
                        </TableCell>
                        <TableCell>{hs.teacher_remarks || "-"}</TableCell>
                        <TableCell>
                          {hs.homework?.attachment_url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={supabase.storage.from("homework-attachments").getPublicUrl(hs.homework.attachment_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                                <FileUp className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}