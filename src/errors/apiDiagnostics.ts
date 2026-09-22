// Only fixed allowlisted values and booleans may enter development diagnostics.
// Do not log raw bodies, URLs, headers, tokens, MR numbers or arbitrary codes.
export function logAppointmentsFailure(
  data: unknown,
  status: number | undefined,
  authorizationAttached: boolean,
  profileBelongsToSession: boolean,
): void {
  if (!__DEV__) {
    return;
  }
  const body =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  const allowedCodes = [
    'NO_UPCOMING_APPOINTMENTS',
    'NO_DATA_FOUND',
    'FORBIDDEN',
    'NOT_AUTHENTICATED',
  ];
  const code =
    typeof body.code === 'string' && allowedCodes.includes(body.code)
      ? body.code
      : 'unrecognized_or_missing';
  const detail = typeof body.detail === 'string' ? body.detail : body.message;
  const noDataMessage =
    typeof detail === 'string' &&
    [
      'no upcoming appointments found',
      'no appointments found',
      'no data found',
    ].includes(detail.trim().toLowerCase().replace(/\.$/, ''));
  console.info('[ApiDiagnostic]', {
    operation: 'upcomingAppointments',
    status,
    authorizationAttached,
    profileBelongsToSession,
    backendCode: code,
    backendMessageCategory: noDataMessage
      ? 'no_data'
      : 'unrecognized_or_missing',
  });
}
