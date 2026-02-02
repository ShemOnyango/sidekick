// admin-portal/src/pages/Analytics/AnalyticsDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
} from '@mui/material';
import {
  DateRange as DateRangeIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  SafetyCheck as SafetyIcon,
} from '@mui/icons-material';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, subDays } from 'date-fns';
import { analyticsService } from '../../services/analyticsService';

const COLORS = ['#FFD100', '#4CAF50', '#2196F3', '#9C27B0', '#FF5722'];

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });
  const [reportType, setReportType] = useState('safety');
  const [tabValue, setTabValue] = useState(0);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange, reportType]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const agencyId = 1; // Get from auth context
      const data = await analyticsService.getDashboardStats(
        agencyId,
        dateRange.startDate,
        dateRange.endDate
      );
      
      const trend = await analyticsService.getTrendData(agencyId, 'authorities', '7d');
      
      setAnalyticsData(data);
      setTrendData(trend);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleExport = async (format) => {
    try {
      const agencyId = 1;
      const report = await analyticsService.generateReport(
        agencyId,
        reportType,
        dateRange.startDate,
        dateRange.endDate,
        { format }
      );
      
      // Trigger download
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${reportType}-${formatDate(new Date())}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const renderSafetyMetrics = () => {
    if (!analyticsData?.alertStats) return null;

    const { alertStats, recentActivity } = analyticsData;

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Alert Trends
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#FFD100" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Alert Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Critical', value: alertStats.critical_alerts || 0 },
                      { name: 'Warning', value: alertStats.warning_alerts || 0 },
                      { name: 'Info', value: alertStats.informational_alerts || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#FF5252" />
                    <Cell fill="#FFD100" />
                    <Cell fill="#4CAF50" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Safety Incidents
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Severity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentActivity
                      ?.filter(activity => activity.Action_Type.includes('ALERT'))
                      .slice(0, 10)
                      .map((activity) => (
                        <TableRow key={activity.Created_Date} hover>
                          <TableCell>
                            {format(new Date(activity.Created_Date), 'MM/dd HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              size="small" 
                              label={activity.Action_Type.replace('_', ' ')}
                              color={
                                activity.Action_Type.includes('CRITICAL') ? 'error' : 
                                activity.Action_Type.includes('WARNING') ? 'warning' : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>{activity.Employee_Name}</TableCell>
                          <TableCell>
                            {activity.Table_Name} #{activity.Record_ID}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              size="small" 
                              label={
                                activity.Action_Type.includes('CRITICAL') ? 'High' : 
                                activity.Action_Type.includes('WARNING') ? 'Medium' : 'Low'
                              }
                              color={
                                activity.Action_Type.includes('CRITICAL') ? 'error' : 
                                activity.Action_Type.includes('WARNING') ? 'warning' : 'default'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderOperationsMetrics = () => {
    if (!analyticsData?.authorityStats) return null;

    const { authorityStats, userStats } = analyticsData;

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Authorities
                  </Typography>
                  <Typography variant="h4">
                    {authorityStats.total_authorities || 0}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="textSecondary">
                {authorityStats.active_authorities || 0} active
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SafetyIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Avg. Authority Duration
                  </Typography>
                  <Typography variant="h4">
                    {Math.round(authorityStats.avg_duration_minutes || 0)} min
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Track vs Lone Worker ratio
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon color="warning" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Today's Authorities
                  </Typography>
                  <Typography variant="h4">
                    {authorityStats.authorities_today || 0}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="textSecondary">
                {alertStats?.alerts_today || 0} alerts today
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h1">
              Analytics Dashboard
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadAnalyticsData}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => handleExport('json')}
              >
                Export Report
              </Button>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date"
                    value={dateRange.startDate}
                    onChange={(date) => setDateRange(prev => ({ ...prev, startDate: date }))}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="End Date"
                    value={dateRange.endDate}
                    onChange={(date) => setDateRange(prev => ({ ...prev, endDate: date }))}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={reportType}
                  label="Report Type"
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <MenuItem value="safety">Safety Report</MenuItem>
                  <MenuItem value="operations">Operations Report</MenuItem>
                  <MenuItem value="compliance">Compliance Report</MenuItem>
                  <MenuItem value="usage">Usage Report</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Safety Metrics" />
          <Tab label="Operations" />
          <Tab label="System Health" />
          <Tab label="User Activity" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && renderSafetyMetrics()}
      {tabValue === 1 && renderOperationsMetrics()}
      {/* Add more tab content as needed */}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default AnalyticsDashboard;