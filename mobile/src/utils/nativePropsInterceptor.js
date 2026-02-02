/**
 * Native Props Interceptor
 * Intercepts ALL props being passed to native components to find string booleans
 */

import { UIManager } from 'react-native';

// Save originals
const originalUpdateView = UIManager.updateView;
const originalCreateView = UIManager.createView;
const originalSetChildren = UIManager.setChildren;

// List of props that should be boolean
const BOOLEAN_PROPS = new Set([
  'enabled', 'disabled', 'visible', 'hidden', 'editable', 'multiline',
  'secureTextEntry', 'autoCorrect', 'autoFocus', 'clearButtonMode',
  'allowFontScaling', 'accessible', 'scrollEnabled', 'showsHorizontalScrollIndicator',
  'showsVerticalScrollIndicator', 'removeClippedSubviews', 'collapsable',
  'needsOffscreenAlphaCompositing', 'renderToHardwareTextureAndroid',
  'shouldRasterizeIOS', 'transparent', 'animating', 'hidesWhenStopped',
  'modal', 'hardwareAccelerated', 'statusBarTranslucent', 'value',
  'attributionEnabled', 'logoEnabled', 'compassEnabled', 'rotateEnabled',
  'pitchEnabled', 'scrollEnabled', 'zoomEnabled', 'localizeLabels'
]);

const checkAndFixProps = (props, viewName, location) => {
  if (!props || typeof props !== 'object') return;
  
  Object.keys(props).forEach(key => {
    const value = props[key];
    
    // Check if this prop should be boolean but is a string
    if (BOOLEAN_PROPS.has(key) && typeof value === 'string') {
      console.error(`🚨🚨🚨 FOUND IT! String boolean prop in ${location}`);
      console.error(`  Component: ${viewName}`);
      console.error(`  Prop: ${key}`);
      console.error(`  Value: "${value}" (type: ${typeof value})`);
      console.error(`  All props:`, JSON.stringify(props, null, 2));
      console.trace('Stack trace:');
      
      // Auto-fix by converting to boolean
      if (value === 'true' || value === '1') {
        console.warn(`  ✅ Auto-fixing: converting "${value}" to true`);
        props[key] = true;
      } else if (value === 'false' || value === '0' || value === '') {
        console.warn(`  ✅ Auto-fixing: converting "${value}" to false`);
        props[key] = false;
      }
    }
  });
};

// Override createView (where views are first created)
if (originalCreateView) {
  UIManager.createView = function(reactTag, viewName, rootTag, props) {
    console.log(`📦 Creating view: ${viewName} (tag: ${reactTag})`);
    checkAndFixProps(props, viewName, 'createView');
    return originalCreateView.call(this, reactTag, viewName, rootTag, props);
  };
}

// Override updateView (when props change)
if (originalUpdateView) {
  UIManager.updateView = function(reactTag, viewName, props) {
    console.log(`🔄 Updating view: ${viewName} (tag: ${reactTag})`);
    checkAndFixProps(props, viewName, 'updateView');
    return originalUpdateView.call(this, reactTag, viewName, props);
  };
}

// Override setChildren (when children are added)
if (originalSetChildren) {
  UIManager.setChildren = function(containerTag, reactTags) {
    console.log(`👶 Setting children on container ${containerTag}:`, reactTags);
    return originalSetChildren.call(this, containerTag, reactTags);
  };
}

console.log('✅ Native Props Interceptor installed (createView, updateView, setChildren)');

export default {};
