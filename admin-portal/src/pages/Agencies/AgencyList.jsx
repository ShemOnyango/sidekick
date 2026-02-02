// admin-portal/src/pages/Agencies/AgencyList.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
// `useSelector` intentionally removed to avoid ESLint no-unused-vars warning
import api from '../../services/api';

const AgencyList = () => {
  // Access auth state if needed later; currently not used to avoid lint warning
  // const { user } = useSelector((state) => state.auth);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    agencyCode: '',
    agencyName: '',
    region: '',
    contactEmail: '',
    contactPhone: '',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadAgencies();
  }, []);

  const loadAgencies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/agencies');
      if (response.data.success) {
        // The API returns data.agencies, not just data
        const agencyData = response.data.data.agencies || response.data.data || [];
        setAgencies(Array.isArray(agencyData) ? agencyData : []);
      } else {
        setAgencies([]);
      }
    } catch (err) {
      setError('Failed to load agencies');
      setAgencies([]);
      console.error('Error loading agencies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      agencyCode: '',
      agencyName: '',
      region: '',
      contactEmail: '',
      contactPhone: '',
      isActive: true,
    });
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'isActive' ? checked : value,
    });
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.agencyCode.trim()) {
      errors.agencyCode = 'Agency code is required';
    }
    if (!formData.agencyName.trim()) {
      errors.agencyName = 'Agency name is required';
    }
    if (formData.contactEmail && !/\S+@\S+\.\S+/.test(formData.contactEmail)) {
      errors.contactEmail = 'Invalid email format';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAgency = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Map form fields to API expected format
      const apiData = {
        agencyCD: formData.agencyCode,
        agencyName: formData.agencyName,
        region: formData.region,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
      };
      const response = await api.post('/agencies', apiData);
      if (response.data.success) {
        setOpenDialog(false);
        loadAgencies();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create agency');
      console.error('Error creating agency:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" component="h1">
              Agencies Management
            </Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadAgencies}
                sx={{ mr: 2 }}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenDialog}
                disabled={loading}
                sx={{ bgcolor: '#FFD100', color: '#000', '&:hover': { bgcolor: '#E6BC00' } }}
              >
                New Agency
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#1E1E1E' }}>
                    <TableCell>Code</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Region</TableCell>
                    <TableCell>Users</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {agencies.map((agency) => (
                    <TableRow key={agency.Agency_ID} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>{agency.Agency_CD}</TableCell>
                      <TableCell>{agency.Agency_Name}</TableCell>
                      <TableCell>{agency.Region || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip label={agency.userCount || 0} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={agency.Is_Active ? 'Active' : 'Inactive'} 
                          color={agency.Is_Active ? 'success' : 'error'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        {agency.Created_Date ? new Date(agency.Created_Date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {agencies.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>
                          No agencies found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* New Agency Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Add New Agency</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Agency Code"
                name="agencyCode"
                value={formData.agencyCode}
                onChange={handleInputChange}
                error={!!formErrors.agencyCode}
                helperText={formErrors.agencyCode}
                placeholder="e.g., BNSF"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Agency Name"
                name="agencyName"
                value={formData.agencyName}
                onChange={handleInputChange}
                error={!!formErrors.agencyName}
                helperText={formErrors.agencyName}
                placeholder="e.g., BNSF Railway"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Region"
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                placeholder="e.g., Midwest"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Email"
                name="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={handleInputChange}
                error={!!formErrors.contactEmail}
                helperText={formErrors.contactEmail}
                placeholder="contact@agency.com"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Phone"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
                placeholder="555-123-4567"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    name="isActive"
                    color="primary"
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveAgency}
            variant="contained"
            disabled={loading}
            sx={{ bgcolor: '#FFD100', color: '#000', '&:hover': { bgcolor: '#E6BC00' } }}
          >
            {loading ? 'Saving...' : 'Save Agency'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AgencyList;
