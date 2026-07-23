import { appParams } from '@/lib/app-params';

/**
 * Returns the published app URL, stripping any `preview--` prefix
 * from the builder preview origin so QR codes and share links point
 * to the stable production domain.
 */
export function getPublishedAppUrl() {
  const configured = appParams.appBaseUrl;
  if (configured) return configured.replace(/^(https?:\/\/)?preview--/, '$1');
  const origin = window.location.origin;
  return origin.replace(/^(https?:\/\/)preview--/, '$1');
}