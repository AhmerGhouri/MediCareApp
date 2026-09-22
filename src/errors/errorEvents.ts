import {AppError, ErrorContext, logError, normalizeError} from './AppError';

type Listener = (error: AppError) => void;
const listeners = new Set<Listener>();
let pending: AppError[] = [];
export function subscribeErrors(listener: Listener): () => void {
  listeners.add(listener);
  pending.splice(0).forEach(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function reportError(
  error: unknown,
  context: ErrorContext = 'api',
): void {
  const safe = normalizeError(error, context);
  logError(safe, context);
  // Session expiration is owned by the session coordinator, once per session.
  if (safe.kind === 'cancelled' || safe.kind === 'session') {
    return;
  }
  publishError(safe);
}
export function publishError(error: AppError): void {
  if (!listeners.size) {
    pending = [...pending, error].slice(-5);
  }
  listeners.forEach(listener => listener(error));
}

const sessionListeners = new Set<(version: number) => void>();
export function subscribeSessionExpiry(
  listener: (version: number) => void,
): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}
export function notifySessionExpiry(version: number): void {
  sessionListeners.forEach(listener => listener(version));
}
