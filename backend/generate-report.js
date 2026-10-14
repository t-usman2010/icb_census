const fs = require('fs');
const path = require('path');

const root = 'D:\\Web Projects\\cences-form\\backend';

const filesToAudit = [
  'ICB-Census-Backend-Prompt.md',
  'package.json',
  '.env.example',
  'src/models.js',
  'src/server.js',
  'src/validation.js',
  'src/constants/enums.js',
  'src/middleware/auth.js',
  'src/middleware/error-handler.js',
  'src/routes/admin.js',
  'src/routes/census.js',
  'src/scripts/seed-admin.js',
  'src/services/audit-service.js',
  'src/services/export-service.js',
  'src/services/pdf-service.js',
  'src/utils/normalizer.js',
  'public/admin/app.js',
  'public/admin/index.html',
  'docs/openapi.json',
  'docs/postman_collection.json'
];

let report = '# Backend Codebase Audit Report\n\n';

for (const relPath of filesToAudit) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) continue;
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  report += `## File: ${relPath}\n`;
  report += `**Full Path:** \`${fullPath}\`\n\n`;
  
  let syntaxError = 'None detected (basic check).';
  if (relPath.endsWith('.js')) {
    try {
      require('vm').Script(content);
    } catch(e) {
      syntaxError = e.toString();
    }
  }
  
  const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`](.*?)['"`]/g;
  const routes = [];
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    routes.push(`${match[1].toUpperCase()} ${match[2]}`);
  }
  
  const modelRegex = /mongoose\.model\s*\(\s*['"`](.*?)['"`]/g;
  const models = [];
  while ((match = modelRegex.exec(content)) !== null) {
    models.push(match[1]);
  }
  
  const mwRegex = /app\.use\s*\((.*?)\)/g;
  const middlewares = [];
  while ((match = mwRegex.exec(content)) !== null) {
    middlewares.push(match[1]);
  }
  
  const envRegex = /process\.env\.([A-Z_0-9]+)/g;
  const envs = new Set();
  while ((match = envRegex.exec(content)) !== null) {
    envs.add(match[1]);
  }
  
  const todoRegex = /(TODO|FIXME).*/gi;
  const todos = [];
  while ((match = todoRegex.exec(content)) !== null) {
    todos.push(match[0]);
  }
  
  const upload = content.includes('multer') || content.includes('req.file') || content.includes('req.files');
  const cors = content.includes('cors(');
  const auth = content.includes('jwt') || content.includes('bcrypt') || content.includes('verifyToken');

  let contentSummary = content.length > 2500 ? content.substring(0, 1250) + '\n... [TRUNCATED] ...\n' + content.substring(content.length - 1250) : content;
  
  report += `### Metadata & Analysis\n`;
  report += `- **Syntax Errors:** ${syntaxError}\n`;
  report += `- **API Routes Defined:** ${routes.length > 0 ? routes.join(', ') : 'None'}\n`;
  report += `- **Database Models:** ${models.length > 0 ? models.join(', ') : 'None'}\n`;
  report += `- **App-Level Middleware:** ${middlewares.length > 0 ? middlewares.join(', ') : 'None'}\n`;
  report += `- **Environment Variables Used:** ${envs.size > 0 ? Array.from(envs).join(', ') : 'None'}\n`;
  report += `- **TODOs/FIXMEs:** ${todos.length > 0 ? todos.join(' | ') : 'None'}\n`;
  report += `- **File Upload Handling:** ${upload ? 'Yes' : 'No'}\n`;
  report += `- **CORS Configuration Detected:** ${cors ? 'Yes' : 'No'}\n`;
  report += `- **Auth/Authorization Logic Detected:** ${auth ? 'Yes' : 'No'}\n\n`;

  report += `### File Contents\n\`\`\`${relPath.endsWith('.js') ? 'javascript' : relPath.endsWith('.json') ? 'json' : relPath.endsWith('.html') ? 'html' : 'text'}\n${contentSummary}\n\`\`\`\n\n`;
}

fs.writeFileSync(path.join(root, 'audit-report.md'), report);
console.log('Done writing report');
