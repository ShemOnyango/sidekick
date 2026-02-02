import React, { useState } from 'react';
import { Box, Paper, Tabs, Tab } from '@mui/material';
import ActiveAuthorities from './ActiveAuthorities';
import AuthorityHistory from './AuthorityHistory';
import OverlapVisualizer from './OverlapVisualizer';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`authority-tabpanel-${index}`}
      aria-labelledby={`authority-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const Authorities = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
            },
            '& .Mui-selected': {
              color: '#FFD100',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#FFD100',
            },
          }}
        >
          <Tab label="Active Authorities" />
          <Tab label="Authority History" />
          <Tab label="Overlap Visualizer" />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          <ActiveAuthorities />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <AuthorityHistory />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <OverlapVisualizer />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default Authorities;
