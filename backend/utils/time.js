const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const tz = require('dayjs/plugin/timezone');
const isoWeek = require('dayjs/plugin/isoWeek');

dayjs.extend(utc);
dayjs.extend(tz);
dayjs.extend(isoWeek);

const TZ = 'Asia/Jakarta';

function dayRangeJakarta(date = new Date()) {
  const start = dayjs(date).tz(TZ).startOf('day');
  const end   = dayjs(date).tz(TZ).endOf('day');
  return { start: start.toDate(), end: end.toDate() };
}

function weekRangeJakarta(date = new Date()) {
  const start = dayjs(date).tz(TZ).startOf('isoWeek');
  const end   = dayjs(date).tz(TZ).endOf('isoWeek');
  return { start: start.toDate(), end: end.toDate() };
}

module.exports = { dayRangeJakarta, weekRangeJakarta, TZ };
