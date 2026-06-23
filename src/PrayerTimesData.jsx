import { format } from 'date-fns';

const LOCATION_KEY = 'prayerTimesLocation';
const CACHE_KEY = 'prayerTimesCache';
const MONTH_CACHE_KEY = 'prayerTimesMonthCache';
const IQAMA_KEY = 'prayerIqamaSettings';
const METHOD_KEY = 'prayerCalcMethod';
const DEFAULT_METHOD = 4; // Umm Al-Qura, Mecca

// Aladhan calculation methods — see https://api.aladhan.com/v1/methods
export const CALCULATION_METHODS = [
  { id: 3, name: 'Muslim World League' },
  { id: 2, name: 'Islamic Society of North America (ISNA)' },
  { id: 5, name: 'Egyptian General Authority of Survey' },
  { id: 4, name: 'Umm Al-Qura, Mecca' },
  { id: 1, name: 'University of Islamic Sciences, Karachi' },
  { id: 7, name: 'Institute of Geophysics, Tehran' },
  { id: 0, name: 'Shia Ithna-Ashari (Jafari)' },
  { id: 8, name: 'Gulf Region' },
  { id: 9, name: 'Kuwait' },
  { id: 10, name: 'Qatar' },
  { id: 11, name: 'Singapore (MUIS)' },
  { id: 12, name: 'France (UOIF)' },
  { id: 13, name: 'Turkey (Diyanet)' },
  { id: 14, name: 'Russia' },
  { id: 15, name: 'Moonsighting Committee Worldwide' },
  { id: 16, name: 'Dubai (experimental)' },
  { id: 17, name: 'Malaysia (JAKIM)' },
  { id: 18, name: 'Tunisia' },
  { id: 19, name: 'Algeria' },
  { id: 20, name: 'Indonesia (KEMENAG)' },
  { id: 21, name: 'Morocco' },
  { id: 22, name: 'Portugal (Comunidade Islâmica de Lisboa)' },
  { id: 23, name: 'Jordan' },
];

export const loadCalculationMethod = () => {
  try {
    const raw = localStorage.getItem(METHOD_KEY);
    if (raw == null) return DEFAULT_METHOD;
    const v = parseInt(raw, 10);
    return Number.isFinite(v) ? v : DEFAULT_METHOD;
  } catch {
    return DEFAULT_METHOD;
  }
};

export const saveCalculationMethod = (method) => {
  try {
    localStorage.setItem(METHOD_KEY, String(method));
  } catch { /* ignore */ }
};

// Default iqama offsets in minutes after adhan (Sunrise has no iqama)
export const DEFAULT_IQAMA = {
  Fajr: 25,
  Dhuhr: 15,
  Asr: 15,
  Maghrib: 10,
  Isha: 15,
};

export const loadIqamaSettings = () => {
  try {
    const raw = localStorage.getItem(IQAMA_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_IQAMA, ...saved };
  } catch {
    return { ...DEFAULT_IQAMA };
  }
};

export const saveIqamaSettings = (settings) => {
  try {
    localStorage.setItem(IQAMA_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
};

export const loadCachedLocation = () => {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveLocation = (loc) => {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
  } catch { /* ignore */ }
};

export const clearLocation = () => {
  try {
    localStorage.removeItem(LOCATION_KEY);
  } catch { /* ignore */ }
};

export const loadCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveCache = (key, data) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ key, data, fetchedAt: new Date().toISOString() })
    );
  } catch { /* ignore */ }
};

export const buildLocId = (loc) => {
  if (!loc) return '';
  if (loc.kind === 'coords') {
    const lat = Number(loc.lat).toFixed(2);
    const lng = Number(loc.lng).toFixed(2);
    return `coords:${lat},${lng}`;
  }
  return `city:${loc.city || ''},${loc.country || ''}`;
};

const buildCacheKey = (loc, dateObj, method) =>
  `${format(dateObj, 'yyyy-MM-dd')}|${buildLocId(loc)}|m${method}`;

export const fetchPrayerTimes = async (loc, dateObj) => {
  const method = loadCalculationMethod();
  const dateStr = format(dateObj, 'dd-MM-yyyy');
  let url;
  if (loc.kind === 'coords') {
    url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${encodeURIComponent(loc.lat)}&longitude=${encodeURIComponent(loc.lng)}&method=${method}`;
  } else {
    url = `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${encodeURIComponent(loc.city)}&country=${encodeURIComponent(loc.country)}&method=${method}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Prayer times request failed: ${res.status}`);
  const json = await res.json();
  if (!json?.data?.timings) throw new Error('Unexpected response shape from Aladhan');
  const key = buildCacheKey(loc, dateObj, method);
  saveCache(key, json.data);
  return json.data;
};

const buildMonthCacheKey = (loc, year, month, method) =>
  `${year}-${String(month).padStart(2, '0')}|${buildLocId(loc)}|m${method}`;

const loadMonthCache = () => {
  try {
    const raw = localStorage.getItem(MONTH_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveMonthCache = (key, data) => {
  try {
    localStorage.setItem(
      MONTH_CACHE_KEY,
      JSON.stringify({ key, data, fetchedAt: new Date().toISOString() })
    );
  } catch { /* ignore */ }
};

// Fetch monthly calendar; returns Array of day entries (Aladhan response)
export const fetchMonthPrayerTimes = async (loc, year, month) => {
  const method = loadCalculationMethod();
  let url;
  if (loc.kind === 'coords') {
    url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${encodeURIComponent(loc.lat)}&longitude=${encodeURIComponent(loc.lng)}&method=${method}`;
  } else {
    url = `https://api.aladhan.com/v1/calendarByCity/${year}/${month}?city=${encodeURIComponent(loc.city)}&country=${encodeURIComponent(loc.country)}&method=${method}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Monthly prayer times request failed: ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json?.data)) throw new Error('Unexpected response shape from Aladhan calendar');
  const key = buildMonthCacheKey(loc, year, month, method);
  saveMonthCache(key, json.data);
  return json.data;
};

export const fetchMonthWithCacheFallback = async (loc, year, month) => {
  try {
    const data = await fetchMonthPrayerTimes(loc, year, month);
    return { data, stale: false, fetchedAt: new Date().toISOString() };
  } catch (e) {
    const method = loadCalculationMethod();
    const cached = loadMonthCache();
    if (cached && cached.key === buildMonthCacheKey(loc, year, month, method)) {
      return { data: cached.data, stale: true, fetchedAt: cached.fetchedAt };
    }
    throw e;
  }
};

export const fetchWithCacheFallback = async (loc, dateObj) => {
  try {
    const data = await fetchPrayerTimes(loc, dateObj);
    return { data, stale: false, fetchedAt: new Date().toISOString() };
  } catch (e) {
    const method = loadCalculationMethod();
    const cached = loadCache();
    if (cached && cached.key === buildCacheKey(loc, dateObj, method)) {
      return { data: cached.data, stale: true, fetchedAt: cached.fetchedAt };
    }
    // Try a same-location cache even if date / method doesn't match — better than nothing
    if (cached && cached.key.includes(`|${buildLocId(loc)}|`)) {
      return { data: cached.data, stale: true, fetchedAt: cached.fetchedAt };
    }
    throw e;
  }
};
