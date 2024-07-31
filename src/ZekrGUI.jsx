import { useEffect, useRef, useState } from 'react';
import { zekrById } from './Data';
import PropTypes from 'prop-types';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp';

const ZekrGUI = ({ current }) => {
  const [count, setCount] = useState();
  const [currentIndex, setCurrentIndex] = useState(0);
  const btnRef = useRef(0);
  const elementRefs = useRef([]);

  const handleNext = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex + 1) % zekrById(current.id).length
    );
  };

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

  useEffect(() => {
    if (elementRefs.current[currentIndex]) {
      elementRefs.current[currentIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentIndex]);

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
      <div>
        {zekrById(current.id).map((z, i) => {
          const activeStyle =
            count[i] == 0
              ? ''
              : count[i] === z.counter_num
              ? 'Finished'
              : 'Started';
          return (
            <div
              key={i}
              ref={(el) => (elementRefs.current[i] = el)}
              className='card'
            >
              <div>
                <hr></hr>
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
                <div>
                  {i + 1} of {zekrById(current.id).length} - {current.name}
                </div>
              </div>
              <h2 className='arabicfont zekr-style'>{z.description}</h2>
              <div>
                <button className='MyBtn'>{z.counter_num}</button>
                <button className='MyBtn'>{count[i]}</button>
              </div>
              <button
                className={`MyCountBtn ${activeStyle}`}
                onClick={() => {
                  setCount({
                    ...count,
                    [i]: count[i] < z.counter_num ? count[i] + 1 : count[i],
                  });
                  setCurrentIndex(i);
                  if (count[i] === z.counter_num - 1) {
                    handleNext();
                  }
                }}
              >
                <div className='fingerPrintDiv'>
                  <FingerprintIcon className='fingerPrintSVG' />
                </div>
              </button>
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
