/**
 * Theme Structure Test
 * Run this to validate the theme object structure
 */

const theme = require('./src/constants/theme').default;

console.log('=== THEME STRUCTURE TEST ===\n');

console.log('✓ Theme object exists:', !!theme);
console.log('✓ theme.colors exists:', !!theme?.colors);
console.log('✓ theme.spacing exists:', !!theme?.spacing);
console.log('✓ theme.borderRadius exists:', !!theme?.borderRadius);
console.log('✓ theme.fontSize exists:', !!theme?.fontSize);
console.log('✓ theme.fontWeight exists:', !!theme?.fontWeight);
console.log('✓ theme.shadows exists:', !!theme?.shadows);

console.log('\n=== THEME.COLORS ===');
console.log(theme?.colors);

console.log('\n=== THEME.SPACING ===');
console.log(theme?.spacing);

console.log('\n=== THEME.BORDER_RADIUS ===');
console.log(theme?.borderRadius);

console.log('\n=== CHECKING OLD EXPORTS (should be undefined) ===');
const oldExports = require('./src/constants/theme');
console.log('BORDER_RADIUS constant:', oldExports.BORDER_RADIUS);
console.log('COLORS constant:', oldExports.COLORS);
console.log('SPACING constant:', oldExports.SPACING);
console.log('FONT_SIZES constant:', oldExports.FONT_SIZES);
console.log('FONT_WEIGHTS constant:', oldExports.FONT_WEIGHTS);
console.log('SHADOWS constant:', oldExports.SHADOWS);

console.log('\n=== TEST COMPLETE ===');
