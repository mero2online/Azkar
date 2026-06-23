import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Box, Typography, TextField, CircularProgress, MenuItem } from '@mui/material';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import HomeIcon from '@mui/icons-material/Home';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import {
  loadCachedLocation,
  saveLocation,
  clearLocation,
  fetchWithCacheFallback,
  fetchMonthWithCacheFallback,
  loadIqamaSettings,
  saveIqamaSettings,
  DEFAULT_IQAMA,
  loadCalculationMethod,
  saveCalculationMethod,
  CALCULATION_METHODS,
} from './PrayerTimesData';

const PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const PRAYER_NAME_AR = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

// Parse "HH:mm" into a Date today
const parseTimeToday = (hhmm, baseDate) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
};

const formatRemaining = (ms) => {
  if (ms <= 0) return 'now';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `in ${h}h ${m}m`;
  if (m > 0) return `in ${m}m`;
  const s = Math.floor((ms % 60000) / 1000);
  return `in ${s}s`;
};

// Add N minutes to "HH:mm" (24h) and return new "HH:mm" wrapped within the same day
const addMinutesHHmm = (hhmm, minutes) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  let total = h * 60 + m + minutes;
  total = ((total % 1440) + 1440) % 1440;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
};

const formatTime12 = (hhmm) => {
  if (!hhmm) return '—';
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, '0');
  return `${h12}:${mm} ${period}`;
};

const formatElapsed = (ms) => {
  if (ms < 0) return '';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
};

function PrayerTimes() {
  const theme = useMuiTheme();
  const navigate = useNavigate();

  const [location, setLocation] = useState(() => loadCachedLocation());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [needsManualEntry, setNeedsManualEntry] = useState(false);
  const [now, setNow] = useState(new Date());
  const [cityInput, setCityInput] = useState('');
  const [countryInput, setCountryInput] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [iqama, setIqama] = useState(() => loadIqamaSettings());
  const [iqamaDialogOpen, setIqamaDialogOpen] = useState(false);
  const [iqamaDraft, setIqamaDraft] = useState(iqama);
  const [calcMethod, setCalcMethod] = useState(() => loadCalculationMethod());
  const [methodDraft, setMethodDraft] = useState(calcMethod);
  const [monthData, setMonthData] = useState(null);
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthError, setMonthError] = useState('');
  const [monthStale, setMonthStale] = useState(false);
  const [monthFetchedAt, setMonthFetchedAt] = useState(null);

  // Live tick for countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const doFetch = async (loc) => {
    setLoading(true);
    setError('');
    setStale(false);
    try {
      const result = await fetchWithCacheFallback(loc, new Date());
      setData(result.data);
      setStale(result.stale);
      setFetchedAt(result.fetchedAt);
    } catch (e) {
      setError(e.message || 'Failed to fetch prayer times');
    } finally {
      setLoading(false);
    }
  };

  const loadMonth = async (loc) => {
    if (!loc) return;
    setMonthLoading(true);
    setMonthError('');
    setMonthStale(false);
    try {
      const today = new Date();
      const result = await fetchMonthWithCacheFallback(loc, today.getFullYear(), today.getMonth() + 1);
      setMonthData(result.data);
      setMonthStale(result.stale);
      setMonthFetchedAt(result.fetchedAt);
    } catch (e) {
      setMonthError(e.message || 'Failed to fetch monthly times');
    } finally {
      setMonthLoading(false);
    }
  };

  const loadEarlierMonth = async () => {
    if (!location || !monthData || monthData.length === 0) return;
    // Determine earliest loaded date from data[0].date.gregorian.date "DD-MM-YYYY"
    const firstStr = monthData[0]?.date?.gregorian?.date;
    if (!firstStr) return;
    const [, mm, yyyy] = firstStr.split('-').map((n) => parseInt(n, 10));
    // Previous month
    let pm = mm - 1;
    let py = yyyy;
    if (pm < 1) { pm = 12; py = yyyy - 1; }
    setMonthLoading(true);
    setMonthError('');
    try {
      const result = await fetchMonthWithCacheFallback(location, py, pm);
      // Prepend, dedupe by gregorian date
      const existingDates = new Set(monthData.map((e) => e?.date?.gregorian?.date));
      const newEntries = result.data.filter((e) => !existingDates.has(e?.date?.gregorian?.date));
      setMonthData([...newEntries, ...monthData]);
      setMonthFetchedAt(result.fetchedAt);
    } catch (e) {
      setMonthError(e.message || 'Failed to fetch earlier month');
    } finally {
      setMonthLoading(false);
    }
  };

  const loadNextMonth = async () => {
    if (!location || !monthData || monthData.length === 0) return;
    const lastStr = monthData[monthData.length - 1]?.date?.gregorian?.date;
    if (!lastStr) return;
    const [, mm, yyyy] = lastStr.split('-').map((n) => parseInt(n, 10));
    let nm = mm + 1;
    let ny = yyyy;
    if (nm > 12) { nm = 1; ny = yyyy + 1; }
    setMonthLoading(true);
    setMonthError('');
    try {
      const result = await fetchMonthWithCacheFallback(location, ny, nm);
      const existingDates = new Set(monthData.map((e) => e?.date?.gregorian?.date));
      const newEntries = result.data.filter((e) => !existingDates.has(e?.date?.gregorian?.date));
      setMonthData([...monthData, ...newEntries]);
      setMonthFetchedAt(result.fetchedAt);
    } catch (e) {
      setMonthError(e.message || 'Failed to fetch next month');
    } finally {
      setMonthLoading(false);
    }
  };

  const toggleChart = () => {
    const next = !showChart;
    setShowChart(next);
    if (next && !monthData && location) loadMonth(location);
  };

  const askGeolocation = () => {
    if (!('geolocation' in navigator)) {
      setNeedsManualEntry(true);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          kind: 'coords',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        saveLocation(loc);
        setLocation(loc);
        doFetch(loc);
      },
      () => {
        setLoading(false);
        setNeedsManualEntry(true);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  // Initial load
  useEffect(() => {
    if (location) {
      doFetch(location);
    } else {
      askGeolocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitManual = (e) => {
    e.preventDefault();
    if (!cityInput.trim() || !countryInput.trim()) return;
    const loc = {
      kind: 'city',
      city: cityInput.trim(),
      country: countryInput.trim(),
      label: `${cityInput.trim()}, ${countryInput.trim()}`,
    };
    saveLocation(loc);
    setLocation(loc);
    setNeedsManualEntry(false);
    doFetch(loc);
  };

  const changeLocation = () => {
    clearLocation();
    setLocation(null);
    setData(null);
    setStale(false);
    setError('');
    setNeedsManualEntry(false);
    askGeolocation();
  };

  // Compute next prayer + countdown
  const nextPrayer = useMemo(() => {
    if (!data?.timings) return null;
    for (const name of PRAYER_ORDER) {
      const t = parseTimeToday(data.timings[name], now);
      if (t && t > now) {
        return { name, time: data.timings[name], remainingMs: t - now, tomorrow: false };
      }
    }
    // All passed — next is Fajr tomorrow
    return { name: 'Fajr', time: data.timings.Fajr, remainingMs: null, tomorrow: true };
  }, [data, now]);

  const cardSx = {
    backgroundColor: theme.palette.background.paper,
    borderRadius: '8px',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 2px 8px rgba(0,0,0,0.3)'
        : '0 2px 8px rgba(0,0,0,0.1)',
    p: 2,
    mb: 2,
  };

  return (
    <Box sx={{ maxWidth: '600px', margin: '0 auto', px: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 2 }}>
        <Button
          variant='contained'
          color='info'
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
        >
          Home
        </Button>
        <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
          Prayer Times
        </Typography>
      </Box>

      {/* Date strip */}
      <Box sx={cardSx}>
        <Typography variant='body1' sx={{ fontWeight: 'bold' }}>
          {format(now, 'EEEE, dd MMM yyyy')}
        </Typography>
        {data?.date?.hijri && (
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {data.date.hijri.day} {data.date.hijri.month?.en} {data.date.hijri.year} AH
            {data.date.hijri.month?.ar ? ` — ${data.date.hijri.month.ar}` : ''}
          </Typography>
        )}
        {location?.kind === 'coords' && (
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            Location: {Number(location.lat).toFixed(2)}, {Number(location.lng).toFixed(2)}
          </Typography>
        )}
        {location?.kind === 'city' && (
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            Location: {location.label}
          </Typography>
        )}
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && needsManualEntry && (
        <Box sx={cardSx} component='form' onSubmit={submitManual}>
          <Typography variant='body1' sx={{ fontWeight: 'bold', mb: 1 }}>
            Enter your city
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary', mb: 2 }}>
            Location access was denied or unavailable.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              label='City'
              size='small'
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label='Country'
              size='small'
              value={countryInput}
              onChange={(e) => setCountryInput(e.target.value)}
              required
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button type='submit' variant='contained' color='primary' fullWidth>
                Submit
              </Button>
              <Button
                variant='outlined'
                startIcon={<MyLocationIcon />}
                onClick={() => {
                  setNeedsManualEntry(false);
                  askGeolocation();
                }}
              >
                Use GPS
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {!loading && error && !data && (
        <Box sx={{ ...cardSx, borderLeft: `4px solid ${theme.palette.error.main}` }}>
          <Typography variant='body1' sx={{ color: theme.palette.error.main, mb: 1 }}>
            {error}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant='contained'
              startIcon={<RefreshIcon />}
              onClick={() => location && doFetch(location)}
            >
              Retry
            </Button>
            <Button variant='outlined' onClick={() => setNeedsManualEntry(true)}>
              Enter city manually
            </Button>
          </Box>
        </Box>
      )}

      {data && nextPrayer && (
        <Box
          sx={{
            ...cardSx,
            backgroundColor: theme.palette.success.main,
            color: theme.palette.success.contrastText,
            textAlign: 'center',
          }}
        >
          <Typography variant='body2' sx={{ opacity: 0.85 }}>
            Next prayer
          </Typography>
          <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
            {nextPrayer.name}
            {PRAYER_NAME_AR[nextPrayer.name] && (
              <Typography component='span' variant='h5' sx={{ ml: 1, fontWeight: 'bold' }}>
                — {PRAYER_NAME_AR[nextPrayer.name]}
              </Typography>
            )}
            {nextPrayer.tomorrow && (
              <Typography component='span' variant='body2' sx={{ ml: 1, opacity: 0.85 }}>
                (tomorrow)
              </Typography>
            )}
          </Typography>
          <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
            {formatTime12(nextPrayer.time)}
          </Typography>
          {!nextPrayer.tomorrow && (
            <Typography variant='body1' sx={{ mt: 0.5 }}>
              {formatRemaining(nextPrayer.remainingMs)}
            </Typography>
          )}
        </Box>
      )}

      {data && (
        <Box sx={cardSx}>
          {PRAYER_ORDER.map((name) => {
            const time = data.timings?.[name];
            const isNext = nextPrayer && !nextPrayer.tomorrow && nextPrayer.name === name;
            const prayerDate = parseTimeToday(time, now);
            const isPassed = prayerDate && prayerDate < now;
            // Active highlight window = iqama * 2 minutes after adhan (per prayer).
            // Prayers without an iqama setting (e.g., Sunrise) have no active window.
            const iqamaMin = iqama[name];
            const activeWindowMs = Number.isFinite(iqamaMin) ? iqamaMin * 2 * 60 * 1000 : 0;
            const isCurrent = isPassed && activeWindowMs > 0 && (now - prayerDate) < activeWindowMs;
            const DAY_MS = 24 * 60 * 60 * 1000;
            // Time since most recent occurrence (today if passed, else yesterday)
            const agoMs = prayerDate
              ? (isPassed ? now - prayerDate : now - (prayerDate.getTime() - DAY_MS))
              : null;
            // Time until next occurrence (today if not yet passed, else tomorrow)
            const inMs = prayerDate
              ? (isPassed ? (prayerDate.getTime() + DAY_MS) - now : prayerDate - now)
              : null;
            const agoLabel = agoMs != null ? formatElapsed(agoMs) : '';
            const inLabel = inMs != null ? formatRemaining(inMs) : '';
            return (
              <Box
                key={name}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  px: 1,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  backgroundColor: isCurrent
                    ? `${theme.palette.warning.main}33`
                    : isNext
                    ? `${theme.palette.success.main}22`
                    : 'transparent',
                  borderLeft: isCurrent
                    ? `4px solid ${theme.palette.warning.main}`
                    : isNext
                    ? `4px solid ${theme.palette.success.main}`
                    : '4px solid transparent',
                  borderRadius: '4px',
                  opacity: isPassed && !isCurrent ? 0.7 : 1,
                }}
              >
                <Box>
                  <Typography variant='body1' sx={{ fontWeight: isNext || isCurrent ? 'bold' : 'normal' }}>
                    {name}
                    {PRAYER_NAME_AR[name] && (
                      <Typography component='span' variant='body2' sx={{ color: 'text.secondary', ml: 1 }}>
                        {PRAYER_NAME_AR[name]}
                      </Typography>
                    )}
                  </Typography>
                  {inLabel && (
                    <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                      {inLabel}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ textAlign: 'center', minWidth: '110px' }}>
                  <Typography variant='body1' sx={{ fontWeight: isNext || isCurrent ? 'bold' : 'normal' }}>
                    {formatTime12(time)}
                  </Typography>
                  {iqama[name] != null && prayerDate && (
                    <Typography variant='caption' sx={{ color: theme.palette.info.main, display: 'block', fontWeight: 'bold' }}>
                      Iqama: {formatTime12(addMinutesHHmm(time, iqama[name]))}
                    </Typography>
                  )}
                  {agoLabel && (
                    <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                      {agoLabel}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {data && stale && fetchedAt && (
        <Box sx={{ ...cardSx, backgroundColor: theme.palette.warning.main, color: theme.palette.warning.contrastText }}>
          <Typography variant='body2'>
            Showing cached data from {format(parseISO(fetchedAt), 'dd MMM yyyy, hh:mm a')} — couldn&apos;t refresh.
          </Typography>
        </Box>
      )}

      {data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, my: 2, flexWrap: 'wrap' }}>
          <Button
            variant='outlined'
            startIcon={<RefreshIcon />}
            onClick={() => location && doFetch(location)}
          >
            Refresh
          </Button>
          <Button
            variant='outlined'
            color='primary'
            startIcon={<ShowChartIcon />}
            onClick={toggleChart}
          >
            {showChart ? 'Hide chart' : 'Monthly chart'}
          </Button>
          <Button
            variant='outlined'
            color='primary'
            startIcon={<SettingsIcon />}
            onClick={() => {
              setIqamaDraft(iqama);
              setMethodDraft(calcMethod);
              setIqamaDialogOpen(true);
            }}
          >
            Settings
          </Button>
          <Button variant='outlined' color='secondary' onClick={changeLocation}>
            Change location
          </Button>
        </Box>
      )}

      <Dialog
        open={iqamaDialogOpen}
        onClose={() => setIqamaDialogOpen(false)}
        aria-labelledby='iqama-dialog-title'
        disableRestoreFocus
      >
        <DialogTitle id='iqama-dialog-title'>Settings</DialogTitle>
        <DialogContent>
          <Typography variant='body2' sx={{ fontWeight: 'bold', mb: 1 }}>
            Calculation method
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            Choose the method that matches your country / region.
          </Typography>
          <TextField
            select
            size='small'
            value={methodDraft}
            onChange={(e) => setMethodDraft(parseInt(e.target.value, 10))}
            fullWidth
            SelectProps={{
              MenuProps: { PaperProps: { sx: { maxHeight: 320 } } },
            }}
            sx={{ mb: 3 }}
          >
            {CALCULATION_METHODS.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}
              </MenuItem>
            ))}
          </TextField>

          <Typography variant='body2' sx={{ fontWeight: 'bold', mb: 1 }}>
            Iqama offsets (minutes after adhan)
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {Object.keys(DEFAULT_IQAMA).map((p) => (
              <TextField
                key={p}
                label={p}
                type='number'
                size='small'
                inputProps={{ min: 0, max: 120 }}
                value={iqamaDraft[p] ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                  setIqamaDraft({ ...iqamaDraft, [p]: Number.isNaN(v) ? '' : v });
                }}
                fullWidth
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setIqamaDraft({ ...DEFAULT_IQAMA }); }}
            color='inherit'
          >
            Defaults
          </Button>
          <Button onClick={() => setIqamaDialogOpen(false)} variant='contained' color='primary' autoFocus>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const cleaned = {};
              for (const k of Object.keys(DEFAULT_IQAMA)) {
                const v = iqamaDraft[k];
                cleaned[k] = Number.isFinite(v) && v >= 0 ? v : DEFAULT_IQAMA[k];
              }
              setIqama(cleaned);
              saveIqamaSettings(cleaned);

              const methodChanged = methodDraft !== calcMethod;
              if (methodChanged) {
                setCalcMethod(methodDraft);
                saveCalculationMethod(methodDraft);
                // Re-fetch today's data with the new method; clear month chart cache so it re-fetches when opened
                setMonthData(null);
                if (location) doFetch(location);
              }
              setIqamaDialogOpen(false);
            }}
            variant='contained'
            color='success'
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {showChart && (
        <Box sx={cardSx}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
              Monthly chart
            </Typography>
            {monthData && monthData.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size='small'
                  variant='outlined'
                  onClick={loadEarlierMonth}
                  disabled={monthLoading}
                >
                  + Earlier month
                </Button>
                <Button
                  size='small'
                  variant='outlined'
                  onClick={loadNextMonth}
                  disabled={monthLoading}
                >
                  Next month +
                </Button>
              </Box>
            )}
          </Box>
          {monthLoading && !monthData && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          )}
          {!monthLoading && monthError && !monthData && (
            <Typography variant='body2' sx={{ color: theme.palette.error.main }}>
              {monthError}
            </Typography>
          )}
          {monthData && (
            <>
              <MonthlyChart data={monthData} theme={theme} />
              {monthLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <CircularProgress size={20} />
                </Box>
              )}
              {monthError && (
                <Typography variant='caption' sx={{ color: theme.palette.error.main, display: 'block', mt: 1 }}>
                  {monthError}
                </Typography>
              )}
              {monthStale && monthFetchedAt && (
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                  Showing cached chart from {format(parseISO(monthFetchedAt), 'dd MMM yyyy, hh:mm a')}
                </Typography>
              )}
              <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                Showing {monthData.length} days
              </Typography>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

const CHART_PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const CHART_COLORS = {
  Fajr: '#3182ce',
  Sunrise: '#dd6b20',
  Dhuhr: '#d69e2e',
  Asr: '#38a169',
  Maghrib: '#805ad5',
  Isha: '#e53e3e',
};

// Parse "HH:mm" (with possible trailing " (TZ)") to minutes from midnight
const parseHHmmToMin = (raw) => {
  if (!raw) return null;
  const s = raw.split(' ')[0];
  const [h, m] = s.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const formatMinTo12 = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

function MonthlyChart({ data, theme }) {
  const days = data.length;
  const [hoveredDay, setHoveredDay] = useState(null);

  // Day's prayer times for tooltip
  const hoveredEntry = hoveredDay != null && hoveredDay >= 1 && hoveredDay <= days
    ? data[hoveredDay - 1]
    : null;

  return (
    <Box>
      {/* Tooltip — shows all prayer times for the hovered day */}
      <Box
        sx={{
          minHeight: 64,
          mb: 1,
          p: 1,
          borderRadius: '6px',
          backgroundColor: hoveredEntry ? theme.palette.action.hover : 'transparent',
          border: `1px solid ${hoveredEntry ? theme.palette.divider : 'transparent'}`,
        }}
      >
        {hoveredEntry ? (
          <>
            <Typography variant='body2' sx={{ fontWeight: 'bold', mb: 0.5 }}>
              Day {hoveredDay}
              {hoveredEntry?.date?.gregorian?.date && ` — ${hoveredEntry.date.gregorian.date}`}
              {hoveredEntry?.date?.hijri && (
                <Typography component='span' variant='caption' sx={{ color: 'text.secondary', ml: 1 }}>
                  ({hoveredEntry.date.hijri.day} {hoveredEntry.date.hijri.month?.en} {hoveredEntry.date.hijri.year} AH)
                </Typography>
              )}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {CHART_PRAYERS.map((p) => {
                const mins = parseHHmmToMin(hoveredEntry?.timings?.[p]);
                return (
                  <Box key={p} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, backgroundColor: CHART_COLORS[p], borderRadius: '2px' }} />
                    <Typography variant='caption' sx={{ fontWeight: 'bold' }}>{p}:</Typography>
                    <Typography variant='caption'>{mins != null ? formatMinTo12(mins) : '—'}</Typography>
                  </Box>
                );
              })}
            </Box>
          </>
        ) : (
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            Hover or tap a chart to see all prayer times for that day.
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        {CHART_PRAYERS.map((p) => {
          const series = data
            .map((entry, i) => ({ day: i + 1, mins: parseHHmmToMin(entry?.timings?.[p]) }))
            .filter((d) => d.mins != null);
          return (
            <PrayerMiniChart
              key={p}
              prayer={p}
              series={series}
              days={days}
              entries={data}
              theme={theme}
              hoveredDay={hoveredDay}
              onHover={setHoveredDay}
            />
          );
        })}
      </Box>
    </Box>
  );
}

function PrayerMiniChart({ prayer, series, days, entries, theme, hoveredDay, onHover }) {
  if (series.length === 0) {
    return (
      <Box>
        <Typography variant='subtitle2' sx={{ fontWeight: 'bold' }}>{prayer}</Typography>
        <Typography variant='caption' sx={{ color: 'text.secondary' }}>No data</Typography>
      </Box>
    );
  }

  // Auto-scale Y to this prayer's own range with a small padding so flat months still show some line
  const minsVals = series.map((d) => d.mins);
  let yMin = Math.min(...minsVals);
  let yMax = Math.max(...minsVals);
  const span = Math.max(10, yMax - yMin); // at least 10-min span to avoid divide-by-zero / flat line
  const pad = Math.max(2, Math.round(span * 0.15));
  yMin = yMin - pad;
  yMax = yMax + pad;
  const totalSpan = yMax - yMin;

  // Layout
  const W = 320;
  const H = 140;
  const padL = 56;
  const padR = 8;
  const padT = 18;
  const padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xScale = (day) => padL + ((day - 1) * innerW) / Math.max(1, days - 1);
  const yScale = (mins) => padT + innerH - ((mins - yMin) * innerH) / totalSpan;

  // Show min/mid/max time labels on Y
  const yTicks = [yMin, (yMin + yMax) / 2, yMax];

  // X tick labels — use month boundaries when we have entries metadata
  let xTicks = [];
  let xLabelOf = (d) => String(d); // fallback: just the day number
  if (entries && entries.length > 0) {
    // Detect first day of each month + the last day
    let prevMonth = null;
    for (let i = 0; i < entries.length; i++) {
      const greg = entries[i]?.date?.gregorian?.date; // "DD-MM-YYYY"
      if (!greg) continue;
      const [, mm] = greg.split('-').map((n) => parseInt(n, 10));
      if (mm !== prevMonth) {
        xTicks.push(i + 1);
        prevMonth = mm;
      }
    }
    if (xTicks[xTicks.length - 1] !== days) xTicks.push(days);
    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    xLabelOf = (d) => {
      const greg = entries[d - 1]?.date?.gregorian?.date;
      if (!greg) return String(d);
      const [dd, mm] = greg.split('-').map((n) => parseInt(n, 10));
      return `${dd} ${monthShort[mm - 1]}`;
    };
  } else {
    xTicks = [1, 10, 20, days].filter((v, i, arr) => arr.indexOf(v) === i && v <= days);
  }

  // Trend: compare last vs first (positive = later, negative = earlier)
  const first = series[0].mins;
  const last = series[series.length - 1].mins;
  const diff = last - first;
  const trendLabel = diff === 0
    ? '±0 min'
    : `${diff > 0 ? '+' : ''}${diff} min`;
  const trendColor = diff > 0 ? theme.palette.error.main : diff < 0 ? theme.palette.success.main : theme.palette.text.secondary;

  const linePath = series
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xScale(pt.day)} ${yScale(pt.mins)}`)
    .join(' ');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 'bold', color: CHART_COLORS[prayer] }}>
          {prayer}
        </Typography>
        <Typography variant='caption' sx={{ color: trendColor, fontWeight: 'bold' }}>
          {trendLabel}
        </Typography>
      </Box>
      <svg width={W} height={H} style={{ display: 'block', maxWidth: '100%' }}>
        {/* Y gridlines + labels */}
        {yTicks.map((t) => {
          const y = yScale(t);
          return (
            <g key={t}>
              <line
                x1={padL}
                x2={padL + innerW}
                y1={y}
                y2={y}
                stroke={theme.palette.divider}
                strokeDasharray='3 3'
              />
              <text x={padL - 6} y={y + 4} fontSize='10' fill={theme.palette.text.secondary} textAnchor='end'>
                {formatMinTo12(Math.round(t))}
              </text>
            </g>
          );
        })}

        {/* X tick labels */}
        {xTicks.map((d) => (
          <text
            key={d}
            x={xScale(d)}
            y={padT + innerH + 14}
            fontSize='9'
            fill={theme.palette.text.secondary}
            textAnchor='middle'
          >
            {xLabelOf(d)}
          </text>
        ))}

        {/* Line */}
        <path d={linePath} fill='none' stroke={CHART_COLORS[prayer]} strokeWidth='2' />
        {series.map((pt) => (
          <circle key={pt.day} cx={xScale(pt.day)} cy={yScale(pt.mins)} r='2.2' fill={CHART_COLORS[prayer]}>
            <title>{`Day ${pt.day}: ${formatMinTo12(pt.mins)}`}</title>
          </circle>
        ))}

        {/* Hovered vertical line + highlighted point */}
        {hoveredDay && hoveredDay >= 1 && hoveredDay <= days && (
          <>
            <line
              x1={xScale(hoveredDay)}
              x2={xScale(hoveredDay)}
              y1={padT}
              y2={padT + innerH}
              stroke={theme.palette.text.primary}
              strokeOpacity='0.4'
              strokeWidth='1'
              strokeDasharray='3 3'
              pointerEvents='none'
            />
            {(() => {
              const pt = series.find((s) => s.day === hoveredDay);
              if (!pt) return null;
              return (
                <circle
                  cx={xScale(pt.day)}
                  cy={yScale(pt.mins)}
                  r='4'
                  fill={CHART_COLORS[prayer]}
                  stroke={theme.palette.background.paper}
                  strokeWidth='1.5'
                  pointerEvents='none'
                />
              );
            })()}
          </>
        )}

        {/* Axes */}
        <line x1={padL} x2={padL + innerW} y1={padT + innerH} y2={padT + innerH} stroke={theme.palette.divider} />
        <line x1={padL} x2={padL} y1={padT} y2={padT + innerH} stroke={theme.palette.divider} />

        {/* Transparent hover overlay — last so it's on top */}
        <rect
          x={padL}
          y={padT}
          width={innerW}
          height={innerH}
          fill='transparent'
          onMouseMove={(e) => {
            const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const ratio = (px - padL) / innerW;
            const day = Math.round(1 + ratio * Math.max(1, days - 1));
            const clamped = Math.max(1, Math.min(days, day));
            onHover(clamped);
          }}
          onMouseLeave={() => onHover(null)}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
            const px = touch.clientX - rect.left;
            const ratio = (px - padL) / innerW;
            const day = Math.round(1 + ratio * Math.max(1, days - 1));
            onHover(Math.max(1, Math.min(days, day)));
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
            const px = touch.clientX - rect.left;
            const ratio = (px - padL) / innerW;
            const day = Math.round(1 + ratio * Math.max(1, days - 1));
            onHover(Math.max(1, Math.min(days, day)));
          }}
        />
      </svg>
    </Box>
  );
}

export default PrayerTimes;
