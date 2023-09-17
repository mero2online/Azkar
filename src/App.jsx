import './App.css';
import { Routes, Route } from 'react-router-dom';
import PreZekrGUI from './PreZekrGUI';
import Home from './Home';

function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Home />}></Route>
        <Route path='/:ZekrId' element={<PreZekrGUI />}></Route>
      </Routes>
    </>
  );
}

export default App;
