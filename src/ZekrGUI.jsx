import { useEffect, useRef, useState } from 'react';
import { zekrById } from './Data';
import PropTypes from 'prop-types';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp';

const ZekrGUI = ({ current }) => {
  const [count, setCount] = useState();
  const btnRef = useRef(0);
  useEffect(() => {
    let myCount = {};
    zekrById(current.id).forEach((element, idx) => {
      myCount[idx] = 0;
    });
    setCount(myCount);
    if (btnRef.current !== null) {
      window.addEventListener('scroll', handleScroll);
    }
  }, [current]);

  const handleScroll = () => {
    const btn = btnRef.current;
    if (btn) {
      document.body.scrollTop > 400 || document.documentElement.scrollTop > 400
        ? (btn.style.display = 'block')
        : (btn.style.display = 'none');
    }
  };
  const onGotoTopBtn = () => {
    document.body.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    document.documentElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  if (!count) return <div> Loading </div>;
  return (
    <>
      <h1>{current.name}</h1>
      <hr />
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
              <div>
                {i + 1} of {zekrById(current.id).length} - {current.name}
              </div>
              <h2 className='arabicfont zekr-style'>{z.description}</h2>
              <div>
                <button className='MyBtn'>{z.counter_num}</button>
                <button className='MyBtn'>{count[i]}</button>
                <button
                  className='MyBtn'
                  onClick={() =>
                    setCount({
                      ...count,
                      [i]: 0,
                    })
                  }
                >
                  <RestartAltIcon />
                </button>
              </div>
              <button
                className={`MyCountBtn ${activeStyle}`}
                onClick={() =>
                  setCount({
                    ...count,
                    [i]: count[i] < z.counter_num ? count[i] + 1 : count[i],
                  })
                }
              >
                <div className='fingerPrintDiv'>
                  <FingerprintIcon className='fingerPrintSVG' />
                </div>
              </button>
              <hr></hr>
            </div>
          );
        })}
      </div>
      <button
        ref={btnRef}
        onClick={onGotoTopBtn}
        className='goToTopBtn'
        data-tip='Go to top'
      >
        <ArrowCircleUpIcon />
      </button>
    </>
  );
};
ZekrGUI.propTypes = {
  current: PropTypes.object.isRequired,
};
export default ZekrGUI;
