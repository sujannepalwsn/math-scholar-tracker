import os
import re

def fix_file(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r') as f:
        content = f.read()

    lines = content.split('\n')

    use_client = False
    new_lines = []
    lucide_icons = set()
    ui_imports = {} # {file: set(comps)}
    other_imports = []
    rest_of_file = []

    in_import_block = False

    for line in lines:
        stripped = line.strip()
        if stripped in ['"use client";', "'use client';", '"use client"', "'use client'"]:
            use_client = True
            continue

        # Match lucide-react
        lucide_match = re.search(r'import\s*\{([^}]*)\}\s*from\s*["\']lucide-react["\']', line)
        if lucide_match:
            icons = [i.strip() for i in lucide_match.group(1).split(',')]
            for icon in icons:
                if icon: lucide_icons.add(icon)
            continue

        # Match UI components
        ui_match = re.search(r'import\s*\{([^}]*)\}\s*from\s*["\']@/components/ui/([^"\']+)["\']', line)
        if ui_match:
            comps = [c.strip() for c in ui_match.group(1).split(',')]
            ui_file = ui_match.group(2)
            if ui_file not in ui_imports:
                ui_imports[ui_file] = set()
            for c in comps:
                if c: ui_imports[ui_file].add(c)
            continue

        if line.startswith('import '):
            other_imports.append(line)
        elif stripped == '' and not rest_of_file:
            continue # skip leading empty lines
        else:
            rest_of_file.append(line)

    # Reconstruct
    output = []
    if use_client:
        output.append('"use client";')

    if lucide_icons:
        output.append(f'import {{ {", ".join(sorted(list(lucide_icons)))} }} from "lucide-react";')

    for ui_file, comps in sorted(ui_imports.items()):
        output.append(f'import {{ {", ".join(sorted(list(comps)))} }} from "@/components/ui/{ui_file}";')

    output.extend(other_imports)

    # Add a gap before the rest
    if rest_of_file:
        output.append("")
        output.extend(rest_of_file)

    with open(filepath, 'w') as f:
        f.write('\n'.join(output))

# Process all tsx files
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            fix_file(os.path.join(root, file))
