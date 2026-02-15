import { randomUUID } from 'node:crypto';

export const visitorCookieName = 'zg_vid';

export const createVisitorId = () => {
  return randomUUID();
};
