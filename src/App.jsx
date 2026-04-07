import './App.css';
import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import PreZekrGUI from './PreZekrGUI';
import Home from './Home';
import appData from '../package.json';
import { useTheme, VIEW_MODES } from './ThemeContext';
import IconButton from '@mui/material/IconButton';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ViewDayIcon from '@mui/icons-material/ViewDay';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import { Box } from '@mui/material';

function App() {
  const { mode, toggleTheme, viewMode, toggleViewMode } = useTheme();
  const location = useLocation();
  const isHome = location.pathname === '/';

  // Request notification permission on first load (needed for vibration on Android 13+)
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: '1280px',
          margin: '0 auto',
        }}
      >
        <Link to={'/'}>
          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            whiteSpace: 'nowrap',
            margin: '1.5rem 0',
            textAlign: 'center',
          }}>
            {appData.displayName} v{appData.version}
          </h1>
        </Link>
        <IconButton
          onClick={toggleViewMode}
          color="inherit"
          aria-label="toggle view mode"
          sx={{
            position: 'fixed',
            top: 10,
            left: 20,
            zIndex: 1000,
            backgroundColor: 'background.paper',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
            display: isHome ? 'inline-flex' : 'none',
          }}
        >
          {viewMode === VIEW_MODES.VERTICAL ? <ViewCarouselIcon /> : <ViewDayIcon />}
        </IconButton>
        <IconButton
          onClick={toggleTheme}
          color="inherit"
          aria-label="toggle theme"
          sx={{
            position: 'fixed',
            top: 10,
            right: 20,
            zIndex: 1000,
            backgroundColor: 'background.paper',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
            display: isHome ? 'inline-flex' : 'none',
          }}
        >
          {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Box>
      <Routes>
        <Route path='/' element={<Home />}></Route>
        <Route path='/:ZekrId' element={<PreZekrGUI />}></Route>
      </Routes>
    </>
  );
}

export default App;
