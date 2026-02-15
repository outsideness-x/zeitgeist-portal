export const slugify = (value: string) => {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  if (!normalized) {
    return 'article';
  }

  return normalized;
};

export const normalizeEmail = (email: string) => {
  return email.trim().toLowerCase();
};

const htmlEntityMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (value: string) => {
  return value.replace(/[&<>"']/g, (char) => htmlEntityMap[char] ?? char);
};
