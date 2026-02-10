import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const Logo = ({ variant = 'black', height = 40, ...props }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  // Use white logo in dark mode, black logo in light mode
  const logoVariant = variant === 'auto' ? (isDark ? 'white' : 'black') : variant;
  
  return (
    <Box
      component="img"
      src={`/static/logos/HerzogLogo${logoVariant.charAt(0).toUpperCase() + logoVariant.slice(1)}.png`}
      alt="Sidekick"
      height={height}
      sx={{
        objectFit: 'contain',
        ...props.sx
      }}
      {...props}
    />
  );
};

export default Logo;
