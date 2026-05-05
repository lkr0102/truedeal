const fs = require('fs');

const md = fs.readFileSync('docs/EXECUTIVE_TECHNICAL_REPORT.md', 'utf8');

// Basic Markdown to HTML conversion
let html = md
  .replace(/^### (.*$)/gim, '<h3>$1</h3>')
  .replace(/^## (.*$)/gim, '<h2>$1</h2>')
  .replace(/^# (.*$)/gim, '<h1>$1</h1>')
  .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
  .replace(/\*(.*?)\*/gim, '<em>$1</em>')
  .replace(/`(.*?)`/gim, '<code>$1</code>')
  .replace(/---/gim, '<hr/>')
  .replace(/\n\n/gim, '<br/><br/>')
  .replace(/\n- (.*)/gim, '<li>$1</li>');

const template = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Executive Technical Report</title>
<style>
  body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
  h1 { color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 10px; }
  h2 { color: #2d3748; margin-top: 30px; }
  h3 { color: #4a5568; }
  code { background-color: #f7fafc; padding: 2px 4px; border-radius: 4px; font-family: monospace; color: #e53e3e; }
  hr { border: 0; height: 1px; background: #e2e8f0; margin: 30px 0; }
  li { margin-bottom: 8px; }
</style>
</head>
<body>
${html}
</body>
</html>`;

fs.writeFileSync('docs/EXECUTIVE_TECHNICAL_REPORT.html', template);
console.log('✅ HTML gerado com sucesso em docs/EXECUTIVE_TECHNICAL_REPORT.html');
