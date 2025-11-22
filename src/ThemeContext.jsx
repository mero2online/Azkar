import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // Light mode colors
                primary: {
                  main: '#646cff',
                },
                secondary: {
                  main: '#535bf2',
                },
                background: {
                  default: '#ffffff',
                  paper: '#f9f9f9',
                },
                text: {
                  primary: '#213547',
                  secondary: '#646464',
                },
                error: {
                  main: '#d32f2f',
                },
                success: {
                  main: '#006100',
                },
                warning: {
                  main: '#ffa726',
                },
              }
            : {
                // Dark mode colors
                primary: {
                  main: '#4a5568',
                  light: '#5a6678',
                  dark: '#2d3748',
                },
                secondary: {
                  main: '#4a5568',
                },
                background: {
                  default: '#242424',
                  paper: '#1a1a1a',
                },
                text: {
                  primary: 'rgba(255, 255, 255, 0.87)',
                  secondary: 'rgba(255, 255, 255, 0.6)',
                },
                error: {
                  main: '#e53e3e',
                },
                success: {
                  main: '#38a169',
                },
                warning: {
                  main: '#dd6b20',
                },
                info: {
                  main: '#3182ce',
                },
              }),
        },
        typography: {
          fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
        },
      }),
    [mode]
  );

  const value = {
    mode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
