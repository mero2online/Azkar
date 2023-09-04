import jsonData from './zekr.json';

export const loadData = () => JSON.parse(JSON.stringify(jsonData));

const data = loadData();
export const zekrById = (id) =>
  data.filter((f) => {
    return f.category_id === id;
  });
