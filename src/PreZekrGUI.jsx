import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import './App.css';
import ZekrGUI from './ZekrGUI';
import { Azkar } from './Constants';

function PreZekrGUI() {
  let { ZekrId } = useParams();
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    setCurrent(Azkar[Number(ZekrId)]);
  }, [ZekrId]);

  return (
    <>
      <Link to={'/'}>
        <h1>Zekr App</h1>
      </Link>
      {current && <ZekrGUI current={current}></ZekrGUI>}
    </>
  );
}

export default PreZekrGUI;
