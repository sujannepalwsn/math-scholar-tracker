import os
import re

def clean_imports(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r') as f:
        content = f.read()

    # Identify all imports from 'lucide-react' (multiline)
    lucide_imports = re.findall(r'import\s*\{([^}]*)\}\s*from\s*["\']lucide-react["\']', content, re.DOTALL)
    if not lucide_icons_used(content) and not lucide_imports:
        return

    # Collect all icons used
    all_icons = set()
    for imp in lucide_imports:
        icons = [i.strip() for i in imp.split(',')]
        for icon in icons:
            if icon: all_icons.add(icon)

    # Remove all existing lucide-react imports (multiline)
    content = re.sub(r'import\s*\{[^}]*\}\s*from\s*["\']lucide-react["\'];?\s*', '', content, flags=re.DOTALL)

    # Identify all imports from @/components/ui/
    ui_imports = {} # {ui_file: set(components)}
    ui_import_matches = re.findall(r'import\s*\{([^}]*)\}\s*from\s*["\']@/components/ui/([^"\']+)["\']', content, re.DOTALL)
    for imp, ui_file in ui_import_matches:
        parts = [p.strip() for p in imp.split(',')]
        if ui_file not in ui_imports:
            ui_imports[ui_file] = set()
        for p in parts:
            if p: ui_imports[ui_file].add(p)

    # Remove all existing UI imports (multiline)
    content = re.sub(r'import\s*\{[^}]*\}\s*from\s*["\']@/components/ui/[^"\']+["\'];?\s*', '', content, flags=re.DOTALL)

    # Build new import blocks
    import_block = ""
    if all_icons:
        import_block += f'import {{ {", ".join(sorted(list(all_icons)))} }} from "lucide-react";\n'

    for ui_file, comps in sorted(ui_imports.items()):
        import_block += f'import {{ {", ".join(sorted(list(comps)))} }} from "@/components/ui/{ui_file}";\n'

    # Re-insert consolidated imports at the beginning of the file (after "use client" if exists)
    if re.match(r'^["\']use client["\'];', content):
        content = re.sub(r'^([^;]+;)', r'\1\n' + import_block, content)
    else:
        content = import_block + content

    with open(filepath, 'w') as f:
        f.write(content)

def lucide_icons_used(content):
    # Very simple check
    return "lucide-react" in content

# Apply to all pages and components
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            clean_imports(os.path.join(root, file))
