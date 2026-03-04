import os
import re

icons = [
    'Users', 'CheckCircle2', 'XCircle', 'TrendingUp', 'CalendarIcon', 'BookOpen',
    'FileText', 'DollarSign', 'Clock', 'ArrowLeft', 'Wallet', 'FileUp', 'Plus',
    'Trash2', 'Edit', 'Bot', 'SquarePen', 'ChevronDown', 'Star', 'LayoutList',
    'Video', 'MessageSquare', 'Bell', 'Shield', 'KeyRound', 'LogOut', 'Settings',
    'CalendarDays', 'Menu', 'X', 'ChevronLeft', 'ChevronRight', 'AlertTriangle',
    'Check', 'ClipboardCheck', 'User', 'UserPlus', 'UserCheck', 'Calendar', 'Loader2'
]

def check_files():
    results = []
    for root, dirs, files in os.walk('src'):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    content = f.read()
                    for icon in icons:
                        if re.search(r'\b' + icon + r'\b', content):
                            # Check if it's imported from lucide-react
                            if not re.search(r'import\s*\{[^}]*\b' + icon + r'\b[^}]*\}\s*from\s*["\']lucide-react["\']', content, re.MULTILINE | re.DOTALL):
                                # Check if it's defined in the file
                                if f'const {icon} =' not in content and f'function {icon}' not in content:
                                    results.append((filepath, icon))
    return results

if __name__ == "__main__":
    missing = check_files()
    for filepath, icon in sorted(missing):
        print(f"MISSING {icon} IN {filepath}")
