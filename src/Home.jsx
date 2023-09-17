import { Link } from 'react-router-dom';
import './App.css';
import { Azkar } from './Constants';

function Home() {
  return (
    <>
      <h1>Zekr App</h1>
      <div>
        {Azkar.map((z, i) => {
          return (
            <Link key={z.id} to={`/${i}`}>
              <button className='MyBtn' key={z.id}>
                {z.name}
              </button>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export default Home;
