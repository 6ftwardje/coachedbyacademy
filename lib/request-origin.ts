type HeadersReader = Pick<Headers, "get">;

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export function getRequestOrigin(
  headers: HeadersReader,
  fallbackOrigin?: string
) {
  const host =
    firstHeaderValue(headers.get("x-forwarded-host")) ??
    firstHeaderValue(headers.get("host"));
  const forwardedProto = firstHeaderValue(headers.get("x-forwarded-proto"));

  if (host && !/[\s/\\]/.test(host)) {
    const protocol =
      forwardedProto === "http" || forwardedProto === "https"
        ? forwardedProto
        : host.startsWith("localhost") || host.startsWith("127.0.0.1")
          ? "http"
          : "https";
    return `${protocol}://${host}`;
  }

  const configuredOrigin =
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeOrigin(process.env.URL);
  if (configuredOrigin) return configuredOrigin;

  const refererOrigin = normalizeOrigin(headers.get("referer"));
  if (refererOrigin) return refererOrigin;

  return normalizeOrigin(fallbackOrigin);
}
