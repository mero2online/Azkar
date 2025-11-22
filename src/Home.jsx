import { Link } from 'react-router-dom';
import './App.css';
import { Azkar } from './Constants';
import { Box } from '@mui/material';
import Button from '@mui/material/Button';

function Home() {
  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '400px', margin: '0 auto' }}>
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
