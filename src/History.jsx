import { format } from 'date-fns';

const KEY = 'zekrHistory';

// Storage shape:
// zekrHistory[YYYY-MM-DD][categoryId] = [
//   { completedItems: [0, 1, 2], totalItems: 26, sealed?: true },
//   ...
// ]
// Each array entry is one "cycle" (a session between resets / completions).

export const loadHistory = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY)) || {};
    // Migrate legacy shape: { reads, completedItems, totalItems } -> [{...}]
    for (const day of Object.keys(raw)) {
      for (const cat of Object.keys(raw[day])) {
        if (!Array.isArray(raw[day][cat])) {
          raw[day][cat] = [raw[day][cat]];
        }
      }
    }
    return raw;
  } catch {
    return {};
  }
};

const saveHistory = (history) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(history));
  } catch { /* quota / serialization failure — ignore */ }
};

const getOrCreateActiveCycle = (history, day, categoryId, totalItems) => {
  if (!history[day]) history[day] = {};
  if (!history[day][categoryId]) history[day][categoryId] = [];
  const cycles = history[day][categoryId];
  const last = cycles[cycles.length - 1];
  const needsNew = !last || last.sealed || (last.completedItems?.length || 0) >= (last.totalItems || totalItems);
  if (needsNew) {
    const cycle = { completedItems: [], totalItems, startedAt: new Date().toISOString(), endedAt: null };
    cycles.push(cycle);
    return cycle;
  }
  last.totalItems = totalItems;
  return last;
};

export const recordTap = (categoryId, totalItems) => {
  try {
    const day = format(new Date(), 'yyyy-MM-dd');
    const history = loadHistory();
    const cycle = getOrCreateActiveCycle(history, day, categoryId, totalItems);
    cycle.endedAt = new Date().toISOString();
    saveHistory(history);
  } catch { /* ignore */ }
};

export const recordCompletion = (categoryId, zekrIndex, totalItems) => {
  try {
    const day = format(new Date(), 'yyyy-MM-dd');
    const history = loadHistory();
    const cycle = getOrCreateActiveCycle(history, day, categoryId, totalItems);
    if (!cycle.completedItems.includes(zekrIndex)) {
      cycle.completedItems.push(zekrIndex);
    }
    cycle.endedAt = new Date().toISOString();
    saveHistory(history);
  } catch { /* ignore */ }
};

export const deleteCycle = (day, categoryId, cycleIndex) => {
  try {
    const history = loadHistory();
    const cycles = history[day]?.[categoryId];
    if (!cycles) return history;
    cycles.splice(cycleIndex, 1);
    if (cycles.length === 0) {
      delete history[day][categoryId];
    }
    if (history[day] && Object.keys(history[day]).length === 0) {
      delete history[day];
    }
    saveHistory(history);
    return history;
  } catch {
    return loadHistory();
  }
};

export const recordReset = (categoryId) => {
  try {
    const day = format(new Date(), 'yyyy-MM-dd');
    const history = loadHistory();
    const cycles = history[day]?.[categoryId];
    if (cycles && cycles.length > 0) {
      // Always seal the current cycle so next completion creates a new row
      cycles[cycles.length - 1].sealed = true;
      saveHistory(history);
    }
  } catch { /* ignore */ }
};
