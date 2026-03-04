import os
import re

files = [
    'src/components/OCRModal.tsx',
    'src/components/QuestionPaperViewer.tsx',
    'src/pages/AIInsights.tsx',
    'src/pages/ChangePassword.tsx',
    'src/pages/HomeworkManagement.tsx',
    'src/pages/MeetingManagement.tsx',
    'src/pages/TeacherManagement.tsx'
]

for filepath in files:
    if not os.path.exists(filepath): continue
    with open(filepath, 'r') as f:
        content = f.read()

    if 'Loader2' in content and 'import { Loader2 }' not in content:
        # Check for existing lucide-react import
        match = re.search(r'import\s*\{([^}]*)\}\s*from\s*["\']lucide-react["\']', content)
        if match:
            icons = [i.strip() for i in match.group(1).split(',')]
            if 'Loader2' not in icons:
                icons.append('Loader2')
                new_import = f'import {{ {", ".join(sorted(icons))} }} from "lucide-react"'
                content = content.replace(match.group(0), new_import)
        else:
            content = 'import { Loader2 } from "lucide-react";\n' + content

        with open(filepath, 'w') as f:
            f.write(content)
