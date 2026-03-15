#!/usr/bin/env node

const backendUrl = (
  process.env.BACKEND_URL?.trim() ||
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
  'http://localhost:4000'
).replace(/\/+$/, '');

const password = process.env.SMOKE_PASSWORD?.trim() || 'strongpassword123';
const email = `smoke-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
const forceRelay = process.env.SMOKE_FORCE_RELAY === '1';

const readJson = async (response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

const readErrorMessage = async (response) => {
  const payload = await readJson(response);
  if (payload && typeof payload.message === 'string' && payload.message.trim().length > 0) {
    return payload.message;
  }

  const text = (await response.text()).trim();
  return text || `request failed with status ${response.status}`;
};

const getCookieHeader = (response) => {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .filter(Boolean)
      .join('; ');
  }

  const single = response.headers.get('set-cookie');
  return single ? single.split(';')[0] : '';
};

const requestJson = async (path, args = {}) => {
  const response = await fetch(`${backendUrl}${path}`, args);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return (await readJson(response)) ?? {};
};

const uploadPdfBytes = new TextEncoder().encode('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');

const assertPublicUploadHost = (uploadUrl) => {
  const uploadHost = new URL(uploadUrl).hostname.toLowerCase();
  const blockedHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', 'minio']);

  if (blockedHosts.has(uploadHost) || uploadHost.endsWith('.local')) {
    throw new Error(`upload URL points to internal host "${uploadHost}"`);
  }
};

const run = async () => {
  console.log(`Backend URL: ${backendUrl}`);

  const registerResponse = await fetch(`${backendUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name: 'smoke',
      email,
      password,
    }),
  });

  if (!registerResponse.ok) {
    throw new Error(`register failed: ${await readErrorMessage(registerResponse)}`);
  }

  const registerPayload = await readJson(registerResponse);
  const csrfToken = typeof registerPayload?.csrfToken === 'string' ? registerPayload.csrfToken : '';
  const cookieHeader = getCookieHeader(registerResponse);

  if (!csrfToken || !cookieHeader) {
    throw new Error('failed to extract auth cookies/csrf token');
  }

  const createPayload = await requestJson('/api/submissions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({
      title: 'smoke manuscript upload',
      keywords: 'smoke,test',
      abstract: 'this abstract is long enough to validate smoke upload checks and complete manuscript flow.',
      requestedSection: 'research',
    }),
  });

  const submissionId = createPayload?.submission?.id;
  if (typeof submissionId !== 'string' || submissionId.length === 0) {
    throw new Error('submission create returned invalid id');
  }

  const initPayload = await requestJson(`/api/submissions/${submissionId}/upload/init`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({
      originalName: 'smoke.pdf',
    }),
  });

  const uploadUrl = initPayload?.uploadUrl;
  const storageKey = initPayload?.storageKey;

  if (typeof uploadUrl !== 'string' || typeof storageKey !== 'string') {
    throw new Error('upload init returned invalid payload');
  }

  let uploadedVia = 'presigned';
  try {
    if (forceRelay) {
      throw new Error('forced relay mode');
    }

    assertPublicUploadHost(uploadUrl);

    const directUploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'content-type': 'application/pdf',
      },
      body: uploadPdfBytes,
    });

    if (!directUploadResponse.ok) {
      throw new Error(`direct upload failed with status ${directUploadResponse.status}`);
    }
  } catch (error) {
    uploadedVia = 'backend-relay';
    console.warn(`Direct upload failed (${error instanceof Error ? error.message : 'unknown error'}), trying relay...`);

    const relayUploadResponse = await fetch(
      `${backendUrl}/api/submissions/${submissionId}/upload/file?storageKey=${encodeURIComponent(storageKey)}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/pdf',
          cookie: cookieHeader,
          'x-csrf-token': csrfToken,
        },
        body: uploadPdfBytes,
      },
    );

    if (!relayUploadResponse.ok) {
      throw new Error(`relay upload failed: ${await readErrorMessage(relayUploadResponse)}`);
    }
  }

  const completePayload = await requestJson(`/api/submissions/${submissionId}/upload/complete`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({
      storageKey,
      originalName: 'smoke.pdf',
    }),
  });

  const finalStatus = completePayload?.submission?.status;
  if (typeof finalStatus !== 'string') {
    throw new Error('upload complete returned invalid submission status');
  }

  console.log(`Smoke check passed. submissionId=${submissionId} status=${finalStatus} uploadedVia=${uploadedVia}`);
};

run().catch((error) => {
  console.error(`Smoke check failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exit(1);
});
