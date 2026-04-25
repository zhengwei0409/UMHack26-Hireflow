const dateFormatter = new Intl.DateTimeFormat('en-MY', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-MY', {
  hour: '2-digit',
  minute: '2-digit',
});

const toValidDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (value, fallback = 'No date') => {
  const date = toValidDate(value);
  return date ? dateFormatter.format(date) : fallback;
};

export const formatTime = (value, fallback = '') => {
  const date = toValidDate(value);
  return date ? timeFormatter.format(date) : fallback;
};

export const formatDateTime = (value, fallback = 'No date') => {
  const date = toValidDate(value);
  return date ? `${dateFormatter.format(date)}, ${timeFormatter.format(date)}` : fallback;
};

export const formatInputDate = (value) => {
  const date = toValidDate(value);
  return date ? date.toISOString().slice(0, 10) : '';
};
