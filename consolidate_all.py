import os
import re

def consolidate_file(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r') as f:
        lines = f.readlines()

    import_map = {} # {source: set(items)}
    other_lines = []
    use_client = False

    for line in lines:
        if line.strip() in ['"use client";', "'use client';", '"use client"', "'use client'"]:
            use_client = True
            continue

        # Match named imports: import { a, b } from "source"
        match = re.search(r'import\s*\{([^}]*)\}\s*from\s*["\']([^"\']+)["\']', line)
        if match:
            items = [i.strip() for i in match.group(1).split(',')]
            source = match.group(2)
            if source not in import_map:
                import_map[source] = set()
            for item in items:
                if item: import_map[source].add(item)
        else:
            other_lines.append(line)

    # Reconstruct
    new_imports = []
    if use_client:
        new_imports.append('"use client";\n')

    for source, items in sorted(import_map.items()):
        if items:
            new_imports.append(f'import {{ {", ".join(sorted(list(items)))} }} from "{source}";\n')
        else:
            # Handle empty imports if any
            pass

    with open(filepath, 'w') as f:
        f.writelines(new_imports)
        # Skip leading empty lines in other_lines
        start = 0
        while start < len(other_lines) and not other_lines[start].strip():
            start += 1
        if start < len(other_lines):
            f.write('\n') # Gap
            f.writelines(other_lines[start:])

# Apply to everything in src/
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            consolidate_file(os.path.join(root, file))
