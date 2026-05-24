const fs = require('fs');

const files = fs.readdirSync('src/components/forms')
  .filter(f => f.startsWith('Form0') && f.endsWith('.tsx'))
  .map(f => 'src/components/forms/' + f);

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  if (!content.includes('isSaving?: boolean;')) {
    content = content.replace('interface Props {', 'interface Props {\n  isSaving?: boolean;');
  }

  const exportRegex = /(export default function [A-Za-z0-9_]+\(\{\s*)([^}]*)(\}\s*:\s*Props\)\s*\{)/;
  if (content.match(exportRegex) && !content.includes('isSaving,')) {
    content = content.replace(exportRegex, '$1isSaving, $2$3');
  }

  if (content.includes('<FormActions')) {
    if (content.includes('submitting={submitting}')) {
      content = content.replace('submitting={submitting}', 'submitting={isSaving}');
    } else if (!content.includes('submitting={isSaving}')) {
      content = content.replace('<FormActions', '<FormActions\n          submitting={isSaving}');
    }
  }

  content = content.replace(/const \[submitting, setSubmitting\] = useState\(false\);\n?/g, '');
  content = content.replace(/\s*setSubmitting\(true\);\n?/g, '');
  
  fs.writeFileSync(f, content);
});
