
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  ClipboardCheck, 
  MessageSquare,
  GraduationCap 
} from 'lucide-react';

const DashboardOverview = () => {
  const { profile, isAdmin, isTeacher, isStudent } = useAuth();

  const adminCards = [
    {
      title: "Total Students",
      description: "Enrolled students",
      icon: Users,
      value: "24",
      color: "text-blue-600"
    },
    {
      title: "Active Lessons",
      description: "This week",
      icon: BookOpen,
      value: "12",
      color: "text-green-600"
    },
    {
      title: "Pending Tests",
      description: "To be graded",
      icon: ClipboardCheck,
      value: "8",
      color: "text-orange-600"
    },
    {
      title: "Messages",
      description: "Unread",
      icon: MessageSquare,
      value: "5",
      color: "text-purple-600"
    }
  ];

  const teacherCards = [
    {
      title: "My Classes",
      description: "This week",
      icon: Calendar,
      value: "8",
      color: "text-blue-600"
    },
    {
      title: "My Students",
      description: "Assigned to me",
      icon: Users,
      value: "16",
      color: "text-green-600"
    },
    {
      title: "Assignments",
      description: "To review",
      icon: ClipboardCheck,
      value: "12",
      color: "text-orange-600"
    }
  ];

  const studentCards = [
    {
      title: "Upcoming Classes",
      description: "This week",
      icon: Calendar,
      value: "6",
      color: "text-blue-600"
    },
    {
      title: "Assignments",
      description: "Due soon",
      icon: ClipboardCheck,
      value: "3",
      color: "text-orange-600"
    },
    {
      title: "Test Results",
      description: "Recent",
      icon: GraduationCap,
      value: "85%",
      color: "text-green-600"
    }
  ];

  let cards = studentCards;
  if (isAdmin) {
    cards = adminCards;
  } else if (isTeacher) {
    cards = teacherCards;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates in your system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Database tables created successfully:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>✅ Profiles</li>
                <li>✅ Students</li>
                <li>✅ Lessons</li>
                <li>✅ Assignments</li>
                <li>✅ Tests & Results</li>
                <li>✅ Attendance</li>
                <li>✅ Messages</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current system information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Authentication:</span>
                <span className="text-sm text-green-600">✅ Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Database:</span>
                <span className="text-sm text-green-600">✅ Connected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Your Role:</span>
                <span className="text-sm font-medium capitalize">{profile?.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">User ID:</span>
                <span className="text-xs font-mono">{profile?.id?.substring(0, 8)}...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
