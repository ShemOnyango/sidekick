/**
 * Higher-Order Component to catch string boolean props
 */
import React, { useEffect } from 'react';

const BOOLEAN_PROPS = new Set([
  'enabled', 'disabled', 'visible', 'hidden', 'editable', 'multiline',
  'secureTextEntry', 'autoCorrect', 'autoFocus', 'clearButtonMode',
  'allowFontScaling', 'accessible', 'scrollEnabled', 'transparent',
  'modal', 'animating', 'selected', 'value'
]);

export const withStrictProps = (WrappedComponent) => {
  const ComponentWithStrictProps = (props) => {
    useEffect(() => {
      const componentName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
      
      Object.entries(props).forEach(([key, value]) => {
        // Check if this is a string boolean
        if (typeof value === 'string' && (value === 'true' || value === 'false')) {
          console.error(`🚨 STRING BOOLEAN DETECTED in ${componentName}`);
          console.error(`  Prop: ${key}`);
          console.error(`  Value: "${value}" (should be boolean)`);
          console.trace('Source:');
        }
        
        // Check if known boolean prop has string value
        if (BOOLEAN_PROPS.has(key) && typeof value === 'string') {
          console.error(`🚨 BOOLEAN PROP HAS STRING VALUE in ${componentName}`);
          console.error(`  Prop: ${key}`);
          console.error(`  Value: "${value}" (type: ${typeof value})`);
          console.trace('Source:');
        }
      });
    }, [props]);

    return <WrappedComponent {...props} />;
  };

  ComponentWithStrictProps.displayName = `withStrictProps(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return ComponentWithStrictProps;
};

export default withStrictProps;
