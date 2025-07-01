import { useEffect, useRef, useState } from 'react';
import { getMostRecentTime, zekrById } from './Data';
import PropTypes from 'prop-types';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp';
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown';
import { format } from 'date-fns';

const ZekrGUI = ({ current, storedCounts }) => {
  const [mergedCount, setMergedCount] = useState();
  const [currentIndex, setCurrentIndex] = useState(0);
  const btnRef = useRef(0);
  const elementRefs = useRef([]);

  const handleNext = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex + 1) % zekrById(current.id).length
    );
  };

  useEffect(() => {
    let myMergedCount = {};

    zekrById(current.id).forEach((element, idx) => {
      // Restore from localStorage if available, or default to 0 / ''
      myMergedCount[idx] = {
        count: storedCounts?.[current.id]?.[idx].count ?? 0,
        counterNum: element.counter_num,
        dateTime: storedCounts?.[current.id]?.[idx].dateTime ?? '',
      };
    });

    setMergedCount(myMergedCount);

    if (btnRef.current !== null) {
      window.addEventListener('scroll', handleScroll);
    }
  }, [current, storedCounts]);

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
    const allCounts = JSON.parse(localStorage.getItem('mergedCount') || '{}');
    allCounts[current.id] = mergedCount;
    localStorage.setItem('mergedCount', JSON.stringify(allCounts));
  }, [mergedCount, current.id]);

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

  const checkStatus = () => {
    let myCurrentStatus = {};
    if (mergedCount) {
      zekrById(current.id).forEach((element, idx) => {
        // Restore from localStorage if available, or default to 0 / ''

        myCurrentStatus[idx] = {
          status: mergedCount[idx].count === mergedCount[idx].counterNum,
        };
      });

      const activeCount = Object.values(myCurrentStatus).filter(
        (item) => item.status
      ).length;
      const allLength = zekrById(current.id).length;
      const statusTxt = activeCount === allLength ? 'Completed' : 'InProgress';
      const statusBackgroundColor =
        activeCount === allLength ? '#006100' : 'yellow';
      const statusColor = activeCount === allLength ? 'white' : 'black';
      const firstFalseIndex = Object.entries(myCurrentStatus).find(
        ([, value]) => value.status === false
      )?.[0];
      let getData = getMostRecentTime(mergedCount);
      let time = getData['time'];
      let index = getData['index'];
      const disabledBtn = time === 'No valid timestamps found.' ? true : false;
      const colorBtn = time === 'No valid timestamps found.' ? 'red' : 'blue';
      return (
        <div>
          {/* <pre>{JSON.stringify(myCurrentStatus, null, 2)}</pre>; */}
          <div
            style={{
              backgroundColor: statusBackgroundColor,
              color: statusColor,
              display: 'inline-block',
              width: '13rem',
            }}
          >
            {statusTxt}: {activeCount}/{allLength}
          </div>
          <div>
            {
              <button
                disabled={disabledBtn}
                style={{ backgroundColor: colorBtn }}
                className='MyBtn'
                onClick={() => {
                  setCurrentIndex(index);
                  scrollToElementByIndex(index);
                }}
              >
                <ArrowCircleDownIcon />
                Go To Last Time
              </button>
            }
          </div>
          <div>Last Time: {time}</div>
          <div>
            <button
              className='MyBtn'
              onClick={() => {
                if (firstFalseIndex) {
                  setCurrentIndex(firstFalseIndex);
                  scrollToElementByIndex(firstFalseIndex);
                } else {
                  setCurrentIndex(0);
                  scrollToElementByIndex(0);
                }
              }}
            >
              <ArrowCircleDownIcon />
              Go To First Count
            </button>
            <div>Last Count: {index + 1}</div>
          </div>
        </div>
      );
    }
  };

  if (!mergedCount) return <div> Loading </div>;
  return (
    <>
      {/* <pre>{JSON.stringify(mergedCount, null, 2)}</pre> */}
      <h1>{current.name}</h1>
      <div>
        <button
          className='MyBtn'
          onClick={() => {
            let myMergedCount = {};

            zekrById(current.id).forEach((element, idx) => {
              myMergedCount[idx] = {
                count: myMergedCount?.[current.id]?.[idx].count ?? 0,
                counterNum: element.counter_num,
                dateTime: myMergedCount?.[current.id]?.[idx].dateTime ?? '',
              };
            });

            setMergedCount(myMergedCount);
          }}
        >
          <RestartAltIcon />
          Reset All
        </button>
      </div>
      <div>{checkStatus()}</div>
      <div>
        {zekrById(current.id).map((z, i) => {
          const activeStyle =
            mergedCount[i].count == 0
              ? ''
              : mergedCount[i].count === mergedCount[i].counterNum
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
                    setMergedCount((prev) => ({
                      ...prev,
                      [i]: {
                        ...prev[i],
                        count: 0,
                        dateTime: '',
                      },
                    }));
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
                <button className='MyBtn'>{mergedCount[i].counterNum}</button>
                <button className='MyBtn'>{mergedCount[i].count}</button>
              </div>
              <button
                className={`MyCountBtn ${activeStyle}`}
                onClick={() => {
                  setCurrentIndex(i);
                  if (mergedCount[i].count === mergedCount[i].counterNum - 1) {
                    handleNext();
                  }

                  setMergedCount((prev) => {
                    const currentCount = prev[i];
                    const shouldIncrement =
                      currentCount.count < currentCount.counterNum;

                    return {
                      ...prev,
                      [i]: {
                        ...currentCount,
                        count: shouldIncrement
                          ? currentCount.count + 1
                          : currentCount.count,
                        dateTime: shouldIncrement
                          ? new Date()
                          : currentCount.dateTime,
                      },
                    };
                  });
                }}
              >
                <div className='fingerPrintDiv'>
                  <FingerprintIcon className='fingerPrintSVG' />
                </div>
              </button>
              <div>
                {mergedCount[i].dateTime
                  ? format(mergedCount[i].dateTime, 'dd-MM-yyyy hh:mm:ss.SS a')
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
};
export default ZekrGUI;
