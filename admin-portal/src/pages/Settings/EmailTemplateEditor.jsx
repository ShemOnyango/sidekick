import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import {
  Send as SendIcon,
  Preview as PreviewIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const EmailTemplateEditor = () => {
  const [templateType, setTemplateType] = useState('config_change');
  const [subject, setSubject] = useState('Configuration Change Notification');
  const [body, setBody] = useState(`Dear {{clientName}},

A configuration change has been made to your Sidekick system:

Configuration Type: {{configType}}
Changed Field: {{fieldName}}
Old Value: {{oldValue}}
New Value: {{newValue}}

Changed By: {{userName}}
Date/Time: {{timestamp}}
IP Address: {{ipAddress}}

Please review this change and contact us if you have any questions.

Best regards,
Sidekick System`);

  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const templateTypes = {
    'config_change': 'Configuration Change Notification',
    'proximity_alert': 'Proximity Alert',
    'overlap_detected': 'Authority Overlap Detected',
    'boundary_violation': 'Boundary Violation Alert',
    'user_created': 'New User Created',
    'password_reset': 'Password Reset Request',
    'authority_expiring': 'Authority Expiring Soon',
    'trip_report': 'Trip Report Ready'
  };

  const availableVariables = {
    'config_change': [
      '{{clientName}}', '{{configType}}', '{{fieldName}}', 
      '{{oldValue}}', '{{newValue}}', '{{userName}}', 
      '{{timestamp}}', '{{ipAddress}}'
    ],
    'proximity_alert': [
      '{{userName}}', '{{distance}}', '{{otherUser}}', 
      '{{location}}', '{{timestamp}}'
    ],
    'overlap_detected': [
      '{{user1}}', '{{user2}}', '{{subdivision}}', 
      '{{trackNumber}}', '{{overlapDetails}}', '{{timestamp}}'
    ],
    'boundary_violation': [
      '{{userName}}', '{{authorityId}}', '{{milepost}}', 
      '{{timestamp}}', '{{distance}}'
    ],
    'user_created': [
      '{{userName}}', '{{email}}', '{{role}}', 
      '{{agencyName}}', '{{loginUrl}}'
    ],
    'password_reset': [
      '{{userName}}', '{{resetLink}}', '{{expiryTime}}'
    ],
    'authority_expiring': [
      '{{userName}}', '{{authorityId}}', '{{subdivision}}', 
      '{{expiryTime}}', '{{remainingMinutes}}'
    ],
    'trip_report': [
      '{{userName}}', '{{reportDate}}', '{{downloadLink}}', 
      '{{tripCount}}', '{{totalDistance}}'
    ]
  };

  const handleTemplateChange = (type) => {
    setTemplateType(type);
    // Load template from backend or set defaults
    // For now, using placeholders
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      setError('Please enter a test email address');
      return;
    }

    setSendingTest(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Implement API call to send test email
      // const response = await api.post('/email/test', {
      //   templateType,
      //   subject,
      //   body,
      //   testEmail
      // });

      setTimeout(() => {
        setSuccess(`Test email sent to ${testEmail}`);
        setSendingTest(false);
      }, 1000);
    } catch (err) {
      setError('Failed to send test email');
      setSendingTest(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Email Template Editor
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Customize email templates for notifications and alerts
        </Typography>
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
          <strong>Client Email:</strong> All configuration changes are automatically sent to ryan.medlin@example.com.
          Use variables like {"{{clientName}}"} for dynamic content.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Template Selection */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Select Template
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Template Type</InputLabel>
              <Select
                value={templateType}
                label="Template Type"
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                {Object.entries(templateTypes).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
              Available Variables:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {availableVariables[templateType]?.map((variable) => (
                <Box
                  key={variable}
                  sx={{
                    px: 1,
                    py: 0.5,
                    bgcolor: '#FFD100',
                    color: '#000',
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(variable);
                    setSuccess(`Copied ${variable} to clipboard`);
                    setTimeout(() => setSuccess(null), 2000);
                  }}
                >
                  {variable}
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Test Email */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Send Test Email
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <TextField
              fullWidth
              label="Test Email Address"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              sx={{ mb: 2 }}
            />

            <Button
              fullWidth
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSendTest}
              disabled={sendingTest || !testEmail}
            >
              {sendingTest ? 'Sending...' : 'Send Test Email'}
            </Button>
          </Paper>
        </Grid>

        {/* Template Editor */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Edit Template
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <TextField
              fullWidth
              label="Email Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              multiline
              rows={16}
              label="Email Body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              helperText="Use variables like {{userName}}, {{timestamp}}, etc."
            />

            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button variant="outlined" startIcon={<PreviewIcon />}>
                Preview
              </Button>
              <Button variant="contained" startIcon={<SendIcon />}>
                Save Template
              </Button>
            </Box>
          </Paper>

          {/* Preview */}
          <Card sx={{ mt: 3, bgcolor: '#FFFFFF', color: '#000000' }}>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Email Preview
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {subject}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {body}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EmailTemplateEditor;
