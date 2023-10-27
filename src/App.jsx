import './App.css';
import { Routes, Route, Link } from 'react-router-dom';
import PreZekrGUI from './PreZekrGUI';
import Home from './Home';
import appData from '../package.json';

function App() {
  return (
    <>
      <Link to={'/'}>
        <h1>
          {appData.displayName} v{appData.version}
        </h1>
      </Link>
      <Routes>
        <Route path='/' element={<Home />}></Route>
        <Route path='/:ZekrId' element={<PreZekrGUI />}></Route>
      </Routes>
    </>
  );
}

export default App;
