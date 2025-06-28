import { format } from 'date-fns';
import jsonData from './zekr.json';

export const loadData = () => JSON.parse(JSON.stringify(jsonData));

const data = loadData();
export const zekrById = (id) =>
  data.filter((f) => {
    return f.category_id === id;
  });

export const getMostRecentTime = (itemMap) => {
  const entries = Object.entries(itemMap)
    .filter(([, value]) => value.dateTime) // keep only those with non-empty dateTime
    .map(([key, value]) => ({
      key,
      date: new Date(value.dateTime),
    }));

  if (entries.length === 0) {
    console.log('No valid timestamps found.');
    return { index: 0, time: 'No valid timestamps found.' };
  } else {
    const mostRecent = entries.reduce((latest, current) =>
      current.date > latest.date ? current : latest
    );
    const index = Number(mostRecent.key);

    console.log('Most recent object number:', mostRecent.key);
    console.log('Timestamp:', mostRecent.date.toISOString());
    return {
      index: index,
      time: format(mostRecent.date.toISOString(), 'dd-MM-yyyy hh:mm:ss.SS a'),
    };
  }
};
