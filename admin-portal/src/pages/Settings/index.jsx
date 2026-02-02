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
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Category as CategoryIcon,
  Style as StyleIcon,
  Mail as MailIcon
} from '@mui/icons-material';
import AuthorityFieldConfig from './AuthorityFieldConfig';
import AlertDistanceConfig from './AlertDistanceConfig';
import PinTypeManagement from './PinTypeManagement';
import BrandingEditor from './BrandingEditor';
import EmailTemplateEditor from './EmailTemplateEditor';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ paddingTop: '24px' }}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const Settings = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (_event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          System Settings
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Configure all system parameters, terminology, and branding
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
            icon={<SettingsIcon />} 
            label="Authority Fields" 
            iconPosition="start"
          />
          <Tab 
            icon={<NotificationsIcon />} 
            label="Alert Distances" 
            iconPosition="start"
          />
          <Tab 
            icon={<CategoryIcon />} 
            label="Pin Types" 
            iconPosition="start"
          />
          <Tab 
            icon={<StyleIcon />} 
            label="Branding" 
            iconPosition="start"
          />
          <Tab 
            icon={<MailIcon />} 
            label="Email Templates" 
            iconPosition="start"
          />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          <AuthorityFieldConfig />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <AlertDistanceConfig />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <PinTypeManagement />
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <BrandingEditor />
        </TabPanel>

        <TabPanel value={currentTab} index={4}>
          <EmailTemplateEditor />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default Settings;
