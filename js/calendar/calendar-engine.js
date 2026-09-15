/**
 * Calendar Engine - reliable Hebrew calendar using Intl + holiday rules (Israel)
 * monthIndex 0-based: 0=Tishrei ... 
 */

const MONTH_NAMES = {
  regular: ['תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול'],
  leap: ['תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', "אדר א'", "אדר ב'", 'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול']
};

const DAY_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

function toGematria(n) {
  if (n < 1) return '';
  if (n === 15) return 'ט״ו';
  if (n === 16) return 'ט״ז';
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];
  let s = '';
  let num = n;
  if (num >= 100) {
    s += hundreds[Math.floor(num / 100)] || '';
    num %= 100;
  }
  if (num >= 10) {
    s += tens[Math.floor(num / 10)];
    num %= 10;
  }
  s += ones[num];
  if (s.length > 1) {
    s = s.slice(0, -1) + '״' + s.slice(-1);
  } else if (s) {
    s += '׳';
  }
  return s;
}

function isLeapYear(year) {
  const r = year % 19;
  return r === 0 || r === 3 || r === 6 || r === 8 || r === 11 || r === 14 || r === 17;
}

function getMonthNames(year) {
  return isLeapYear(year) ? MONTH_NAMES.leap : MONTH_NAMES.regular;
}

/**
 * Intl returns month 1=Tishrei ... For leap years AdarI=6, AdarII=7, Nisan=8...
 * Our index 0=Tishrei always.
 */
function intlMonthToIndex(intlMonth, isLeap) {
  // intlMonth is 1-based
  return intlMonth - 1;
}

function gregorianToHebrew(date) {
  const formatter = new Intl.DateTimeFormat('he-u-ca-hebrew', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = formatter.formatToParts(date);
  let year = 0, month = 0, day = 0;
  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10);
    if (p.type === 'month') month = parseInt(p.value, 10);
    if (p.type === 'day') day = parseInt(p.value, 10);
  }
  return { year, month, day };
}

/**
 * Find the Gregorian date of day 1 of a given Hebrew month/year
 */
function findMonthStart(hebrewYear, monthIndex) {
  const isLeap = isLeapYear(hebrewYear);
  const targetIntlMonth = monthIndex + 1;

  // Approximate start: Hebrew year ~ starts Sep of (hebrewYear - 3761)
  const gYearApprox = hebrewYear - 3761;
  let d = new Date(Date.UTC(gYearApprox, 7, 15)); // mid August

  // Search forward up to ~400 days
  for (let i = 0; i < 450; i++) {
    const h = gregorianToHebrew(d);
    if (h.year === hebrewYear && h.month === targetIntlMonth && h.day === 1) {
      return new Date(d.getTime());
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  // Fallback
  return new Date(Date.UTC(gYearApprox, 8 + monthIndex, 1));
}

/**
 * Build full month data
 */
function getMonthData(hebrewYear, monthIndex) {
  const names = getMonthNames(hebrewYear);
  const monthName = names[monthIndex] || 'חודש';
  const isLeap = isLeapYear(hebrewYear);
  const days = [];

  let current = findMonthStart(hebrewYear, monthIndex);
  const targetIntlMonth = monthIndex + 1;

  for (let i = 0; i < 32; i++) {
    const h = gregorianToHebrew(current);
    if (h.year !== hebrewYear || h.month !== targetIntlMonth) {
      if (i > 0) break;
    }
    const dow = current.getDay(); // local, but for calendar it's fine
    const holidays = getHolidaysForDay(h.year, h.month, h.day, isLeap);

    days.push({
      gregorianDate: new Date(current.getFullYear(), current.getMonth(), current.getDate()),
      hebrewDay: h.day,
      hebrewDayGematria: toGematria(h.day),
      hebrewMonth: monthName,
      hebrewYear: h.year,
      dayOfWeek: dow,
      dayNameShort: DAY_SHORT[dow],
      isShabbat: dow === 6,
      isRoshChodesh: h.day === 1 || (h.day === 30),
      holidays
    });

    current.setDate(current.getDate() + 1);
  }

  return {
    year: hebrewYear,
    monthIndex,
    monthName,
    isLeap,
    days,
    daysInMonth: days.length
  };
}

function getHolidaysForDay(year, month, day, isLeap) {
  const list = [];
  // month is Intl 1-based (Tishrei=1)
  if (month === 1 && (day === 1 || day === 2)) list.push({ name: 'ראש השנה', type: 'major' });
  if (month === 1 && day === 3) list.push({ name: 'צום גדליה', type: 'fast' });
  if (month === 1 && day === 10) list.push({ name: 'יום כיפור', type: 'major' });
  if (month === 1 && day === 15) list.push({ name: 'סוכות', type: 'major' });
  if (month === 1 && day > 15 && day <= 21) list.push({ name: 'חול המועד סוכות', type: 'major' });
  if (month === 1 && day === 22) list.push({ name: 'שמיני עצרת', type: 'major' });
  if ((month === 3 && day >= 25) || (month === 4 && day <= 3)) list.push({ name: 'חנוכה', type: 'minor' });
  if (month === 4 && day === 10) list.push({ name: 'עשרה בטבת', type: 'fast' });
  if (month === 5 && day === 15) list.push({ name: 'ט״ו בשבט', type: 'minor' });

  const adar = isLeap ? 7 : 6;
  if (month === adar && day === 13) list.push({ name: 'תענית אסתר', type: 'fast' });
  if (month === adar && day === 14) list.push({ name: 'פורים', type: 'major' });
  if (month === adar && day === 15) list.push({ name: 'שושן פורים', type: 'minor' });

  if (month === (isLeap ? 8 : 7) && day === 15) list.push({ name: 'פסח', type: 'major' });
  if (month === (isLeap ? 8 : 7) && day > 15 && day <= 21) list.push({ name: 'חול המועד פסח', type: 'major' });
  if (month === (isLeap ? 8 : 7) && day === 21) list.push({ name: 'שביעי של פסח', type: 'major' });
  if (month === (isLeap ? 8 : 7) && day === 27) list.push({ name: 'יום השואה', type: 'modern' });

  const iyar = isLeap ? 9 : 8;
  if (month === iyar && day === 4) list.push({ name: 'יום הזיכרון', type: 'modern' });
  if (month === iyar && day === 5) list.push({ name: 'יום העצמאות', type: 'modern' });
  if (month === iyar && day === 18) list.push({ name: 'ל״ג בעומר', type: 'minor' });
  if (month === iyar && day === 28) list.push({ name: 'יום ירושלים', type: 'modern' });

  const sivan = isLeap ? 10 : 9;
  if (month === sivan && day === 6) list.push({ name: 'שבועות', type: 'major' });

  const tammuz = isLeap ? 11 : 10;
  if (month === tammuz && day === 17) list.push({ name: 'י״ז בתמוז', type: 'fast' });

  const av = isLeap ? 12 : 11;
  if (month === av && day === 9) list.push({ name: 'תשעה באב', type: 'fast' });

  return list;
}

function getYearMonths(hebrewYear) {
  const names = getMonthNames(hebrewYear);
  return names.map((name, idx) => ({
    index: idx,
    name,
    id: `${hebrewYear}-${idx}`
  }));
}

function formatHebrewYear(year) {
  // 5787 -> תשפ״ז
  const n = year % 1000;
  return toGematria(n);
}

export {
  isLeapYear,
  getMonthNames,
  getMonthData,
  getYearMonths,
  gregorianToHebrew,
  toGematria,
  formatHebrewYear,
  DAY_SHORT,
  getHolidaysForDay
};
