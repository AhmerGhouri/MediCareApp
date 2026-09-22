import axios from 'axios';

export type ErrorKind =
  | 'network'
  | 'timeout'
  | 'credentials'
  | 'session'
  | 'permission'
  | 'appointmentsUnavailable'
  | 'validation'
  | 'conflict'
  | 'notFound'
  | 'rateLimit'
  | 'server'
  | 'invalidResponse'
  | 'storage'
  | 'download'
  | 'fileOpen'
  | 'notification'
  | 'cancelled'
  | 'unexpected';
export type ErrorContext =
  | 'upcomingAppointments'
  | 'login'
  | 'otp'
  | 'booking'
  | 'api'
  | 'storage'
  | 'download'
  | 'fileOpen'
  | 'notification'
  | 'permission';

const messages: Record<ErrorKind, [string, string]> = {
  appointmentsUnavailable: [
    'Unavailable',
    'We could not load upcoming appointments. Please try again later. This does not necessarily mean you have no appointments.',
  ],
  network: [
    'Unable to Connect',
    'We could not connect to the server. Check your internet connection and try again. If the problem continues, please try again later.',
  ],
  timeout: [
    'Connection Timed Out',
    'The server is taking too long to respond. Please try again shortly.',
  ],
  credentials: [
    'Sign-in Failed',
    'The phone number or password is incorrect. Please check your details and try again.',
  ],
  session: ['Session Expired', 'Please sign in again to continue.'],
  permission: [
    'Permission Required',
    'This action is not allowed. Check the app permissions in Settings or contact the hospital for assistance.',
  ],
  validation: [
    'Check Your Details',
    'Please check the information you entered and try again.',
  ],
  conflict: [
    'Unable to Complete',
    'This action conflicts with an existing record. Refresh your information before trying again.',
  ],
  notFound: [
    'Unavailable',
    'The requested information or service is currently unavailable. Please try again later or contact the hospital.',
  ],
  rateLimit: [
    'Please Wait',
    'There have been too many requests. Please wait a few minutes before trying again.',
  ],
  server: [
    'Service Unavailable',
    'The service is temporarily unavailable. Please try again later.',
  ],
  invalidResponse: [
    'Unable to Load',
    'We could not read the response from the service. Please try again later.',
  ],
  storage: [
    'Unable to Save or Load',
    'We could not access data on your device. Check your available storage and try again.',
  ],
  download: [
    'Report Unavailable',
    'We could not download or generate this report. Please try again later.',
  ],
  fileOpen: [
    'Unable to Open Report',
    'We could not open this report. Check that a PDF viewer is available and try again.',
  ],
  notification: [
    'Notifications Unavailable',
    'We could not update notifications. Please try again later.',
  ],
  cancelled: ['', ''],
  unexpected: [
    'Something Went Wrong',
    'We could not complete this action. Please try again.',
  ],
};

export class AppError extends Error {
  readonly title: string;
  readonly retryable: boolean;
  constructor(
    readonly kind: ErrorKind,
    readonly status?: number,
    readonly fieldErrors: Record<string, string> = {},
    message?: string,
  ) {
    super(message ?? messages[kind][1]);
    this.name = 'AppError';
    this.title = messages[kind][0];
    this.retryable = ['network', 'timeout', 'server'].includes(kind);
  }
}

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};

// Only known fields and our own wording are exposed; API messages may contain
// stack traces, HTML, database errors, tokens, or patient information.
function fieldErrors(data: unknown): Record<string, string> {
  const labels: Record<string, string> = {
    mobile_number: 'phone number',
    mobile: 'phone number',
    password: 'password',
    email: 'email address',
    full_name: 'full name',
    date_of_birth: 'date of birth',
    gender: 'gender',
    otp: 'verification code',
    otp_code: 'verification code',
    new_password: 'new password',
  };
  const body = record(data);
  const fields = new Set(Object.keys(record(body.errors)));
  if (Array.isArray(body.detail)) {
    body.detail.forEach(item => {
      const loc = record(item).loc;
      if (Array.isArray(loc) && typeof loc[loc.length - 1] === 'string') {
        fields.add(loc[loc.length - 1]);
      }
    });
  }
  return Object.fromEntries(
    [...fields]
      .filter(key => Object.prototype.hasOwnProperty.call(labels, key))
      .map(key => [key, `Please check your ${labels[key]}.`]),
  );
}

export function normalizeError(
  error: unknown,
  context: ErrorContext = 'api',
): AppError {
  if (error instanceof AppError) {
    return error;
  }
  const value = record(error);
  const response = record(value.response);
  const status =
    typeof response.status === 'number'
      ? response.status
      : typeof value.status === 'number'
      ? value.status
      : undefined;
  const failure = (kind: ErrorKind) =>
    new AppError(
      kind,
      status,
      {},
      context === 'booking' && ['network', 'timeout', 'server'].includes(kind)
        ? 'We could not confirm whether your appointment was booked. Check Upcoming Appointments before trying again.'
        : undefined,
    );
  if (
    axios.isCancel(error) ||
    value.code === 'ERR_CANCELED' ||
    value.name === 'AbortError'
  ) {
    return new AppError('cancelled');
  }
  if (
    value.code === 'ECONNABORTED' ||
    value.code === 'ETIMEDOUT' ||
    status === 408 ||
    status === 504
  ) {
    return failure('timeout');
  }
  if (status === 401) {
    return context === 'otp'
      ? new AppError(
          'validation',
          status,
          {},
          'The verification code is invalid or has expired. Please request a new code.',
        )
      : new AppError(context === 'login' ? 'credentials' : 'session', status);
  }
  if (status === 403) {
    if (context === 'upcomingAppointments') {
      return new AppError('appointmentsUnavailable', status);
    }
    return new AppError(
      'permission',
      status,
      {},
      'You do not have access to this action. Please contact the hospital for assistance.',
    );
  }
  if (status === 404) {
    return new AppError('notFound', status);
  }
  if (status === 429) {
    return new AppError('rateLimit', status);
  }
  if (status !== undefined && status >= 500) {
    return failure('server');
  }
  if (status === 409) {
    return new AppError('conflict', status);
  }
  if (status === 400 || status === 422) {
    const fields = fieldErrors(response.data);
    const message =
      context === 'otp'
        ? 'The verification code is invalid or has expired. Please request a new code.'
        : Object.values(fields).join('\n') || undefined;
    return new AppError('validation', status, fields, message);
  }
  if (
    value.code === 'ERR_NETWORK' ||
    (axios.isAxiosError(error) && !error.response)
  ) {
    return failure('network');
  }
  if (value.code === 'ENOSPC' || value.code === 'EIO') {
    return new AppError('storage');
  }
  if (value.code === 'EACCES' || value.code === 'EPERM') {
    return new AppError('permission');
  }
  if (
    ['storage', 'download', 'fileOpen', 'notification', 'permission'].includes(
      context,
    )
  ) {
    return new AppError(context as ErrorKind, status);
  }
  return new AppError('unexpected', status);
}

export const shouldRetryQuery = (failureCount: number, error: unknown) =>
  failureCount < 2 && normalizeError(error).retryable;
export const retryDelay = (attempt: number) =>
  Math.min(1000 * 2 ** attempt, 5000);

export function logError(error: unknown, context: ErrorContext = 'api'): void {
  const safe = normalizeError(error, context);
  if (__DEV__ && safe.kind !== 'cancelled') {
    // Never log the original error, request/response, URL, or patient data.
    console.info('[AppError]', {context, kind: safe.kind, status: safe.status});
  }
}
