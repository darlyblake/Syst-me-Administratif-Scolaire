const fs = require('fs');
let content = fs.readFileSync('hooks/use-parent-portal.ts', 'utf8');
content = content.replace('useState<ParentDocument[]>()', 'useState<ParentDocument[]>([])');
fs.writeFileSync('hooks/use-parent-portal.ts', content);
