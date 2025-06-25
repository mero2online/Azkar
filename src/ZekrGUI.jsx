import { useEffect, useRef, useState } from 'react';
import { zekrById } from './Data';
import PropTypes from 'prop-types';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp';
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown';
import { format } from 'date-fns';

const ZekrGUI = ({ current, storedCounts, storedDateTimes }) => {
  const [count, setCount] = useState();
  const [dateTime, setDateTime] = useState();
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
    let myDateTime = {};

    zekrById(current.id).forEach((element, idx) => {
      // Restore from localStorage if available, or default to 0 / ''
      myCount[idx] = storedCounts?.[current.id]?.[idx] ?? 0;
      myDateTime[idx] = storedDateTimes?.[current.id]?.[idx] ?? '';
    });

    setCount(myCount);
    setDateTime(myDateTime);

    if (btnRef.current !== null) {
      window.addEventListener('scroll', handleScroll);
    }
  }, [current, storedCounts, storedDateTimes]);

  const scrollToElementByIndex = (idx) => {
    elementRefs.current[idx].scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  useEffect(() => {
    if (elementRefs.current[currentIndex]) {
      scrollToElementByIndex(currentIndex);
    }
  }, [currentIndex]);

  useEffect(() => {
    const allCounts = JSON.parse(localStorage.getItem('count') || '{}');
    allCounts[current.id] = count;
    localStorage.setItem('count', JSON.stringify(allCounts));
  }, [count, current.id]);

  useEffect(() => {
    const allDateTimes = JSON.parse(localStorage.getItem('dateTime') || '{}');
    allDateTimes[current.id] = dateTime;
    localStorage.setItem('dateTime', JSON.stringify(allDateTimes));
  }, [dateTime, current.id]);

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
        <button
          className='MyBtn'
          onClick={() => {
            let myCount = {};
            let myDateTime = {};

            zekrById(current.id).forEach((element, idx) => {
              myCount[idx] = 0;
              myDateTime[idx] = '';
            });

            setCount(myCount);
            setDateTime(myDateTime);
          }}
        >
          <RestartAltIcon />
          Reset All
        </button>
        <button
          className='MyBtn'
          onClick={() => {
            if (storedDateTimes) {
              let timestamps = storedDateTimes?.[current.id];
              if (timestamps && typeof timestamps === 'object') {
                const entries = Object.entries(timestamps)
                  .filter(([, value]) => value) // keep only non-empty timestamps
                  .map(([key, value]) => ({ key, date: new Date(value) }));

                if (entries.length === 0) {
                  console.log('No valid timestamps found.');
                } else {
                  const mostRecent = entries.reduce((latest, current) =>
                    current.date > latest.date ? current : latest
                  );
                  setCurrentIndex(Number(mostRecent.key));
                  scrollToElementByIndex(Number(mostRecent.key))
                  console.log('Most recent object number:', mostRecent.key);
                  console.log('Timestamp:', mostRecent.date.toISOString());
                }
              }
            }
          }}
        >
          <ArrowCircleDownIcon />
          Go To Last
        </button>
      </div>
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
                  onClick={() => {
                    setCount({
                      ...count,
                      [i]: 0,
                    });
                    setDateTime({
                      ...dateTime,
                      [i]: '',
                    });
                  }}
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
                  setDateTime({
                    ...dateTime,
                    [i]: count[i] < z.counter_num ? new Date() : dateTime[i],
                  });
                }}
              >
                <div className='fingerPrintDiv'>
                  <FingerprintIcon className='fingerPrintSVG' />
                </div>
              </button>
              <div>
                {dateTime[i]
                  ? format(dateTime[i], 'dd-MM-yyyy hh:mm:ss.SS a')
                  : ''}
              </div>
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
  storedCounts: PropTypes.object.isRequired,
  storedDateTimes: PropTypes.object.isRequired,
};
export default ZekrGUI;
