#!/usr/bin/env node

/**
 * Comprehensive Scanner for String-to-Boolean Type Errors
 * 
 * This script scans the mobile folder for potential sources of
 * "java.lang.String cannot be cast to java.lang.Boolean" errors
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for output
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

// Common boolean props in React Native components
const BOOLEAN_PROPS = [
  'disabled', 'enabled', 'visible', 'hidden', 'editable', 'multiline',
  'secureTextEntry', 'autoCorrect', 'autoCapitalize', 'clearButtonMode',
  'showSoftInputOnFocus', 'spellCheck', 'autoFocus', 'blurOnSubmit',
  'caretHidden', 'contextMenuHidden', 'selectTextOnFocus', 'allowFontScaling',
  'adjustsFontSizeToFit', 'minimumFontScale', 'suppressHighlighting',
  'accessible', 'accessibilityElementsHidden', 'importantForAccessibility',
  'scrollEnabled', 'keyboardShouldPersistTaps', 'nestedScrollEnabled',
  'horizontal', 'inverted', 'pagingEnabled', 'scrollEventThrottle',
  'showsHorizontalScrollIndicator', 'showsVerticalScrollIndicator',
  'stickyHeaderIndices', 'automaticallyAdjustContentInsets',
  'bounces', 'bouncesZoom', 'alwaysBounceHorizontal', 'alwaysBounceVertical',
  'centerContent', 'directionalLockEnabled', 'canCancelContentTouches',
  'indicatorStyle', 'maximumZoomScale', 'minimumZoomScale',
  'pinchGestureEnabled', 'scrollToOverflowEnabled', 'scrollsToTop',
  'snapToAlignment', 'snapToEnd', 'snapToStart', 'zoomScale',
  'removeClippedSubviews', 'renderToHardwareTextureAndroid',
  'shouldRasterizeIOS', 'collapsable', 'needsOffscreenAlphaCompositing',
  'activeOpacity', 'underlayColor', 'delayLongPress', 'delayPressIn',
  'delayPressOut', 'hitSlop', 'pressRetentionOffset',
  'androidRipple', 'hasTVPreferredFocus', 'nextFocusDown', 'nextFocusForward',
  'nextFocusLeft', 'nextFocusRight', 'nextFocusUp', 'tvParallaxProperties',
  'animated', 'indeterminate', 'animating', 'hidesWhenStopped',
  'suppressColorAndroid', 'rtl', 'selected', 'modal', 'transparent',
  'hardwareAccelerated', 'statusBarTranslucent', 'supportedOrientations',
  'onDismiss', 'onShow', 'presentationStyle', 'pointerEvents'
];

// Files and directories to ignore
const IGNORE_PATTERNS = [
  'node_modules',
  'android/build',
  'ios/build',
  '.gradle',
  'coverage',
  '__tests__',
  '.git',
  'dist',
  'build'
];

// File extensions to scan
const VALID_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json'];

let findings = [];
let filesScanned = 0;
let totalIssues = 0;

/**
 * Check if path should be ignored
 */
function shouldIgnore(filePath) {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    
    if (shouldIgnore(fullPath)) {
      return;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      const ext = path.extname(file);
      if (VALID_EXTENSIONS.includes(ext)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

/**
 * Check for string boolean values in JSX/TSX props
 * Pattern: prop="true" or prop="false" or prop='true' or prop='false'
 */
function checkStringBooleanProps(content, filePath) {
  const issues = [];
  const lines = content.split('\n');
  
  BOOLEAN_PROPS.forEach(prop => {
    // Check for prop="true" or prop="false" patterns
    const patterns = [
      new RegExp(`\\b${prop}\\s*=\\s*["']true["']`, 'gi'),
      new RegExp(`\\b${prop}\\s*=\\s*["']false["']`, 'gi'),
      new RegExp(`\\b${prop}\\s*=\\s*["']1["']`, 'gi'),
      new RegExp(`\\b${prop}\\s*=\\s*["']0["']`, 'gi'),
    ];

    patterns.forEach(pattern => {
      let match;
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          issues.push({
            file: filePath,
            line: index + 1,
            code: line.trim(),
            issue: `Boolean prop "${prop}" has string value`,
            severity: 'HIGH'
          });
        }
      });
    });
  });

  return issues;
}

/**
 * Check for variables assigned string booleans that might be passed as props
 */
function checkVariableAssignments(content, filePath) {
  const issues = [];
  const lines = content.split('\n');
  
  const patterns = [
    /const\s+\w+\s*=\s*["']true["']/gi,
    /let\s+\w+\s*=\s*["']true["']/gi,
    /var\s+\w+\s*=\s*["']true["']/gi,
    /const\s+\w+\s*=\s*["']false["']/gi,
    /let\s+\w+\s*=\s*["']false["']/gi,
    /var\s+\w+\s*=\s*["']false["']/gi,
  ];

  lines.forEach((line, index) => {
    patterns.forEach(pattern => {
      if (pattern.test(line)) {
        issues.push({
          file: filePath,
          line: index + 1,
          code: line.trim(),
          issue: 'Variable assigned string boolean value (potential prop value)',
          severity: 'MEDIUM'
        });
      }
    });
  });

  return issues;
}

/**
 * Check JSON configuration files for string boolean values
 */
function checkJSONBooleans(content, filePath) {
  const issues = [];
  
  try {
    const json = JSON.parse(content);
    
    function traverse(obj, path = '') {
      for (let key in obj) {
        const currentPath = path ? `${path}.${key}` : key;
        const value = obj[key];
        
        // Check if value is a string that looks like a boolean
        if (typeof value === 'string') {
          if (value === 'true' || value === 'false' || value === '1' || value === '0') {
            // Check if the key suggests it should be boolean
            const keyLower = key.toLowerCase();
            if (keyLower.includes('enable') || keyLower.includes('disable') || 
                keyLower.includes('show') || keyLower.includes('hide') ||
                keyLower.includes('is') || keyLower.includes('has') ||
                BOOLEAN_PROPS.some(prop => prop.toLowerCase() === keyLower)) {
              issues.push({
                file: filePath,
                line: 'N/A',
                code: `"${currentPath}": "${value}"`,
                issue: `JSON property "${currentPath}" has string value "${value}" but might expect boolean`,
                severity: 'HIGH'
              });
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          traverse(value, currentPath);
        }
      }
    }
    
    traverse(json);
  } catch (e) {
    // Invalid JSON, skip
  }
  
  return issues;
}

/**
 * Check for props passed from state/props that might be strings
 */
function checkDynamicProps(content, filePath) {
  const issues = [];
  const lines = content.split('\n');
  
  BOOLEAN_PROPS.forEach(prop => {
    // Check for patterns like: prop={someVariable} where someVariable might be from API/storage
    const pattern = new RegExp(`\\b${prop}\\s*=\\s*\\{[^}]+\\}`, 'gi');
    
    lines.forEach((line, index) => {
      const match = line.match(pattern);
      if (match) {
        // Check if there's any string conversion nearby
        if (line.includes('.toString()') || line.includes('String(') || 
            line.includes("''") || line.includes('""') || line.includes('`')) {
          issues.push({
            file: filePath,
            line: index + 1,
            code: line.trim(),
            issue: `Boolean prop "${prop}" might receive string value from dynamic source`,
            severity: 'MEDIUM'
          });
        }
      }
    });
  });
  
  return issues;
}

/**
 * Check for AsyncStorage values used as props without parsing
 */
function checkAsyncStorageUsage(content, filePath) {
  const issues = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (line.includes('AsyncStorage.getItem') || line.includes('@react-native-async-storage')) {
      // Check if the value is used without JSON.parse or explicit boolean conversion
      const nextLines = lines.slice(index, Math.min(index + 5, lines.length)).join(' ');
      
      if (!nextLines.includes('JSON.parse') && 
          !nextLines.includes('Boolean(') && 
          !nextLines.includes('===') &&
          BOOLEAN_PROPS.some(prop => nextLines.includes(prop))) {
        issues.push({
          file: filePath,
          line: index + 1,
          code: line.trim(),
          issue: 'AsyncStorage value might be used as boolean prop without proper conversion',
          severity: 'HIGH'
        });
      }
    }
  });
  
  return issues;
}

/**
 * Check for API response values used without type checking
 */
function checkAPIResponseUsage(content, filePath) {
  const issues = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Look for common API patterns
    if (line.includes('.data.') || line.includes('response.') || line.includes('result.')) {
      const nextLines = lines.slice(index, Math.min(index + 5, lines.length)).join(' ');
      
      BOOLEAN_PROPS.forEach(prop => {
        if (nextLines.includes(`${prop}=`) && !nextLines.includes('Boolean(') && !nextLines.includes('!!')) {
          issues.push({
            file: filePath,
            line: index + 1,
            code: line.trim(),
            issue: `API response might be used for boolean prop "${prop}" without type conversion`,
            severity: 'MEDIUM'
          });
        }
      });
    }
  });
  
  return issues;
}

/**
 * Scan a single file
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath);
    let fileIssues = [];

    if (ext === '.json') {
      fileIssues = checkJSONBooleans(content, filePath);
    } else {
      fileIssues = [
        ...checkStringBooleanProps(content, filePath),
        ...checkVariableAssignments(content, filePath),
        ...checkDynamicProps(content, filePath),
        ...checkAsyncStorageUsage(content, filePath),
        ...checkAPIResponseUsage(content, filePath)
      ];
    }

    if (fileIssues.length > 0) {
      findings.push(...fileIssues);
      totalIssues += fileIssues.length;
    }

    filesScanned++;
  } catch (error) {
    console.error(`${colors.red}Error scanning ${filePath}: ${error.message}${colors.reset}`);
  }
}

/**
 * Generate report
 */
function generateReport() {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}Boolean Type Error Scanner - Report${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
  
  console.log(`${colors.blue}Files Scanned: ${filesScanned}${colors.reset}`);
  console.log(`${colors.yellow}Total Issues Found: ${totalIssues}${colors.reset}\n`);

  if (findings.length === 0) {
    console.log(`${colors.green}✓ No potential issues found!${colors.reset}\n`);
    return;
  }

  // Group by severity
  const high = findings.filter(f => f.severity === 'HIGH');
  const medium = findings.filter(f => f.severity === 'MEDIUM');

  if (high.length > 0) {
    console.log(`${colors.bold}${colors.red}HIGH SEVERITY ISSUES (${high.length}):${colors.reset}`);
    console.log(`${colors.red}${'─'.repeat(80)}${colors.reset}\n`);
    
    high.forEach((issue, index) => {
      console.log(`${colors.red}${index + 1}. ${issue.issue}${colors.reset}`);
      console.log(`   ${colors.cyan}File:${colors.reset} ${issue.file}`);
      console.log(`   ${colors.cyan}Line:${colors.reset} ${issue.line}`);
      console.log(`   ${colors.cyan}Code:${colors.reset} ${issue.code}`);
      console.log('');
    });
  }

  if (medium.length > 0) {
    console.log(`${colors.bold}${colors.yellow}MEDIUM SEVERITY ISSUES (${medium.length}):${colors.reset}`);
    console.log(`${colors.yellow}${'─'.repeat(80)}${colors.reset}\n`);
    
    medium.forEach((issue, index) => {
      console.log(`${colors.yellow}${index + 1}. ${issue.issue}${colors.reset}`);
      console.log(`   ${colors.cyan}File:${colors.reset} ${issue.file}`);
      console.log(`   ${colors.cyan}Line:${colors.reset} ${issue.line}`);
      console.log(`   ${colors.cyan}Code:${colors.reset} ${issue.code}`);
      console.log('');
    });
  }

  // Summary by file
  console.log(`${colors.bold}${colors.magenta}SUMMARY BY FILE:${colors.reset}`);
  console.log(`${colors.magenta}${'─'.repeat(80)}${colors.reset}\n`);
  
  const byFile = {};
  findings.forEach(f => {
    if (!byFile[f.file]) {
      byFile[f.file] = [];
    }
    byFile[f.file].push(f);
  });

  Object.keys(byFile).sort().forEach(file => {
    const relPath = path.relative(process.cwd(), file);
    console.log(`${colors.magenta}${relPath}${colors.reset} - ${byFile[file].length} issue(s)`);
  });

  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
  
  // Recommendations
  console.log(`${colors.bold}${colors.green}RECOMMENDATIONS:${colors.reset}\n`);
  console.log(`${colors.green}1.${colors.reset} Replace string values with actual booleans:`);
  console.log(`   ${colors.yellow}❌ enabled="true"${colors.reset}`);
  console.log(`   ${colors.green}✓ enabled={true}${colors.reset}\n`);
  
  console.log(`${colors.green}2.${colors.reset} Convert AsyncStorage values:`);
  console.log(`   ${colors.yellow}❌ const value = await AsyncStorage.getItem('key')${colors.reset}`);
  console.log(`   ${colors.green}✓ const value = JSON.parse(await AsyncStorage.getItem('key'))${colors.reset}\n`);
  
  console.log(`${colors.green}3.${colors.reset} Ensure API responses are properly typed:`);
  console.log(`   ${colors.yellow}❌ <Component enabled={response.data.enabled} />${colors.reset}`);
  console.log(`   ${colors.green}✓ <Component enabled={Boolean(response.data.enabled)} />${colors.reset}\n`);
  
  console.log(`${colors.green}4.${colors.reset} Use explicit boolean conversion:`);
  console.log(`   ${colors.green}✓ !!value or Boolean(value)${colors.reset}\n`);
}

/**
 * Save report to file
 */
function saveReport() {
  const reportPath = path.join(__dirname, 'boolean-error-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    filesScanned,
    totalIssues,
    findings: findings.map(f => ({
      ...f,
      file: path.relative(process.cwd(), f.file)
    }))
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`${colors.green}✓ Detailed report saved to: ${reportPath}${colors.reset}\n`);
}

/**
 * Main execution
 */
function main() {
  const mobileDir = __dirname;
  
  console.log(`${colors.bold}${colors.cyan}Scanning mobile folder for boolean type errors...${colors.reset}\n`);
  console.log(`${colors.blue}Directory: ${mobileDir}${colors.reset}\n`);
  
  const files = getAllFiles(mobileDir);
  
  console.log(`${colors.blue}Found ${files.length} files to scan${colors.reset}\n`);
  
  files.forEach(file => {
    scanFile(file);
  });
  
  generateReport();
  saveReport();
}

// Run the scanner
main();
