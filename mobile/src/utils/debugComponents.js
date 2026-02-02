/**
 * Component Prop Logger
 * Wrap components to log when they receive string boolean props
 */
import React from 'react';
import { Switch, TextInput, View, Modal } from 'react-native';

const BOOLEAN_PROPS = [
  'value', 'enabled', 'disabled', 'visible', 'editable', 'multiline',
  'secureTextEntry', 'autoCorrect', 'autoFocus', 'clearButtonMode'
];

const logPropsIfNeeded = (componentName, props) => {
  const issues = [];
  
  Object.keys(props).forEach(key => {
    const value = props[key];
    
    // Check if this is a boolean prop with string value
    if (BOOLEAN_PROPS.includes(key) && typeof value === 'string') {
      issues.push({
        component: componentName,
        prop: key,
        value,
        type: typeof value
      });
    }
  });
  
  if (issues.length > 0) {
    console.group(`🚨 STRING BOOLEAN PROP DETECTED in ${componentName}`);
    issues.forEach(issue => {
      console.error(`  Prop "${issue.prop}" has STRING value: "${issue.value}"`);
      console.error(`  This should be a boolean!`);
    });
    console.trace('Component render stack:');
    console.groupEnd();
  }
};

export const LoggedSwitch = (props) => {
  logPropsIfNeeded('Switch', props);
  return <Switch {...props} />;
};

export const LoggedTextInput = (props) => {
  logPropsIfNeeded('TextInput', props);
  return <TextInput {...props} />;
};

export const LoggedModal = (props) => {
  logPropsIfNeeded('Modal', props);
  return <Modal {...props} />;
};

export const LoggedView = (props) => {
  if (props.visible !== undefined) {
    logPropsIfNeeded('View', props);
  }
  return <View {...props} />;
};
