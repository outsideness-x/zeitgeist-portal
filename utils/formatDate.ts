const RUSSIAN_DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export const formatDate = (dateInput: Date | string | number): string => {
  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return RUSSIAN_DATE_FORMATTER.format(date).replace(' г.', '');
};
