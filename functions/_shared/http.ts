export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export const json = (body: unknown, init: ResponseInit = {}) => new Response(
  JSON.stringify(body),
  { ...init, headers: { ...headers, ...init.headers } },
);

export const errorResponse = (error: unknown) => {
  if (error instanceof HttpError) {
    return json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  console.error('Unhandled API error', error);
  return json(
    { error: { code: 'internal_error', message: '服務暫時無法使用' } },
    { status: 500 },
  );
};

export const methodNotAllowed = (allowed: string[]) => json(
  { error: { code: 'method_not_allowed', message: '不支援的請求方法' } },
  { status: 405, headers: { allow: allowed.join(', ') } },
);

export const singleParam = (value: string | string[] | undefined) => {
  const raw = Array.isArray(value) ? value[0] ?? '' : value ?? '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};
