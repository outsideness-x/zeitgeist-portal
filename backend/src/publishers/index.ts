import { getEnv } from '../config/env.js';
import type { Publisher } from './types.js';
import { LocalPublisher } from './local.js';
import { GhostPublisher } from './ghost.js';

export const createPublisher = (): Publisher => {
  const env = getEnv();

  if (env.PUBLISH_PROVIDER === 'ghost') {
    return new GhostPublisher(env);
  }

  return new LocalPublisher();
};
