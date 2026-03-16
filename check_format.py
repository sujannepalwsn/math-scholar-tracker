import os
import re

files = [
    "src/components/center/NoticeBoard.tsx",
    "src/components/center/StaffHRModule.tsx",
    "src/components/finance/InvoiceManagement.tsx",
    "src/components/meetings/MeetingConclusionViewer.tsx",
    "src/components/meetings/MeetingForm.tsx",
    "src/integrations/supabase/finance-types.ts",
    "src/lib/utils.ts",
    "src/pages/AttendanceSummary.tsx",
    "src/pages/CalendarEvents.tsx",
    "src/pages/Dashboard.tsx",
    "src/pages/DisciplineIssues.tsx",
    "src/pages/HomeworkManagement.tsx",
    "src/pages/LeaveApplications.tsx",
    "src/pages/LeaveManagement.tsx",
    "src/pages/LessonPlanManagement.tsx",
    "src/pages/LessonPlans.tsx",
    "src/pages/LessonTracking.tsx",
    "src/pages/MeetingManagement.tsx",
    "src/pages/Messaging.tsx",
    "src/pages/ParentActivities.tsx",
    "src/pages/ParentDashboard.tsx",
    "src/pages/ParentDiscipline.tsx",
    "src/pages/ParentFinanceDashboard.tsx",
    "src/pages/ParentHomework.tsx",
    "src/pages/ParentMeetings.tsx",
    "src/pages/ParentMessaging.tsx",
    "src/pages/ParentStudentReport.tsx",
    "src/pages/PreschoolActivities.tsx",
    "src/pages/SchoolDays.tsx",
    "src/pages/StudentReport.tsx",
    "src/pages/Summary.tsx",
    "src/pages/TakeAttendance.tsx",
    "src/pages/TeacherAttendance.tsx",
    "src/pages/TeacherDashboard.tsx",
    "src/pages/TeacherManagement.tsx",
    "src/pages/TeacherMeetings.tsx",
    "src/pages/TeacherMessaging.tsx",
    "src/pages/TeacherPerformanceReport.tsx",
    "src/pages/Tests.tsx",
    "src/pages/ViewRecords.tsx"
]

missing_import = []

for file_path in files:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r') as f:
        content = f.read()
        if 'format(' in content and 'from "date-fns"' not in content and "from 'date-fns'" not in content:
            # Check if it's not formatCurrency or similar
            # Also check if format is imported as something else or part of date-fns
            # Simple check: does it have import { ...format... } from 'date-fns'
            if not re.search(r'import\s+\{.*format.*\}\s+from\s+[\'"]date-fns[\'"]', content):
                missing_import.append(file_path)

print("\n".join(missing_import))
