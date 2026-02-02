import React from 'react';
import {
  Box,
  Typography,
  Alert
} from '@mui/material';
import {
  Info as InfoIcon
} from '@mui/icons-material';
import AlertDistanceConfig from '../Settings/AlertDistanceConfig';

const AlertConfiguration = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
        <Typography variant="body2">
          Alert configuration settings are managed in the Settings page. 
          This view provides quick access to alert distance thresholds.
        </Typography>
      </Alert>

      <AlertDistanceConfig />
    </Box>
  );
};

export default AlertConfiguration;
