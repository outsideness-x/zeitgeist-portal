import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import { getEnv } from '../config/env.js';

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

export const createNumericCode = (digits = 6) => {
  const maxExclusive = 10 ** digits;
  const value = randomInt(0, maxExclusive);
  return value.toString().padStart(digits, '0');
};

export const createCodeNonce = () => {
  return randomBytes(16).toString('base64url');
};

const getCodeSecret = () => {
  const env = getEnv();
  return env.TWO_FACTOR_CODE_SECRET ?? env.BACKEND_COOKIE_SECRET;
};

export const hashOneTimeCode = (args: {
  userId: string;
  purpose: string;
  nonce: string;
  code: string;
}) => {
  return createHmac('sha256', getCodeSecret())
    .update(`${args.userId}:${args.purpose}:${args.nonce}:${args.code}`)
    .digest('hex');
};

export const secureCompareHash = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};
