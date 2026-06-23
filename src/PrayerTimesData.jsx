import { format } from 'date-fns';

const LOCATION_KEY = 'prayerTimesLocation';
const CACHE_KEY = 'prayerTimesCache';
const MONTH_CACHE_KEY = 'prayerTimesMonthCache';
const IQAMA_KEY = 'prayerIqamaSettings';
const METHOD = 4; // Umm Al-Qura, Mecca

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

const buildCacheKey = (loc, dateObj) =>
  `${format(dateObj, 'yyyy-MM-dd')}|${buildLocId(loc)}`;

export const fetchPrayerTimes = async (loc, dateObj) => {
  const dateStr = format(dateObj, 'dd-MM-yyyy');
  let url;
  if (loc.kind === 'coords') {
    url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${encodeURIComponent(loc.lat)}&longitude=${encodeURIComponent(loc.lng)}&method=${METHOD}`;
  } else {
    url = `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${encodeURIComponent(loc.city)}&country=${encodeURIComponent(loc.country)}&method=${METHOD}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Prayer times request failed: ${res.status}`);
  const json = await res.json();
  if (!json?.data?.timings) throw new Error('Unexpected response shape from Aladhan');
  const key = buildCacheKey(loc, dateObj);
  saveCache(key, json.data);
  return json.data;
};

const buildMonthCacheKey = (loc, year, month) =>
  `${year}-${String(month).padStart(2, '0')}|${buildLocId(loc)}`;

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
  let url;
  if (loc.kind === 'coords') {
    url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${encodeURIComponent(loc.lat)}&longitude=${encodeURIComponent(loc.lng)}&method=${METHOD}`;
  } else {
    url = `https://api.aladhan.com/v1/calendarByCity/${year}/${month}?city=${encodeURIComponent(loc.city)}&country=${encodeURIComponent(loc.country)}&method=${METHOD}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Monthly prayer times request failed: ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json?.data)) throw new Error('Unexpected response shape from Aladhan calendar');
  const key = buildMonthCacheKey(loc, year, month);
  saveMonthCache(key, json.data);
  return json.data;
};

export const fetchMonthWithCacheFallback = async (loc, year, month) => {
  try {
    const data = await fetchMonthPrayerTimes(loc, year, month);
    return { data, stale: false, fetchedAt: new Date().toISOString() };
  } catch (e) {
    const cached = loadMonthCache();
    if (cached && cached.key === buildMonthCacheKey(loc, year, month)) {
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
    const cached = loadCache();
    if (cached && cached.key === buildCacheKey(loc, dateObj)) {
      return { data: cached.data, stale: true, fetchedAt: cached.fetchedAt };
    }
    // Try a same-location cache even if date doesn't match — better than nothing
    if (cached && cached.key.endsWith(`|${buildLocId(loc)}`)) {
      return { data: cached.data, stale: true, fetchedAt: cached.fetchedAt };
    }
    throw e;
  }
};
