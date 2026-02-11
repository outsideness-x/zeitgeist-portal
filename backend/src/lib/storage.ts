import { randomUUID, createHash } from 'node:crypto';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type HeadObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { BackendEnv } from '../config/env.js';

export const createStorageClient = (env: BackendEnv) => {
  return new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
};

export const createSubmissionStorageKey = (submissionId: string) => {
  return `submissions/${submissionId}/${randomUUID()}.pdf`;
};

export const createLibraryStorageKey = (libraryItemId: string) => {
  return `library/${libraryItemId}/${randomUUID()}.pdf`;
};

export const createPresignedPutUrl = async (args: {
  client: S3Client;
  bucket: string;
  key: string;
  expiresInSeconds: number;
  contentType: string;
}) => {
  const command = new PutObjectCommand({
    Bucket: args.bucket,
    Key: args.key,
    ContentType: args.contentType,
  });

  return getSignedUrl(args.client, command, {
    expiresIn: args.expiresInSeconds,
  });
};

export const createPresignedGetUrl = async (args: {
  client: S3Client;
  bucket: string;
  key: string;
  expiresInSeconds: number;
}) => {
  const command = new GetObjectCommand({
    Bucket: args.bucket,
    Key: args.key,
  });

  return getSignedUrl(args.client, command, {
    expiresIn: args.expiresInSeconds,
  });
};

export const headStoredObject = async (args: {
  client: S3Client;
  bucket: string;
  key: string;
}): Promise<HeadObjectCommandOutput> => {
  const command = new HeadObjectCommand({
    Bucket: args.bucket,
    Key: args.key,
  });

  return args.client.send(command);
};

// this reads the first bytes from storage so upload complete can reject non-pdf payloads
export const readObjectPrefix = async (args: {
  client: S3Client;
  bucket: string;
  key: string;
  bytes: number;
}): Promise<Buffer> => {
  const command = new GetObjectCommand({
    Bucket: args.bucket,
    Key: args.key,
    Range: `bytes=0-${Math.max(0, args.bytes - 1)}`,
  });

  const result = await args.client.send(command);
  const body = result.Body;

  if (!body) {
    return Buffer.alloc(0);
  }

  const bytes = await body.transformToByteArray();
  return Buffer.from(bytes);
};

// this computes stable integrity metadata used for audits and tamper checks
export const computeObjectSha256 = async (args: {
  client: S3Client;
  bucket: string;
  key: string;
}): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: args.bucket,
    Key: args.key,
  });

  const result = await args.client.send(command);
  const body = result.Body;

  if (!body) {
    return '';
  }

  const hash = createHash('sha256');
  const bytes = await body.transformToByteArray();
  hash.update(Buffer.from(bytes));

  return hash.digest('hex');
};
