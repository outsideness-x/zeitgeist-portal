import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';

export const hashPassword = async (rawPassword: string) => {
  return argon2.hash(rawPassword, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
};

export const verifyPassword = async (hash: string, rawPassword: string) => {
  return argon2.verify(hash, rawPassword);
};

export const createOpaqueToken = () => {
  return randomBytes(48).toString('base64url');
};

export const hashToken = (token: string) => {
  return createHash('sha256').update(token).digest('hex');
};

export const createCsrfToken = () => {
  return randomBytes(24).toString('base64url');
};
