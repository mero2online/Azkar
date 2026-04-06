import { useEffect, useRef, useState, useCallback } from 'react';
import { getMostRecentTime, zekrById } from './Data';
import PropTypes from 'prop-types';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp';
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import MenuIcon from '@mui/icons-material/Menu';
import SortIcon from '@mui/icons-material/Sort';
import { format, intervalToDuration } from 'date-fns';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import { useTheme, VIEW_MODES } from './ThemeContext';
import { useNavigate } from 'react-router-dom';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ViewDayIcon from '@mui/icons-material/ViewDay';
import HomeIcon from '@mui/icons-material/Home';

const ZekrGUI = ({ current, storedCounts }) => {
  const theme = useMuiTheme();
  const { viewMode, toggleViewMode, mode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isHorizontal = viewMode === VIEW_MODES.HORIZONTAL;
  const [mergedCount, setMergedCount] = useState();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [horizontalIndex, setHorizontalIndex] = useState(0);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [sortOrder, setSortOrder] = useState('default'); // 'default', 'asc', 'desc'
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [slideAnim, setSlideAnim] = useState(null); // 'slide-left' | 'slide-right' | 'enter-left' | 'enter-right' | null
  const [drawerOpen, setDrawerOpen] = useState(false);
  const btnRef = useRef(0);
  const elementRefs = useRef([]);
  const touchStartRef = useRef(null);
  const touchDeltaRef = useRef(0);

  // Sync indices when switching view modes
  useEffect(() => {
    if (isHorizontal) {
      // Switching to horizontal: find position of currentIndex in sorted order
      const sorted = getSortedIndices();
      const pos = sorted.indexOf(currentIndex);
      setHorizontalIndex(pos >= 0 ? pos : 0);
    } else {
      // Switching to vertical: scroll to the card that was shown in horizontal
      const sorted = getSortedIndices();
      const idx = sorted[horizontalIndex] ?? 0;
      setCurrentIndex(idx);
      setTimeout(() => {
        if (elementRefs.current[idx]) {
          scrollToElementByIndex(idx);
        }
      }, 100);
    }
  }, [isHorizontal]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Horizontal mode navigation
  const sortedIndices = getSortedIndices();

  const isAnimating = useRef(false);

  const goToNextCard = useCallback(() => {
    if (isAnimating.current) return;
    setHorizontalIndex((prev) => {
      if (prev >= sortedIndices.length - 1) return prev;
      isAnimating.current = true;
      setSwipeOffset(0);
      setSlideAnim('slide-right');
      setTimeout(() => {
        setHorizontalIndex((p) => Math.min(p + 1, sortedIndices.length - 1));
        setSlideAnim('enter-left');
        setTimeout(() => {
          setSlideAnim(null);
          isAnimating.current = false;
        }, 300);
      }, 250);
      return prev;
    });
  }, [sortedIndices.length]);

  const goToPrevCard = useCallback(() => {
    if (isAnimating.current) return;
    setHorizontalIndex((prev) => {
      if (prev <= 0) return prev;
      isAnimating.current = true;
      setSwipeOffset(0);
      setSlideAnim('slide-left');
      setTimeout(() => {
        setHorizontalIndex((p) => Math.max(p - 1, 0));
        setSlideAnim('enter-right');
        setTimeout(() => {
          setSlideAnim(null);
          isAnimating.current = false;
        }, 300);
      }, 250);
      return prev;
    });
  }, []);

  // Touch/swipe handlers for horizontal mode
  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = e.touches[0].clientX;
    touchDeltaRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchStartRef.current === null) return;
    const delta = e.touches[0].clientX - touchStartRef.current;
    touchDeltaRef.current = delta;
    setSwipeOffset(delta);
  }, []);

  const handleTouchEnd = useCallback(() => {
    const SWIPE_THRESHOLD = 60;
    if (touchDeltaRef.current > SWIPE_THRESHOLD) {
      goToNextCard(); // swipe right (RTL) -> next
    } else if (touchDeltaRef.current < -SWIPE_THRESHOLD) {
      goToPrevCard(); // swipe left (RTL) -> prev
    } else {
      setSwipeOffset(0);
    }
    touchStartRef.current = null;
    touchDeltaRef.current = 0;
  }, [goToNextCard, goToPrevCard]);

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
        
        </Box>
      );
    }
  };

  // Compute status data for use in both modes
  const getStatusData = () => {
    if (!mergedCount) return null;
    let myCurrentStatus = {};
    zekrById(current.id).forEach((element, idx) => {
      myCurrentStatus[idx] = {
        status: mergedCount[idx].count === mergedCount[idx].counterNum,
      };
    });
    const activeCount = Object.values(myCurrentStatus).filter((item) => item.status).length;
    const allLength = zekrById(current.id).length;
    const statusTxt = activeCount === allLength ? 'Completed' : 'InProgress';
    const statusBg = activeCount === allLength ? theme.palette.success.main : theme.palette.warning.main;
    const statusColor = activeCount === allLength ? theme.palette.success.contrastText : theme.palette.warning.contrastText;
    const firstFalseIndex = Object.entries(myCurrentStatus).find(([, value]) => value.status === false)?.[0];
    const getData = getMostRecentTime(mergedCount);
    const time = getData['time'];
    const index = getData['index'];
    const disabledBtn = time === 'No valid timestamps found.';
    return { activeCount, allLength, statusTxt, statusBg, statusColor, firstFalseIndex, time, index, disabledBtn };
  };

  if (!mergedCount) return <div> Loading </div>;

  const statusData = getStatusData();

  return (
    <>
      {isHorizontal ? (
        /* ========== HORIZONTAL MODE — full viewport fit ========== */
        <Box
          sx={{
            height: '100dvh',
            width: '100vw',
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            overflowX: 'hidden',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 900,
            backgroundColor: theme.palette.background.default,
          }}
        >
          {/* Top bar: menu button + title + status indicator */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1,
              py: 0.5,
              borderBottom: `1px solid ${theme.palette.divider}`,
              flexShrink: 0,
            }}
          >
            <IconButton onClick={() => setDrawerOpen(true)} color='inherit'>
              <MenuIcon />
            </IconButton>
            <Typography
              variant='subtitle1'
              sx={{
                fontWeight: 'bold',
                flex: 1,
                textAlign: 'center',
                fontSize: 'clamp(0.9rem, 3vw, 1.3rem)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                mx: 1,
              }}
            >
              {current.name}
            </Typography>
            {statusData && (
              <Box
                sx={{
                  backgroundColor: statusData.statusBg,
                  color: statusData.statusColor,
                  px: 1,
                  py: 0.3,
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  flexShrink: 0,
                }}
              >
                {statusData.activeCount}/{statusData.allLength}
              </Box>
            )}
          </Box>

          {/* Card indicator */}
          <Typography variant='body2' sx={{ textAlign: 'center', py: 0.5, flexShrink: 0, fontWeight: 'bold' }}>
            {horizontalIndex + 1} / {sortedIndices.length}
          </Typography>

          {/* Zekr text area — scrollable, takes remaining space */}
          {(() => {
            const zekrItems = zekrById(current.id);
            const i = sortedIndices[horizontalIndex];
            const z = zekrItems[i];
            const getActiveColor = () => {
              if (mergedCount[i].count === 0) return theme.palette.primary.main;
              if (mergedCount[i].count === mergedCount[i].counterNum) return theme.palette.error.main;
              return theme.palette.info.main;
            };

            return (
              <>
                {/* Scrollable zekr text */}
                <Box
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  key={`zekr-h-${z.id}`}
                  sx={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    touchAction: 'pan-y',
                    direction: 'rtl',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 1.5,
                    py: 1,
                    wordBreak: 'break-word',
                    transition: slideAnim || swipeOffset === 0 ? 'transform 0.25s ease, opacity 0.25s ease' : 'none',
                    transform:
                      slideAnim === 'slide-left' ? 'translateX(-110%)'
                      : slideAnim === 'slide-right' ? 'translateX(110%)'
                      : slideAnim === 'enter-left' ? 'translateX(0)'
                      : slideAnim === 'enter-right' ? 'translateX(0)'
                      : `translateX(${swipeOffset}px)`,
                    opacity: slideAnim === 'slide-left' || slideAnim === 'slide-right' ? 0 : 1,
                  }}
                >
                  <Typography
                    variant='h6'
                    className='arabicfont zekr-style'
                    sx={{ fontSize: 'clamp(1.1rem, 4vw, 1.6rem)' }}
                  >
                    {z.description}
                  </Typography>
                </Box>

                {/* Fixed bottom section: buttons + status + nav */}
                <Box
                  sx={{
                    flexShrink: 0,
                    borderTop: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.default,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    py: 0.5,
                    gap: 0.5,
                  }}
                >
                  {/* Counter buttons */}
                  <Box>
                    <Button
                      variant='contained'
                      color='warning'
                      size='small'
                      onClick={() => {
                        setMergedCount((prev) => ({
                          ...prev,
                          [i]: { ...prev[i], count: 0, dateTime: '' },
                        }));
                      }}
                      sx={{ m: 0.3, minWidth: 'auto' }}
                    >
                      <RestartAltIcon fontSize='small' />
                    </Button>
                    <Button variant='contained' color='info' size='small' sx={{ m: 0.3, minWidth: '50px' }}>
                      {mergedCount[i].counterNum}
                    </Button>
                    <Button variant='contained' color='success' size='small' sx={{ m: 0.3, minWidth: '50px' }}>
                      {mergedCount[i].count}
                    </Button>
                  </Box>

                  {/* Fingerprint button */}
                  <button
                    className='MyCountBtn'
                    style={{
                      backgroundColor: getActiveColor(),
                      transition: 'background-color 0.3s ease',
                      width: '70px',
                      height: '70px',
                      padding: '0px 0px 70px',
                    }}
                    onClick={() => {
                      const currentCount = mergedCount[i];
                      const isAlreadyComplete = currentCount.count === currentCount.counterNum;
                      if (isAlreadyComplete) {
                        goToNextCard();
                        return;
                      }
                      setMergedCount((prev) => {
                        const currentCount = prev[i];
                        const shouldIncrement = currentCount.count < currentCount.counterNum;
                        const willComplete = currentCount.count === currentCount.counterNum - 1;
                        if (shouldIncrement && willComplete) {
                          setTimeout(() => goToNextCard(), 100);
                        }
                        return {
                          ...prev,
                          [i]: {
                            ...currentCount,
                            count: shouldIncrement ? currentCount.count + 1 : currentCount.count,
                            dateTime: shouldIncrement ? new Date() : currentCount.dateTime,
                          },
                        };
                      });
                    }}
                  >
                    <div className='fingerPrintDiv' style={{ width: '70px', height: '70px' }}>
                      <FingerprintIcon className='fingerPrintSVG' />
                    </div>
                  </button>

                  {/* Timestamp */}
                  <Typography variant='caption' sx={{ color: 'text.secondary', lineHeight: 1.2 }}>
                    {mergedCount[i].dateTime
                      ? format(mergedCount[i].dateTime, 'dd-MM-yyyy hh:mm:ss.SS a')
                      : '_-_'}
                  </Typography>
                  <Typography variant='caption' sx={{ color: 'text.secondary', fontStyle: 'italic', lineHeight: 1.2 }}>
                    {mergedCount[i].dateTime
                      ? getTimeSince(mergedCount[i].dateTime, 'short')
                      : '-_-'}
                  </Typography>

                  {/* Navigation buttons */}
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant='contained'
                      color='primary'
                      disabled={horizontalIndex === 0}
                      onClick={goToPrevCard}
                      startIcon={<NavigateNextIcon />}
                      size='small'
                    >
                      السابق
                    </Button>
                    <Button
                      variant='contained'
                      color='primary'
                      disabled={horizontalIndex === sortedIndices.length - 1}
                      onClick={goToNextCard}
                      endIcon={<NavigateBeforeIcon />}
                      size='small'
                    >
                      التالي
                    </Button>
                  </Box>
                </Box>
              </>
            );
          })()}

          {/* Side drawer with all controls */}
          <Drawer
            anchor='right'
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          >
            <Box sx={{ width: 280, p: 2, direction: 'rtl' }}>
              <Typography variant='h6' sx={{ mb: 2, fontWeight: 'bold' }}>
                {current.name}
              </Typography>

              {/* Status */}
              {statusData && (
                <Box sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      backgroundColor: statusData.statusBg,
                      color: statusData.statusColor,
                      display: 'inline-block',
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                    }}
                  >
                    {statusData.statusTxt}: {statusData.activeCount}/{statusData.allLength}
                  </Box>
                </Box>
              )}

              {/* Navigation buttons */}
              {statusData && (
                <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant='contained'
                    color='primary'
                    fullWidth
                    startIcon={<ArrowCircleDownIcon />}
                    onClick={() => {
                      if (statusData.firstFalseIndex) {
                        const sorted = getSortedIndices();
                        const pos = sorted.indexOf(Number(statusData.firstFalseIndex));
                        setHorizontalIndex(pos >= 0 ? pos : 0);
                      } else {
                        setHorizontalIndex(0);
                      }
                      setDrawerOpen(false);
                    }}
                  >
                    Go To First Count
                  </Button>
                  <Button
                    disabled={statusData.disabledBtn}
                    variant='contained'
                    color={statusData.disabledBtn ? 'error' : 'primary'}
                    fullWidth
                    startIcon={<ArrowCircleDownIcon />}
                    onClick={() => {
                      const sorted = getSortedIndices();
                      const pos = sorted.indexOf(statusData.index);
                      setHorizontalIndex(pos >= 0 ? pos : 0);
                      setDrawerOpen(false);
                    }}
                  >
                    Go To Last Time
                  </Button>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    Last Time: {statusData.time}
                  </Typography>
                  {!statusData.disabledBtn && mergedCount[statusData.index]?.dateTime && (
                    <Typography variant='body2' sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                      {getTimeSince(mergedCount[statusData.index].dateTime, 'long')}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Sort & Reset */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant='contained'
                  color={sortOrder !== 'default' ? 'secondary' : 'primary'}
                  fullWidth
                  startIcon={<SortIcon />}
                  onClick={() => {
                    setSortOrder((prev) => {
                      if (prev === 'default') return 'asc';
                      if (prev === 'asc') return 'desc';
                      return 'default';
                    });
                  }}
                >
                  {sortOrder === 'default' ? 'Sort: Default' : sortOrder === 'asc' ? 'Sort: Asc ↑' : 'Sort: Desc ↓'}
                </Button>
                <Button
                  variant='contained'
                  color='error'
                  fullWidth
                  startIcon={<RestartAltIcon />}
                  onClick={() => {
                    setDrawerOpen(false);
                    setOpenResetDialog(true);
                  }}
                >
                  Reset All
                </Button>

                {/* Home, Theme & View Mode toggles */}
                <Button
                  variant='outlined'
                  fullWidth
                  startIcon={<HomeIcon />}
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate('/');
                  }}
                >
                  Home
                </Button>
                <Button
                  variant='outlined'
                  fullWidth
                  startIcon={mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                  onClick={toggleTheme}
                >
                  {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </Button>
                <Button
                  variant='outlined'
                  fullWidth
                  startIcon={<ViewDayIcon />}
                  onClick={() => {
                    setDrawerOpen(false);
                    toggleViewMode();
                  }}
                >
                  Vertical Mode
                </Button>
              </Box>
            </Box>
          </Drawer>
        </Box>
      ) : (
        /* ========== VERTICAL MODE (original) ========== */
        <>
          <h1 style={{
            fontSize: 'clamp(1.5rem, 6vw, 2.5rem)',
            whiteSpace: 'nowrap',
            margin: '1rem 0',
            textAlign: 'center',
          }}>{current.name}</h1>
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

                        if (isAlreadyComplete) {
                          handleNext(i);
                          return;
                        }

                        scrollToElementByIndex(i);
                        setCurrentIndex(i);

                        setMergedCount((prev) => {
                          const currentCount = prev[i];
                          const shouldIncrement =
                            currentCount.count < currentCount.counterNum;
                          const willComplete = currentCount.count === currentCount.counterNum - 1;

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
        </>
      )}

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
