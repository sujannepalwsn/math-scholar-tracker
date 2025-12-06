import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Home, BookOpen, CheckSquare, Users, CalendarDays, MessageSquare } from 'lucide-react';
import { format, isToday, isFuture } from 'date-fns';

export default function TeacherDashboard() {
  const { user } = useAuth();

  // Fetch upcoming center events
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['teacher-upcoming-events', user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('center_events')
        .select('*')
        .eq('center_id', user.center_id)
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Fetch teacher's upcoming meetings
  const { data: upcomingMeetings = [] } = useQuery({
    queryKey: ['teacher-upcoming-meetings', user?.teacher_id, user?.id],
    queryFn: async () => {
      if (!user?.teacher_id && !user?.id) return [];
      
      // First try by teacher_id
      let { data, error } = await supabase
        .from('meeting_attendees')
        .select(`
          *,
          meetings(id, title, meeting_date, meeting_type, status, location)
        `)
        .eq('teacher_id', user.teacher_id!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter to upcoming meetings only
      const upcomingOnly = (data || []).filter((att: any) => {
        if (!att.meetings?.meeting_date) return false;
        const meetingDate = new Date(att.meetings.meeting_date);
        return isFuture(meetingDate) || isToday(meetingDate);
      });
      
      return upcomingOnly.slice(0, 5);
    },
    enabled: !!user?.teacher_id || !!user?.id,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome, {user?.username}!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is your personalized dashboard. Use the sidebar to access your assigned features.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {user?.teacherPermissions?.take_attendance && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Take Attendance</CardTitle>
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Mark student presence.</p>
                </CardContent>
              </Card>
            )}
            {user?.teacherPermissions?.lesson_tracking && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lesson Tracking</CardTitle>
                  <BookOpen className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Record lessons taught.</p>
                </CardContent>
              </Card>
            )}
            {user?.teacherPermissions?.student_report_access && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Student Reports</CardTitle>
                  <Users className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">View student performance reports.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No upcoming events.</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event: any) => (
                <div key={event.id} className={`p-3 rounded-lg border ${event.is_holiday ? 'bg-red-50 border-red-200' : 'bg-muted/50'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{format(new Date(event.event_date), 'PPP')}</p>
                      {event.is_holiday && <span className="text-xs text-red-600 font-medium">Holiday</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Meetings */}
      {user?.teacherPermissions?.meetings_management && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> My Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMeetings.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No upcoming meetings.</p>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map((attendee: any) => (
                  <div key={attendee.id} className="p-3 rounded-lg border bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{attendee.meetings?.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {attendee.meetings?.meeting_type?.charAt(0).toUpperCase() + attendee.meetings?.meeting_type?.slice(1)} Meeting
                          {attendee.meetings?.location && ` • ${attendee.meetings.location}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{format(new Date(attendee.meetings?.meeting_date), 'PPP')}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(attendee.meetings?.meeting_date), 'p')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}