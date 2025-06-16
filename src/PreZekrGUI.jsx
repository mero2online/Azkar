import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './App.css';
import ZekrGUI from './ZekrGUI';
import { Azkar } from './Constants';

function PreZekrGUI() {
  let { ZekrId } = useParams();
  const [current, setCurrent] = useState(null);
  const [storedCounts, setCurrentStoredCounts] = useState(null);
  const [storedDateTimes, setCurrentStoredDateTimes] = useState(null);

  useEffect(() => {
    // Try to get saved data from localStorage
    const storedCounts = JSON.parse(localStorage.getItem('count') || '{}');
    const storedDateTimes = JSON.parse(
      localStorage.getItem('dateTime') || '{}'
    );
    setCurrent(Azkar[Number(ZekrId)]);
    setCurrentStoredCounts(storedCounts);
    setCurrentStoredDateTimes(storedDateTimes);
  }, [ZekrId]);

  return (
    <>
      {current && (
        <ZekrGUI
          current={current}
          storedCounts={storedCounts}
          storedDateTimes={storedDateTimes}
        ></ZekrGUI>
      )}
    </>
  );
}

export default PreZekrGUI;
