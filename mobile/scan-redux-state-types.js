#!/usr/bin/env node

/**
 * Enhanced Scanner - Redux State & Prop Type Analysis
 * 
 * Specifically checks for state values and props that might be
 * incorrectly typed (string instead of boolean)
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const findings = [];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Check for useState with string boolean
    if (/useState\s*\(\s*['"]true['"]|useState\s*\(\s*['"]false['"]/gi.test(line)) {
      findings.push({
        file: path.relative(process.cwd(), filePath),
        line: index + 1,
        code: line.trim(),
        issue: 'useState initialized with STRING boolean',
        severity: 'CRITICAL'
      });
    }
    
    // Check for state properties initialized as strings
    if (/:\s*['"]true['"]|:\s*['"]false['"]/gi.test(line) && 
        (line.includes('initialState') || line.includes('defaultState') || line.includes('state:'))) {
      findings.push({
        file: path.relative(process.cwd(), filePath),
        line: index + 1,
        code: line.trim(),
        issue: 'State property initialized with STRING boolean',
        severity: 'CRITICAL'
      });
    }
    
    // Check for action.payload being used directly without type check
    if (line.includes('action.payload') && !line.includes('Boolean(') && !line.includes('!!')) {
      const nextLine = lines[index + 1] || '';
      if (/(enabled|disabled|visible|hidden|active)/i.test(line + nextLine)) {
        findings.push({
          file: path.relative(process.cwd(), filePath),
          line: index + 1,
          code: line.trim(),
          issue: 'action.payload used without boolean conversion',
          severity: 'HIGH'
        });
      }
    }
    
    // Check for component props that might receive state values
    if (line.includes('={') && /(enabled|disabled|visible|editable|multiline|secureTextEntry)/i.test(line)) {
      const match = line.match(/(\w+)=\{([^}]+)\}/);
      if (match && !match[2].includes('Boolean') && !match[2].includes('!!') && 
          !match[2].includes('true') && !match[2].includes('false')) {
        findings.push({
          file: path.relative(process.cwd(), filePath),
          line: index + 1,
          code: line.trim(),
          issue: `Boolean prop might receive untyped value: ${match[1]}={${match[2]}}`,
          severity: 'MEDIUM'
        });
      }
    }
  });
}

function getAllJSFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('android') && !item.includes('ios')) {
      files = files.concat(getAllJSFiles(fullPath));
    } else if (stat.isFile() && /\.(js|jsx|ts|tsx)$/.test(item)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

console.log(`${colors.bold}${colors.cyan}Redux State & Prop Type Scanner${colors.reset}\n`);

const mobileDir = path.join(__dirname, 'src');
const files = getAllJSFiles(mobileDir);

files.forEach(scanFile);

if (findings.length === 0) {
  console.log(`${colors.green}✓ No issues found${colors.reset}\n`);
} else {
  console.log(`${colors.red}Found ${findings.length} potential issues:${colors.reset}\n`);
  
  // Group by severity
  const critical = findings.filter(f => f.severity === 'CRITICAL');
  const high = findings.filter(f => f.severity === 'HIGH');
  const medium = findings.filter(f => f.severity === 'MEDIUM');
  
  [
    { title: 'CRITICAL', items: critical, color: colors.red },
    { title: 'HIGH', items: high, color: colors.yellow },
    { title: 'MEDIUM', items: medium, color: colors.blue }
  ].forEach(({ title, items, color }) => {
    if (items.length > 0) {
      console.log(`${colors.bold}${color}${title} (${items.length}):${colors.reset}`);
      items.forEach((f, i) => {
        console.log(`${color}${i + 1}. [${f.file}:${f.line}]${colors.reset}`);
        console.log(`   ${f.issue}`);
        console.log(`   ${color}${f.code}${colors.reset}\n`);
      });
    }
  });
}

fs.writeFileSync('redux-type-check-report.json', JSON.stringify({ findings }, null, 2));
console.log(`${colors.green}Report saved to: redux-type-check-report.json${colors.reset}`);
