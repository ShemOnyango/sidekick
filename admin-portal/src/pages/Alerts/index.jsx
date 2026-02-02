import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  History as HistoryIcon,
  Settings as SettingsIcon,
  Send as SendIcon
} from '@mui/icons-material';
import AlertHistory from './AlertHistory';
import AlertConfiguration from './AlertConfiguration';
import TestAlerts from './TestAlerts';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ paddingTop: '24px' }}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const AlertsManagement = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (_event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Alert Management
        </Typography>
        <Typography variant="body2" color="textSecondary">
          View alert history, configure alert settings, and test alert delivery
        </Typography>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="inherit"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#1E1E1E' }}
        >
          <Tab 
            icon={<HistoryIcon />} 
            label="Alert History" 
            iconPosition="start"
          />
          <Tab 
            icon={<SettingsIcon />} 
            label="Configuration" 
            iconPosition="start"
          />
          <Tab 
            icon={<SendIcon />} 
            label="Test Alerts" 
            iconPosition="start"
          />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          <AlertHistory />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <AlertConfiguration />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <TestAlerts />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default AlertsManagement;
