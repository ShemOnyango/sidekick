import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const AgencyDetails = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Agency Details
        </Typography>
        <Typography variant="body1" color="textSecondary">
          This page will display detailed information about a specific agency.
        </Typography>
      </Paper>
    </Box>
  );
};

export default AgencyDetails;
