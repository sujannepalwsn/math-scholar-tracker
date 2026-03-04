import os
import re

def fix_file(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r') as f:
        content = f.read()

    # In these files, Calendar is from UI, and CalendarIcon is from lucide.
    # The script fix_all_files.py might have imported Calendar from both.

    if 'import { Calendar } from "@/components/ui/calendar"' in content:
        # Remove Calendar from lucide-react if present
        content = re.sub(r'import\s*\{([^}]*)\bCalendar\b,\s*([^}]*)\}\s*from\s*["\']lucide-react["\']', r'import {\1\2} from "lucide-react"', content)
        content = re.sub(r'import\s*\{([^}]*),\s*\bCalendar\b([^}]*)\}\s*from\s*["\']lucide-react["\']', r'import {\1\2} from "lucide-react"', content)
        content = re.sub(r'import\s*\{\s*\bCalendar\b\s*\}\s*from\s*["\']lucide-react["\']', '', content)

    # Handle Tooltip in FinanceReports
    if 'FinanceReports.tsx' in filepath:
        content = content.replace('import { Tooltip } from "lucide-react"', 'import { Tooltip as LucideTooltip } from "lucide-react"')

    with open(filepath, 'w') as f:
        f.write(content)

for f in ['src/pages/TakeAttendance.tsx', 'src/pages/TeacherAttendance.tsx', 'src/pages/ViewRecords.tsx', 'src/components/finance/FinanceReports.tsx']:
    fix_file(f)
