import React from 'react';
import PinDropScreen from './PinDropScreen';

// Re-export PinDropScreen as PinFormScreen for navigation compatibility
const PinFormScreen = (props) => {
  return <PinDropScreen {...props} />;
};

export default PinFormScreen;
