import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Map as MapIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import api from '../../services/api';

const ActiveAuthorities = () => {
  const { user } = useSelector((state) => state.auth);
  const agencyId = user?.agencyId;

  const [authorities, setAuthorities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    overlaps: 0,
    nearExpiry: 0
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAuthority, setSelectedAuthority] = useState(null);

  useEffect(() => {
    fetchAuthorities();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAuthorities();
    }, 30000);
    
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAuthorities = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/authorities/active');
      if (response.data.success) {
        const authoritiesData = response.data.data.authorities || response.data.data || [];
        setAuthorities(authoritiesData);
        
        // Update stats from the authorities data
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        
        setStats({
          active: authoritiesData.length,
          total: authoritiesData.length,
          overlaps: 0, // TODO: Calculate from overlap data
          nearExpiry: authoritiesData.filter(a => {
            if (!a.Expiration_Time) return false;
            const expiry = new Date(a.Expiration_Time);
            return expiry <= oneHourFromNow && expiry > now;
          }).length
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load active authorities');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    // Stats are now calculated from the authorities data in fetchAuthorities
    // This function can be removed or used for additional stats if needed
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuClick = (event, authority) => {
    setAnchorEl(event.currentTarget);
    setSelectedAuthority(authority);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAuthority(null);
  };

  const handleViewOnMap = () => {
    // Navigate to map view with authority highlighted
    console.log('View on map:', selectedAuthority);
    handleMenuClose();
  };

  const handleViewDetails = () => {
    // Navigate to authority details
    console.log('View details:', selectedAuthority);
    handleMenuClose();
  };

  const filteredAuthorities = authorities.filter((authority) =>
    Object.values(authority).some(
      (value) =>
        value &&
        value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const paginatedAuthorities = filteredAuthorities.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'overlap':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <CheckCircleIcon fontSize="small" />;
      case 'overlap':
        return <ErrorIcon fontSize="small" />;
      case 'warning':
        return <WarningIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatMilepost = (mp) => {
    return mp ? `MP ${parseFloat(mp).toFixed(2)}` : 'N/A';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Displaying all currently active authorities. Overlaps and conflicts are highlighted in red.
          Authority data refreshes every 30 seconds automatically.
        </Typography>
      </Alert>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1E1E1E' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Active
              </Typography>
              <Typography variant="h4" color="#FFD100">
                {stats.active}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1E1E1E' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Overlaps Detected
              </Typography>
              <Typography variant="h4" color="error.main">
                {stats.overlaps}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1E1E1E' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Near Expiry (1hr)
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.nearExpiry}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1E1E1E' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Authorities
              </Typography>
              <Typography variant="h4" color="info.main">
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Active Authorities
          </Typography>

          <TextField
            size="small"
            placeholder="Search authorities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#1E1E1E' }}>
                    <TableCell>Status</TableCell>
                    <TableCell>Authority Type</TableCell>
                    <TableCell>Subdivision</TableCell>
                    <TableCell>Track</TableCell>
                    <TableCell>Milepost Range</TableCell>
                    <TableCell>Employee</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>Estimated End</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedAuthorities.map((authority, index) => (
                    <TableRow
                      key={authority.Authority_ID || index}
                      sx={{
                        '&:hover': { bgcolor: 'action.hover' },
                        bgcolor: authority.Has_Overlap ? 'rgba(244, 67, 54, 0.1)' : 'transparent'
                      }}
                    >
                      <TableCell>
                        <Chip
                          icon={getStatusIcon('active')}
                          label="Active"
                          color="success"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{authority.Authority_Type || 'N/A'}</TableCell>
                      <TableCell>{authority.Subdivision_Name || authority.Subdivision_Code || 'N/A'}</TableCell>
                      <TableCell>
                        {authority.Track_Type && authority.Track_Number
                          ? `${authority.Track_Type} ${authority.Track_Number}`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {formatMilepost(authority.Begin_MP)} - {formatMilepost(authority.End_MP)}
                      </TableCell>
                      <TableCell>
                        {authority.Employee_Name_Display || authority.Employee_Name || 'N/A'}
                      </TableCell>
                      <TableCell>{formatDateTime(authority.Start_Time)}</TableCell>
                      <TableCell>{formatDateTime(authority.Expiration_Time)}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, authority)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}

                  {paginatedAuthorities.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>
                          {searchTerm
                            ? 'No authorities match your search'
                            : 'No active authorities found'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredAuthorities.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewOnMap}>
          <MapIcon sx={{ mr: 1 }} fontSize="small" />
          View on Map
        </MenuItem>
        <MenuItem onClick={handleViewDetails}>
          <FilterIcon sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ActiveAuthorities;
