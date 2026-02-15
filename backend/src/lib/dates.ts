export const utcDayStart = (date = new Date()) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

export const formatUtcDate = (date: Date) => {
  return date.toISOString().slice(0, 10);
};
