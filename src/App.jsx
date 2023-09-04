import { useState } from 'react';
import './App.css';
import ZekrGUI from './ZekrGUI';

const Azkar = [
  { id: 28, name: 'أذكار المساء' },
  { id: 27, name: 'أذكار الصباح' },
  { id: 25, name: 'الأذكار بعد الصلاة' },
];
function App() {
  const [current, setCurrent] = useState(null);
  return (
    <>
      <h1>Zekr App</h1>
      <div>
        {Azkar.map((z) => {
          return (
            <button className='MyBtn' key={z.id} onClick={() => setCurrent(z)}>
              {z.name}
            </button>
          );
        })}
      </div>
      {current && <ZekrGUI current={current}></ZekrGUI>}
    </>
  );
}

export default App;
