const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'services');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('safeLocalStorage')) {
    const helper = `const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;\n`;
    content = helper + content.replace(/localStorage\./g, 'safeLocalStorage.');
    fs.writeFileSync(filePath, content);
  }
});
console.log("Patch completed");
