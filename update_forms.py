import glob
import re

form_files = glob.glob('src/components/forms/Form0*.tsx')

for f in form_files:
    with open(f, 'r') as file:
        content = file.read()
        
    # Add isSaving?: boolean; to Props
    if 'isSaving?: boolean;' not in content:
        content = re.sub(r'interface Props \{', r'interface Props {\n  isSaving?: boolean;', content)
        
    # Remove local submitting state if present
    content = re.sub(r'const \[submitting, setSubmitting\] = useState\(false\);\n?', '', content)
    
    # Remove setSubmitting(true);
    content = re.sub(r'setSubmitting\(true\);\n?', '', content)
    
    # Add isSaving to destructuring
    # e.g., export default function Form01({ initialData, onSubmit, onSaveDraft, readOnly }: Props)
    # Be careful, some forms have different destructurings.
    # We can match `export default function \w+\(([^)]*)\)`
    def repl_func(m):
        inner = m.group(1)
        if 'isSaving' not in inner:
            # Insert isSaving before the first '{' if it exists inside destructured object, or just append to destructured obj
            # Wait, it's always `{ ... }: Props`
            inner = re.sub(r'\{ (.*?) \}', r'{ isSaving, \1 }', inner)
        return f"export default function {m.group(0).split('(')[0].split(' ')[-1]}({inner})"
    
    # regex to match export default function FormName({ initialData, ... }: Props)
    content = re.sub(r'export default function [a-zA-Z0-9_]+\(\{([^}]+)\}(:\s*Props)?\)\s*\{', r'export default function \g<0>', content)
    
    # simpler:
    # Just look for `({ ` and replace with `({ isSaving, `
    # but only on the line defining export default function
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('export default function Form'):
            if 'isSaving' not in line:
                lines[i] = line.replace('({ ', '({ isSaving, ').replace('({', '({ isSaving, ')
            break
    content = '\n'.join(lines)
    
    # Pass submitting={isSaving} to FormActions
    # <FormActions
    # ...
    # submitting={submitting} -> submitting={isSaving}
    # or add submitting={isSaving} if it's not there
    if '<FormActions' in content:
        if 'submitting={' in content:
            content = re.sub(r'submitting=\{submitting\}', r'submitting={isSaving}', content)
        else:
            content = re.sub(r'<FormActions', r'<FormActions\n          submitting={isSaving}', content)

    with open(f, 'w') as file:
        file.write(content)

