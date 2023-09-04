import { useEffect, useState } from 'react';
import { zekrById } from './Data';
import PropTypes from 'prop-types';

const ZekrGUI = ({ current }) => {
  const [count, setCount] = useState();

  useEffect(() => {
    let myCount = {};
    zekrById(current.id).forEach((element, idx) => {
      myCount[idx] = 0;
    });
    setCount(myCount);
  }, [current]);

  if (!count) return <div> Loading </div>;
  return (
    <>
      <h1>{current.name}</h1>
      <div>
        {zekrById(current.id).map((z, i) => {
          const activeStyle =
            count[i] == 0
              ? ''
              : count[i] === z.counter_num
              ? 'Finished'
              : 'Started';
          return (
            <div key={i} className='card'>
              <h2 className='arabicfont zekr-style'>{z.description}</h2>
              <button className='MyBtn'>{z.counter_num}</button>
              <button
                className={`MyCountBtn ${activeStyle}`}
                onClick={() =>
                  setCount({
                    ...count,
                    [i]: count[i] < z.counter_num ? count[i] + 1 : count[i],
                  })
                }
              >
                {count[i]}
              </button>
              <button
                className='MyBtn'
                onClick={() =>
                  setCount({
                    ...count,
                    [i]: 0,
                  })
                }
              >
                reset
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
};
ZekrGUI.propTypes = {
  current: PropTypes.object.isRequired,
};
export default ZekrGUI;
