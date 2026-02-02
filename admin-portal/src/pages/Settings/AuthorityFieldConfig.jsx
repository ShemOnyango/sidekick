import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import api from '../../services/api';

const AuthorityFieldConfig = () => {
  const { user } = useSelector((state) => state.auth);
  // Use the logged-in user's agency ID
  const agencyId = user?.Agency_ID || user?.agencyId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [fieldConfigs, setFieldConfigs] = useState({});

  useEffect(() => {
    loadFieldConfigurations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const loadFieldConfigurations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/config/agencies/${agencyId}/authority-config/fields`);
      if (response.data.success) {
        setFieldConfigs(response.data.data.fieldConfigurations || {});
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load field configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName, property, value) => {
    setFieldConfigs(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        [property]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.put(`/config/agencies/${agencyId}/authority-config/fields`, {
        fieldConfigurations: fieldConfigs
      });

      if (response.data.success) {
        setSuccess('Authority field configurations saved successfully! Client will be notified via email.');
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save configurations');
    } finally {
      setSaving(false);
    }
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
            Authority Field Configuration
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Customize field labels and requirements for authority data entry
          </Typography>
        </Box>
        <Box>
          <Tooltip title="Reload">
            <IconButton onClick={loadFieldConfigurations} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            sx={{ ml: 1 }}
          >
            Save Changes
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
          <strong>Important:</strong> Any changes to field configurations will trigger an email notification to the client (Ryan Medlin) for approval.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {Object.entries(fieldConfigs).map(([fieldName, config]) => (
          <Grid item xs={12} key={fieldName}>
            <Paper sx={{ p: 2, bgcolor: '#1E1E1E' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {fieldName.replace(/([A-Z])/g, ' $1').trim()}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Field Name: {fieldName}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Display Label"
                    value={config.label || ''}
                    onChange={(e) => handleFieldChange(fieldName, 'label', e.target.value)}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.enabled || false}
                        onChange={(e) => handleFieldChange(fieldName, 'enabled', e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Enabled"
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.required || false}
                        onChange={(e) => handleFieldChange(fieldName, 'required', e.target.checked)}
                        color="primary"
                        disabled={!config.enabled}
                      />
                    }
                    label="Required"
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {config.format && (
                      <Chip label={config.format} size="small" color="primary" />
                    )}
                    {config.options && (
                      <Chip label={`${config.options.length} options`} size="small" />
                    )}
                  </Box>
                </Grid>
              </Grid>

              {config.options && config.enabled && (
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="body2" gutterBottom>
                    Available Options:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {config.options.map((option, idx) => (
                      <Chip key={idx} label={option} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          Save All Changes
        </Button>
      </Box>
    </Box>
  );
};

export default AuthorityFieldConfig;
