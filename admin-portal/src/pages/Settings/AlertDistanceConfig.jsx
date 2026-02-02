import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import api from '../../services/api';

const AlertDistanceConfig = () => {
  const { user } = useSelector((state) => state.auth);
  // Use the logged-in user's agency ID
  const agencyId = user?.Agency_ID || user?.agencyId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [configurations, setConfigurations] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);

  const [formData, setFormData] = useState({
    configType: 'Proximity_Alert',
    alertLevel: 'warning',
    distanceMiles: 0.25,
    timeMinutes: null,
    isEnabled: true,
    description: ''
  });

  useEffect(() => {
    loadConfigurations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const loadConfigurations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/alerts/config/${agencyId}`);
      if (response.data.success) {
        setConfigurations(response.data.data.configurations || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load alert configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (config = null) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        configType: config.Config_Type,
        alertLevel: config.Alert_Level,
        distanceMiles: config.Distance_Miles,
        timeMinutes: config.Time_Minutes,
        isEnabled: config.Is_Enabled,
        description: config.Description || ''
      });
    } else {
      setEditingConfig(null);
      setFormData({
        configType: 'Proximity_Alert',
        alertLevel: 'warning',
        distanceMiles: 0.25,
        timeMinutes: null,
        isEnabled: true,
        description: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingConfig(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let response;
      if (editingConfig) {
        response = await api.put(
          `/config/agencies/${agencyId}/alert-configs/${editingConfig.Config_ID}`,
          formData
        );
      } else {
        response = await api.post(`/config/agencies/${agencyId}/alert-configs`, formData);
      }

      if (response.data.success) {
        setSuccess(
          editingConfig 
            ? 'Alert configuration updated successfully! Client will be notified via email.'
            : 'Alert configuration created successfully! Client will be notified via email.'
        );
        handleCloseDialog();
        loadConfigurations();
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (configId) => {
    if (!window.confirm('Are you sure you want to delete this alert configuration?')) {
      return;
    }

    try {
      const response = await api.delete(`/config/agencies/${agencyId}/alert-configs/${configId}`);
      if (response.data.success) {
        setSuccess('Alert configuration deleted successfully!');
        loadConfigurations();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete configuration');
    }
  };

  const getAlertLevelColor = (level) => {
    const colors = {
      'critical': 'error',
      'warning': 'warning',
      'informational': 'info'
    };
    return colors[level] || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Alert Distance Configuration
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Configure proximity alert thresholds (0.25, 0.5, 0.75, 1.0 mile ranges)
          </Typography>
        </Box>
        <Box>
          <Tooltip title="Reload">
            <IconButton onClick={loadConfigurations} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ ml: 1 }}
          >
            Add Alert Config
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
        <Typography variant="body2">
          <strong>Client Requirement:</strong> Standard proximity distances are 0.25, 0.5, 0.75, and 1.0 miles. 
          All threshold changes require client approval and will trigger email notification.
        </Typography>
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#FFD100' }}>
              <TableCell><strong>Config Type</strong></TableCell>
              <TableCell><strong>Alert Level</strong></TableCell>
              <TableCell><strong>Distance (Miles)</strong></TableCell>
              <TableCell><strong>Time (Minutes)</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {configurations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                  <Typography color="textSecondary">
                    No alert configurations found. Click "Add Alert Config" to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              configurations.map((config) => (
                <TableRow key={config.Config_ID} hover>
                  <TableCell>{config.Config_Type}</TableCell>
                  <TableCell>
                    <Chip
                      label={config.Alert_Level}
                      color={getAlertLevelColor(config.Alert_Level)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {config.Distance_Miles ? `${config.Distance_Miles} mi` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {config.Time_Minutes ? `${config.Time_Minutes} min` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={config.Is_Enabled ? 'Enabled' : 'Disabled'}
                      color={config.Is_Enabled ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{config.Description || 'N/A'}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenDialog(config)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(config.Config_ID)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingConfig ? 'Edit Alert Configuration' : 'Add Alert Configuration'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Config Type</InputLabel>
                <Select
                  value={formData.configType}
                  label="Config Type"
                  onChange={(e) => setFormData({ ...formData, configType: e.target.value })}
                >
                  <MenuItem value="Proximity_Alert">Proximity Alert</MenuItem>
                  <MenuItem value="Boundary_Alert">Boundary Alert</MenuItem>
                  <MenuItem value="Time_Alert">Time Alert</MenuItem>
                  <MenuItem value="Speed_Alert">Speed Alert</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Alert Level</InputLabel>
                <Select
                  value={formData.alertLevel}
                  label="Alert Level"
                  onChange={(e) => setFormData({ ...formData, alertLevel: e.target.value })}
                >
                  <MenuItem value="informational">Informational</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Distance (Miles)"
                type="number"
                value={formData.distanceMiles || ''}
                onChange={(e) => setFormData({ ...formData, distanceMiles: parseFloat(e.target.value) })}
                inputProps={{ step: 0.25, min: 0 }}
                helperText="Standard: 0.25, 0.5, 0.75, 1.0"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Time (Minutes)"
                type="number"
                value={formData.timeMinutes || ''}
                onChange={(e) => setFormData({ ...formData, timeMinutes: parseInt(e.target.value) || null })}
                inputProps={{ min: 0 }}
                helperText="Optional"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.isEnabled}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.value })}
                >
                  <MenuItem value={true}>Enabled</MenuItem>
                  <MenuItem value={false}>Disabled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {editingConfig ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlertDistanceConfig;
