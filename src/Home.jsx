import { Link } from 'react-router-dom';
import './App.css';
import { Azkar } from './Constants';
import { Box } from '@mui/material';
import Button from '@mui/material/Button';
import BarChartIcon from '@mui/icons-material/BarChart';
import MosqueIcon from '@mui/icons-material/Mosque';

function Home() {
  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '400px', margin: '0 auto' }}>
        <Link to='/prayer-times' style={{ textDecoration: 'none' }}>
          <Button
            variant='outlined'
            color='secondary'
            fullWidth
            startIcon={<MosqueIcon />}
            sx={{ fontSize: '1.1em', py: 1.2 }}
          >
            Prayer Times
          </Button>
        </Link>
        <Link to='/stats' style={{ textDecoration: 'none' }}>
          <Button
            variant='outlined'
            color='secondary'
            fullWidth
            startIcon={<BarChartIcon />}
            sx={{ fontSize: '1.1em', py: 1.2 }}
          >
            Statistics
          </Button>
        </Link>
        {Azkar.map((z, i) => {
          return (
            <Link key={z.id} to={`/${i}`} style={{ textDecoration: 'none' }}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ fontSize: '1.2em', py: 1.5 }}
              >
                {z.name}
              </Button>
            </Link>
          );
        })}
      </Box>
    </>
  );
}

export default Home;
