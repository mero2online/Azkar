import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './App.css';
import ZekrGUI from './ZekrGUI';
import { Azkar } from './Constants';

function PreZekrGUI() {
  let { ZekrId } = useParams();
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    setCurrent(Azkar[Number(ZekrId)]);
  }, [ZekrId]);

  return <>{current && <ZekrGUI current={current}></ZekrGUI>}</>;
}

export default PreZekrGUI;
