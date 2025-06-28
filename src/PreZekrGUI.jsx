import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './App.css';
import ZekrGUI from './ZekrGUI';
import { Azkar } from './Constants';

function PreZekrGUI() {
  let { ZekrId } = useParams();
  const [current, setCurrent] = useState(null);
  const [storedCounts, setCurrentStoredCounts] = useState(null);

  useEffect(() => {
    // Try to get saved data from localStorage
    const storedCounts = JSON.parse(
      localStorage.getItem('mergedCount') || '{}'
    );
    setCurrent(Azkar[Number(ZekrId)]);
    setCurrentStoredCounts(storedCounts);
  }, [ZekrId]);

  return (
    <>
      {current && (
        <ZekrGUI current={current} storedCounts={storedCounts}></ZekrGUI>
      )}
    </>
  );
}

export default PreZekrGUI;
