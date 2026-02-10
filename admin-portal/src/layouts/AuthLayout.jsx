import React from 'react';
import { Box, Paper, Container } from '@mui/material';

const AuthLayout = ({ children }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#121212',
        backgroundImage: 'linear-gradient(135deg, #121212 0%, #1E1E1E 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          right: '-50%',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle, rgba(255, 209, 0, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '-50%',
          left: '-50%',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle, rgba(255, 209, 0, 0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 3,
            bgcolor: '#1E1E1E',
            border: '1px solid rgba(255, 209, 0, 0.2)',
            boxShadow: '0 8px 32px rgba(255, 209, 0, 0.1)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              mb: 3,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                bgcolor: '#FFD100',
                borderRadius: 2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: '#000',
                fontSize: '2.5rem',
                mb: 2,
                boxShadow: '0 4px 20px rgba(255, 209, 0, 0.3)',
              }}
            >
              H
            </Box>
          </Box>
          {children}
        </Paper>

        <Box
          sx={{
            mt: 3,
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.875rem',
          }}
        >
          © {new Date().getFullYear()} Sidekick Management System
        </Box>
      </Container>
    </Box>
  );
};

export default AuthLayout;
