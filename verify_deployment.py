import sys
import os
import re

def check_for_missing_imports():
    errors = []
    # Key components and icons to check
    tokens = ['Badge', 'Loader2', 'Users', 'Calendar', 'Tooltip', 'cn', 'Progress', 'Select', 'Card', 'Table']

    for root, dirs, files in os.walk('src'):
        for file in files:
            if file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                if 'components/ui' in filepath: continue

                with open(filepath, 'r') as f:
                    content = f.read()

                    for token in tokens:
                        if re.search(r'\b' + token + r'\b', content):
                            # Check if token is defined or imported
                            is_defined = f'const {token} =' in content or f'function {token}' in content
                            is_imported = f'{{ {token} }}' in content or f' {token},' in content or f', {token} ' in content or f'{{ {token},' in content or f', {token} }}' in content

                            if not is_defined and not is_imported:
                                errors.append(f"MISSING {token} in {filepath}")

    return errors

if __name__ == "__main__":
    errs = check_for_missing_imports()
    if errs:
        for e in errs: print(e)
        sys.exit(1)
    else:
        print("Final sanity check passed.")
