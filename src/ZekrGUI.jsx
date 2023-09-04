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
          const activeStyle = count[i] === z.counter_num ? 'Finished' : '';
          return (
            <div key={i} className='card'>
              <h2 className='arabicfont zekr-style'>{z.description}</h2>
              <div className='arabicfont zekr-style'>
                {z.counter_num} {z.counter}
              </div>
              <button
                className={activeStyle}
                onClick={() =>
                  setCount({
                    ...count,
                    [i]: count[i] < z.counter_num ? count[i] + 1 : count[i],
                  })
                }
              >
                count {count[i]}
              </button>
              <button
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
