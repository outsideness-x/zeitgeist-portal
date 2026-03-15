type ContentTelemetryEvent = 'image-load-error' | 'placeholder-blocked' | 'unexpected-empty-data' | 'query-state';

type ContentTelemetryStore = Record<string, number>;

declare global {
  // eslint-disable-next-line no-var
  var __ZEITGEIST_CONTENT_TELEMETRY__: ContentTelemetryStore | undefined;
}

type TelemetryPayload = {
  route: string;
  component: string;
  articleId?: string;
  reason?: string;
};

const getStore = (): ContentTelemetryStore => {
  if (!globalThis.__ZEITGEIST_CONTENT_TELEMETRY__) {
    globalThis.__ZEITGEIST_CONTENT_TELEMETRY__ = {};
  }

  return globalThis.__ZEITGEIST_CONTENT_TELEMETRY__;
};

const telemetryKey = (event: ContentTelemetryEvent, payload: TelemetryPayload) => {
  return `${event}|${payload.route}|${payload.component}`;
};

const isDebugEnabled = () => {
  return process.env.CONTENT_DEBUG_LOGS === '1' || process.env.NEXT_PUBLIC_CONTENT_DEBUG_LOGS === '1';
};

const trackTelemetry = (event: ContentTelemetryEvent, payload: TelemetryPayload) => {
  const store = getStore();
  const key = telemetryKey(event, payload);
  store[key] = (store[key] ?? 0) + 1;

  if (!isDebugEnabled()) {
    return;
  }

  const debugPayload = {
    ...payload,
    count: store[key],
  };

  if (event === 'image-load-error' || event === 'unexpected-empty-data') {
    console.warn('[content-telemetry]', event, debugPayload);
    return;
  }

  console.info('[content-telemetry]', event, debugPayload);
};

export const trackImageLoadError = (payload: TelemetryPayload) => {
  trackTelemetry('image-load-error', payload);
};

export const trackPlaceholderBlocked = (payload: TelemetryPayload) => {
  trackTelemetry('placeholder-blocked', payload);
};

export const trackUnexpectedEmptyData = (payload: TelemetryPayload) => {
  trackTelemetry('unexpected-empty-data', payload);
};

export const trackQueryState = (payload: TelemetryPayload) => {
  trackTelemetry('query-state', payload);
};

export const getContentTelemetrySnapshot = (): ContentTelemetryStore => {
  return { ...getStore() };
};

export const resetContentTelemetry = () => {
  globalThis.__ZEITGEIST_CONTENT_TELEMETRY__ = {};
};
