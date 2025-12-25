import { useEffect, useRef, useState } from 'react';
import { getMostRecentTime, zekrById } from './Data';
import PropTypes from 'prop-types';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp';
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown';
import SortIcon from '@mui/icons-material/Sort';
import { format, intervalToDuration } from 'date-fns';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';

const ZekrGUI = ({ current, storedCounts }) => {
  const theme = useMuiTheme();
  const [mergedCount, setMergedCount] = useState();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [sortOrder, setSortOrder] = useState('default'); // 'default', 'asc', 'desc'
  const btnRef = useRef(0);
  const elementRefs = useRef([]);

  // Utility function to calculate time since a given date
  const getTimeSince = (dateTime, format = 'long') => {
    if (!dateTime) {
      return '';
    }
    const duration = intervalToDuration({
      start: new Date(dateTime),
      end: new Date(),
    });
    const parts = [];
    if (duration.months)
      parts.push(`${duration.months} month${duration.months > 1 ? 's' : ''}`);
    if (duration.days)
      parts.push(`${duration.days} day${duration.days > 1 ? 's' : ''}`);
    if (duration.hours)
      parts.push(`${duration.hours} hour${duration.hours > 1 ? 's' : ''}`);
    if (duration.minutes)
      parts.push(
        `${duration.minutes} minute${duration.minutes > 1 ? 's' : ''}`
      );

    if (parts.length === 0) {
      return format === 'long' ? ' (Just now)' : 'Just now';
    }

    const timeString = parts.join(' ');
    return format === 'long' ? ` (${timeString} ago)` : `Since: ${timeString}`;
  };

  // Get sorted indices based on current sort order
  const getSortedIndices = () => {
    const zekrItems = zekrById(current.id);
    const indices = zekrItems.map((_, i) => i);

    if (sortOrder === 'asc' && mergedCount) {
      indices.sort((a, b) => mergedCount[a].counterNum - mergedCount[b].counterNum);
    } else if (sortOrder === 'desc' && mergedCount) {
      indices.sort((a, b) => mergedCount[b].counterNum - mergedCount[a].counterNum);
    }

    return indices;
  };

  const handleNext = (currentIdx) => {
    const sortedIndices = getSortedIndices();
    const currentPosInSorted = sortedIndices.indexOf(currentIdx);
    const nextPosInSorted = (currentPosInSorted + 1) % sortedIndices.length;

    // Find first incomplete item starting from next position
    for (let offset = 0; offset < sortedIndices.length; offset++) {
      const checkPos = (nextPosInSorted + offset) % sortedIndices.length;
      const checkIdx = sortedIndices[checkPos];
      if (mergedCount[checkIdx].count < mergedCount[checkIdx].counterNum) {
        setCurrentIndex(checkIdx);
        return;
      }
    }

    // All complete, go to first item in sorted order
    setCurrentIndex(sortedIndices[0]);
  };

  const handleResetAll = () => {
    let myMergedCount = {};

    zekrById(current.id).forEach((element, idx) => {
      myMergedCount[idx] = {
        count: 0,
        counterNum: element.counter_num,
        dateTime: '',
      };
    });

    setMergedCount(myMergedCount);
    setOpenResetDialog(false);
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
        activeCount === allLength
          ? theme.palette.success.main
          : theme.palette.warning.main;
      const statusColor =
        activeCount === allLength
          ? theme.palette.success.contrastText
          : theme.palette.warning.contrastText;
      const firstFalseIndex = Object.entries(myCurrentStatus).find(
        ([, value]) => value.status === false
      )?.[0];
      let getData = getMostRecentTime(mergedCount);
      let time = getData['time'];
      let index = getData['index'];
      const disabledBtn = time === 'No valid timestamps found.' ? true : false;

      return (
        <Box>
          {/* <pre>{JSON.stringify(myCurrentStatus, null, 2)}</pre>; */}
          <Box
            sx={{
              backgroundColor: statusBackgroundColor,
              color: statusColor,
              display: 'inline-block',
              width: '13rem',
              padding: '0.5rem',
              borderRadius: '4px',
              fontWeight: 'bold',
            }}
          >
            {statusTxt}: {activeCount}/{allLength}
          </Box>
          <div>
            {
              <Button
                disabled={disabledBtn}
                variant='contained'
                color={disabledBtn ? 'error' : 'primary'}
                startIcon={<ArrowCircleDownIcon />}
                onClick={() => {
                  setCurrentIndex(index);
                  scrollToElementByIndex(index);
                }}
                sx={{ m: 0.5, fontSize: '1.2em' }}
              >
                Go To Last Time
              </Button>
            }
          </div>
          <Box>
            <Typography variant='body1' sx={{ my: 1 }}>
              Last Time: {time}
            </Typography>

            <Typography
              variant='body2'
              sx={{ color: 'text.secondary', fontStyle: 'italic' }}
            >
              {!disabledBtn && mergedCount[index]?.dateTime
                ? getTimeSince(mergedCount[index].dateTime, 'long')
                : '-_-'}
            </Typography>
          </Box>
          <div>
            <Button
              variant='contained'
              color='primary'
              startIcon={<ArrowCircleDownIcon />}
              onClick={() => {
                if (firstFalseIndex) {
                  setCurrentIndex(firstFalseIndex);
                  scrollToElementByIndex(firstFalseIndex);
                } else {
                  setCurrentIndex(0);
                  scrollToElementByIndex(0);
                }
              }}
              sx={{ m: 0.5, fontSize: '1.2em' }}
            >
              Go To First Count
            </Button>
            <Typography variant='body1' sx={{ my: 1 }}>
              Last Count: {index + 1}
            </Typography>
          </div>
        </Box>
      );
    }
  };

  if (!mergedCount) return <div> Loading </div>;
  return (
    <>
      {/* <pre>{JSON.stringify(mergedCount, null, 2)}</pre> */}
      <h1>{current.name}</h1>
      <Box sx={{ my: 2, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button
          variant='contained'
          color='error'
          startIcon={<RestartAltIcon />}
          onClick={() => setOpenResetDialog(true)}
          sx={{ fontSize: '1.2em' }}
        >
          Reset All
        </Button>
        <Button
          variant='contained'
          color={sortOrder !== 'default' ? 'secondary' : 'primary'}
          startIcon={<SortIcon />}
          onClick={() => {
            setSortOrder(prev => {
              if (prev === 'default') return 'asc';
              if (prev === 'asc') return 'desc';
              return 'default';
            });
          }}
          sx={{ fontSize: '1.2em' }}
        >
          {sortOrder === 'default' ? 'Sort: Default' : sortOrder === 'asc' ? 'Sort: Asc ↑' : 'Sort: Desc ↓'}
        </Button>
      </Box>
      <div>{checkStatus()}</div>
      <div>
        {(() => {
          const zekrItems = zekrById(current.id);
          const indices = getSortedIndices();

          return indices.map((i) => {
            const z = zekrItems[i];
            const getActiveColor = () => {
              if (mergedCount[i].count === 0) {
                return theme.palette.primary.main;
              } else if (mergedCount[i].count === mergedCount[i].counterNum) {
                return theme.palette.error.main;
              } else {
                return theme.palette.info.main;
              }
            };

            return (
              <Box
                key={`zekr-${z.id}`}
                ref={(el) => (elementRefs.current[i] = el)}
              className='card'
              sx={{
                backgroundColor: theme.palette.background.paper,
                borderRadius: '8px',
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? '0 2px 8px rgba(0,0,0,0.3)'
                    : '0 2px 8px rgba(0,0,0,0.1)',
                mb: 2,
                transition: 'all 0.3s ease',
              }}
            >
              <Box>
                <hr style={{ borderColor: theme.palette.divider }}></hr>
                <Typography variant='body2' sx={{ my: 1 }}>
                  {i + 1} of {zekrById(current.id).length} - {current.name}
                </Typography>
              </Box>
              <Typography variant='h5' className='arabicfont zekr-style'>
                {z.description}
              </Typography>
              <Box sx={{ my: 1 }}>
                <Button
                  variant='contained'
                  color='warning'
                  size='small'
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
                  sx={{ m: 0.5 }}
                >
                  <RestartAltIcon />
                </Button>
                <Button
                  variant='contained'
                  color='info'
                  sx={{ m: 0.5, minWidth: '60px' }}
                >
                  {mergedCount[i].counterNum}
                </Button>
                <Button
                  variant='contained'
                  color='success'
                  sx={{ m: 0.5, minWidth: '60px' }}
                >
                  {mergedCount[i].count}
                </Button>
              </Box>
              <button
                className='MyCountBtn'
                style={{
                  backgroundColor: getActiveColor(),
                  transition: 'background-color 0.3s ease',
                }}
                onClick={() => {
                  const currentCount = mergedCount[i];
                  const isAlreadyComplete = currentCount.count === currentCount.counterNum;

                  // If already complete, go to next incomplete item
                  if (isAlreadyComplete) {
                    handleNext(i);
                    return;
                  }

                  // Re-center on current item
                  scrollToElementByIndex(i);
                  setCurrentIndex(i);

                  setMergedCount((prev) => {
                    const currentCount = prev[i];
                    const shouldIncrement =
                      currentCount.count < currentCount.counterNum;
                    const willComplete = currentCount.count === currentCount.counterNum - 1;

                    // Schedule handleNext after state update if this click completes the counter
                    if (shouldIncrement && willComplete) {
                      setTimeout(() => handleNext(i), 100);
                    }

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
              <Typography
                variant='body2'
                sx={{ mt: 1, color: 'text.secondary' }}
              >
                {mergedCount[i].dateTime
                  ? format(mergedCount[i].dateTime, 'dd-MM-yyyy hh:mm:ss.SS a')
                  : '_-_'}
              </Typography>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary', fontStyle: 'italic' }}
              >
                {mergedCount[i].dateTime
                  ? getTimeSince(mergedCount[i].dateTime, 'short')
                  : '-_-'}
              </Typography>
              <hr style={{ borderColor: theme.palette.divider }}></hr>
              </Box>
            );
          });
        })()}
      </div>
      <button
        ref={btnRef}
        onClick={onGotoTopBtn}
        className='goToTopBtn'
        data-tip='Go to top'
      >
        <ArrowCircleUpIcon />
      </button>

      <Dialog
        open={openResetDialog}
        onClose={() => setOpenResetDialog(false)}
        aria-labelledby='reset-dialog-title'
        aria-describedby='reset-dialog-description'
        disableRestoreFocus
      >
        <DialogTitle id='reset-dialog-title'>Confirm Reset All</DialogTitle>
        <DialogContent>
          <DialogContentText id='reset-dialog-description'>
            Are you sure you want to reset all counts? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenResetDialog(false)}
            variant='contained'
            color='primary'
            autoFocus
          >
            Cancel
          </Button>
          <Button
            onClick={handleResetAll}
            variant='contained'
            color='error'
          >
            Reset All
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
ZekrGUI.propTypes = {
  current: PropTypes.object.isRequired,
  storedCounts: PropTypes.object.isRequired,
};
export default ZekrGUI;
