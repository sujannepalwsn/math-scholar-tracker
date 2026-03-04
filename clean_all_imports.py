import os
import re

def clean_imports(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r') as f:
        content = f.read()

    # Identify all imports from 'lucide-react'
    lucide_imports = re.findall(r'import\s*\{([^}]*)\}\s*from\s*["\']lucide-react["\']', content)
    if not lucide_imports:
        return

    # Collect all icons used
    all_icons = set()
    for imp in lucide_imports:
        icons = [i.strip() for i in imp.split(',')]
        for icon in icons:
            if icon: all_icons.add(icon)

    # Remove all existing lucide-react imports
    content = re.sub(r'import\s*\{[^}]*\}\s*from\s*["\']lucide-react["\'];?\s*', '', content)

    # Add one consolidated import at the top
    new_import = f'import {{ {", ".join(sorted(list(all_icons)))} }} from "lucide-react";\n'

    # Find UI imports and consolidate them too
    ui_imports = {} # {ui_file: set(components)}
    ui_import_matches = re.findall(r'import\s*\{([^}]*)\}\s*from\s*["\']@/components/ui/([^"\']+)["\']', content)
    for imp, ui_file in ui_import_matches:
        parts = [p.strip() for p in imp.split(',')]
        if ui_file not in ui_imports:
            ui_imports[ui_file] = set()
        for p in parts:
            if p: ui_imports[ui_file].add(p)

    # Remove all existing UI imports
    content = re.sub(r'import\s*\{[^}]*\}\s*from\s*["\']@/components/ui/[^"\']+["\'];?\s*', '', content)

    ui_import_block = ""
    for ui_file, comps in sorted(ui_imports.items()):
        ui_import_block += f'import {{ {", ".join(sorted(list(comps)))} }} from "@/components/ui/{ui_file}";\n'

    # Re-insert consolidated imports at the beginning of the file (after "use client" if exists)
    if content.startswith('"use client";') or content.startswith("'use client';"):
        lines = content.split('\n')
        lines.insert(1, new_import + ui_import_block)
        content = '\n'.join(lines)
    else:
        content = new_import + ui_import_block + content

    with open(filepath, 'w') as f:
        f.write(content)

# Apply to all pages and components
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            clean_imports(os.path.join(root, file))
