/**
 * Test imports to find which file has the BORDER_RADIUS error
 */

console.log('Testing HomeScreen...');
try {
  require('./src/screens/Home/HomeScreen');
  console.log('✓ HomeScreen OK');
} catch (e) {
  console.log('✗ HomeScreen ERROR:', e.message);
}

console.log('\nTesting MapScreen...');
try {
  require('./src/screens/Map/MapScreen');
  console.log('✓ MapScreen OK');
} catch (e) {
  console.log('✗ MapScreen ERROR:', e.message);
}

console.log('\nTesting PinDropScreen...');
try {
  require('./src/screens/Pins/PinDropScreen');
  console.log('✓ PinDropScreen OK');
} catch (e) {
  console.log('✗ PinDropScreen ERROR:', e.message);
}

console.log('\nTesting TripSummaryScreen...');
try {
  require('./src/screens/Summary/TripSummaryScreen');
  console.log('✓ TripSummaryScreen OK');
} catch (e) {
  console.log('✗ TripSummaryScreen ERROR:', e.message);
}

console.log('\nTesting OfflineDownloadScreen...');
try {
  require('./src/screens/Offline/OfflineDownloadScreen');
  console.log('✓ OfflineDownloadScreen OK');
} catch (e) {
  console.log('✗ OfflineDownloadScreen ERROR:', e.message);
}

console.log('\n=== TEST COMPLETE ===');
