import './App.css';
import { Routes, Route, Link } from 'react-router-dom';
import PreZekrGUI from './PreZekrGUI';
import Home from './Home';
import appData from '../package.json';
import { useTheme } from './ThemeContext';
import IconButton from '@mui/material/IconButton';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { Box } from '@mui/material';

function App() {
  const { mode, toggleTheme } = useTheme();

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1280px',
          margin: '0 auto',
        }}
      >
        <Link to={'/'}>
          <h1>
            {appData.displayName} v{appData.version}
          </h1>
        </Link>
        <IconButton
          onClick={toggleTheme}
          color="inherit"
          aria-label="toggle theme"
          sx={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 1000,
            backgroundColor: 'background.paper',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
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
