import React from 'react';
import OfflineDownloadScreen from './OfflineDownloadScreen';

// Re-export OfflineDownloadScreen as OfflineScreen for navigation compatibility
const OfflineScreen = (props) => {
  return <OfflineDownloadScreen {...props} />;
};

export default OfflineScreen;
