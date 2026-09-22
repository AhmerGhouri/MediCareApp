import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {AxiosError, CanceledError} from 'axios';
import {
  AppError,
  logError,
  normalizeError,
  shouldRetryQuery,
} from '../src/errors/AppError';
import api, {
  checkRegistrationEligibilityApi,
  fetchReportsApi,
  fetchConsultationHistoryApi,
  fetchCombineLabReportsApi,
  fetchUpcomingAppointmentsApi,
  fetchRadiologyReportsApi,
  fetchInpatientHistoryApi,
  fetchTodaysClinicApi,
  fetchConsultantsApi,
  fetchAppointmentSlotsApi,
  loginApi,
  sendOtpApi,
  verifyOtpAndResetApi,
} from '../src/services/api';
import {store, loginSuccess, logout} from '../src/store';
import {subscribeSessionExpiry} from '../src/errors/errorEvents';
import {createQueryClient} from '../src/services/queryClient';

const initialAdapter = api.defaults.adapter;
beforeEach(() => {
  store.dispatch(logout());
  jest.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => {
  api.defaults.adapter = initialAdapter;
  jest.restoreAllMocks();
});

describe('error normalization', () => {
  it.each([
    null,
    undefined,
    'secret server text',
    {},
    new Error('SQL stack secret'),
  ])('accepts unknown thrown values safely: %p', value => {
    const error = normalizeError(value);
    expect(error).toBeInstanceOf(AppError);
    expect(typeof error.message).toBe('string');
    expect(error.message).not.toMatch(/secret|SQL/);
  });
  it.each([
    [400, 'validation'],
    [401, 'session'],
    [403, 'permission'],
    [404, 'notFound'],
    [408, 'timeout'],
    [409, 'conflict'],
    [422, 'validation'],
    [429, 'rateLimit'],
    [500, 'server'],
    [503, 'server'],
    [504, 'timeout'],
  ])('maps HTTP %s', (status, kind) => {
    expect(
      normalizeError({response: {status, data: '<html>secret</html>'}}).kind,
    ).toBe(kind);
  });
  it('distinguishes credentials, expired sessions, and invalid OTPs', () => {
    const failure = {response: {status: 401}};
    expect(normalizeError(failure, 'login').kind).toBe('credentials');
    expect(normalizeError(failure).kind).toBe('session');
    expect(normalizeError(failure, 'otp').kind).toBe('validation');
  });
  it('handles network, timeout, cancellation, and local file errors', () => {
    expect(normalizeError(new AxiosError('secret', 'ERR_NETWORK')).kind).toBe(
      'network',
    );
    expect(normalizeError({code: 'ECONNABORTED'}).kind).toBe('timeout');
    expect(normalizeError(new CanceledError()).kind).toBe('cancelled');
    expect(normalizeError({code: 'ENOSPC'}).kind).toBe('storage');
    expect(normalizeError({code: 'EACCES'}).kind).toBe('permission');
    expect(normalizeError(new Error('native details'), 'fileOpen').kind).toBe(
      'fileOpen',
    );
  });
  it('uses only safe field labels from structured backend validation', () => {
    const error = normalizeError({
      response: {
        status: 422,
        data: {
          detail: [
            {
              loc: ['body', 'email'],
              msg: 'secret',
              input: 'patient@example.com',
            },
            {loc: ['body', 'unknown'], msg: 'secret'},
          ],
        },
      },
    });
    expect(error.fieldErrors).toEqual({
      email: 'Please check your email address.',
    });
    expect(error.message).not.toMatch(/secret|patient|unknown/);
  });
  it('warns about uncertain bookings and does not leak diagnostic data', () => {
    expect(normalizeError({code: 'ERR_NETWORK'}, 'booking').message).toContain(
      'Check Upcoming Appointments',
    );
    logError({
      response: {status: 500, data: {password: 'secret'}},
      config: {url: '/patient/123'},
    });
    expect(console.info).toHaveBeenCalledWith('[AppError]', {
      context: 'api',
      kind: 'server',
      status: 500,
    });
    expect(JSON.stringify((console.info as jest.Mock).mock.calls)).not.toMatch(
      /secret|patient\/123/,
    );
  });
});

function respond(data: unknown) {
  api.defaults.adapter = async config => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
}
function fail(status: number) {
  api.defaults.adapter = async config => {
    throw new AxiosError(
      'raw private details',
      'ERR_BAD_RESPONSE',
      config,
      undefined,
      {
        status,
        statusText: 'Error',
        data: {message: 'SQL private details'},
        headers: {},
        config,
      },
    );
  };
}

describe('API boundary', () => {
  const listEndpoints: Array<[string, () => Promise<any>, string | null]> = [
    ['lab', () => fetchReportsApi('test'), 'reports'],
    ['radiology', () => fetchRadiologyReportsApi('test'), 'reports'],
    ['inpatient', () => fetchInpatientHistoryApi('test'), 'inpatienthistory'],
    [
      'consultations',
      () => fetchConsultationHistoryApi('test'),
      'consultationshistory',
    ],
    ['upcoming', () => fetchUpcomingAppointmentsApi('test'), 'appointments'],
    ['clinic', fetchTodaysClinicApi, 'consultations'],
    ['consultants', fetchConsultantsApi, null],
    [
      'slots',
      () => fetchAppointmentSlotsApi('test', 'test', '2026-09-22'),
      'appointments',
    ],
    ['combined', () => fetchCombineLabReportsApi('test'), null],
  ];
  it.each(listEndpoints)(
    '%s accepts null and empty list response shapes',
    async (_name, fetchList, key) => {
      const shapes = [
        null,
        [],
        {data: null},
        {data: []},
        ...(key ? [{[key]: null}, {[key]: []}, {data: {[key]: null}}] : []),
      ];
      for (const shape of shapes) {
        respond(shape);
        const result = await fetchList();
        expect(key ? result[key] : result).toEqual([]);
      }
    },
  );
  it.each(listEndpoints)(
    '%s does not hide real failures or malformed responses',
    async (_name, fetchList) => {
      for (const shape of [
        {},
        {success: false, data: null},
        {data: 'invalid'},
        [null],
      ]) {
        respond(shape);
        await expect(fetchList()).rejects.toBeInstanceOf(AppError);
      }
      fail(500);
      await expect(fetchList()).rejects.toMatchObject({kind: 'server'});
      fail(403);
      await expect(fetchList()).rejects.toBeInstanceOf(AppError);
    },
  );
  it('uses the backend recovery endpoints and accepts their success contract', async () => {
    const requests: Array<{url?: string; data: unknown}> = [];
    api.defaults.adapter = async config => {
      requests.push({url: config.url, data: JSON.parse(config.data)});
      return {
        data: {status: 'success'},
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };
    await sendOtpApi({mobile: 'test', email: 'test@example.com'});
    await verifyOtpAndResetApi({
      mobile: 'test',
      email: 'test@example.com',
      otp_code: '123456',
      new_password: 'test-password',
    });
    expect(requests.map(request => request.url)).toEqual([
      '/auth/request-otp',
      '/auth/verify-otp-and-reset',
    ]);
    expect(requests[1].data).toMatchObject({
      otp_code: '123456',
      new_password: 'test-password',
    });
    respond({success: false, status: 'success'});
    await expect(
      sendOtpApi({mobile: 'test', email: 'test@example.com'}),
    ).rejects.toMatchObject({kind: 'validation'});
  });
  it('supports the legacy no-data message envelope from the global backend handler', async () => {
    api.defaults.adapter = async config => {
      throw new AxiosError('empty', 'ERR_BAD_RESPONSE', config, undefined, {
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config,
        data: {
          success: false,
          message: 'No Upcoming Appointments found for this MR Number',
        },
      });
    };
    await expect(fetchUpcomingAppointmentsApi('test')).resolves.toEqual({
      appointments: [],
    });
    expect(console.info).not.toHaveBeenCalled();
  });
  it('keeps unrelated appointments 403s as failures', async () => {
    respond({appointments: []});
    await expect(fetchUpcomingAppointmentsApi('test')).resolves.toEqual({
      appointments: [],
    });
    fail(403);
    await expect(fetchUpcomingAppointmentsApi('test')).rejects.toMatchObject({
      kind: 'appointmentsUnavailable',
      status: 403,
      title: 'Unavailable',
    });
    expect(
      shouldRetryQuery(0, new AppError('appointmentsUnavailable', 403)),
    ).toBe(false);
  });
  it.each([null, {appointments: null}, {appointments: []}])(
    'treats successful empty appointments as no records: %p',
    async data => {
      respond(data);
      await expect(fetchUpcomingAppointmentsApi('test')).resolves.toEqual({
        appointments: [],
      });
    },
  );
  it('accepts the exact legacy no-appointments 403 without error logs, but only for appointments', async () => {
    api.defaults.adapter = async config => {
      throw new AxiosError(
        'legacy empty result',
        'ERR_BAD_RESPONSE',
        config,
        undefined,
        {
          status: 403,
          statusText: 'Forbidden',
          headers: {},
          config,
          data: {detail: 'No Upcoming Appointments found for this MR Number'},
        },
      );
    };
    await expect(fetchUpcomingAppointmentsApi('test')).resolves.toEqual({
      appointments: [],
    });
    expect(console.info).not.toHaveBeenCalled();
    await expect(fetchReportsApi('test')).rejects.toMatchObject({
      kind: 'permission',
      status: 403,
    });
  });
  it('logs safe request checks and classifies no-data messages without exposing the response', async () => {
    store.dispatch(
      loginSuccess({
        token: 'private-token',
        mrProfiles: [
          {
            mr_no: 'private-mr',
            patient_name: 'private-name',
            gender: '',
            dob: '',
          },
        ],
      }),
    );
    api.defaults.adapter = async config => {
      throw new AxiosError(
        'private-error',
        'ERR_BAD_RESPONSE',
        config,
        undefined,
        {
          status: 403,
          statusText: 'Forbidden',
          headers: {},
          config,
          data: {
            detail: 'No upcoming appointments found',
            patient: 'private-name',
            code: 'private-code',
          },
        },
      );
    };
    await expect(
      fetchUpcomingAppointmentsApi('private-mr'),
    ).rejects.toMatchObject({kind: 'appointmentsUnavailable'});
    expect(console.info).toHaveBeenCalledWith('[ApiDiagnostic]', {
      operation: 'upcomingAppointments',
      status: 403,
      authorizationAttached: true,
      profileBelongsToSession: true,
      backendCode: 'unrecognized_or_missing',
      backendMessageCategory: 'no_data',
    });
    expect(
      JSON.stringify((console.info as jest.Mock).mock.calls),
    ).not.toContain('private-');
  });
  it('normalizes an unreachable login without accessing a missing response', async () => {
    api.defaults.adapter = async config => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    };
    await expect(loginApi('test', 'test')).rejects.toMatchObject({
      kind: 'network',
    });
  });
  it('does not convert a login 401 into session expiration', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeSessionExpiry(listener);
    try {
      fail(401);
      await expect(loginApi('test', 'test')).rejects.toMatchObject({
        kind: 'credentials',
      });
      expect(listener).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });
  it('keeps legitimate empty lists and rejects malformed data', async () => {
    respond({reports: []});
    await expect(fetchReportsApi('test')).resolves.toMatchObject({reports: []});
    respond({data: {reports: []}});
    await expect(fetchReportsApi('test')).resolves.toMatchObject({reports: []});
    respond({unexpected: []});
    await expect(fetchReportsApi('test')).rejects.toMatchObject({
      kind: 'invalidResponse',
    });
    respond([null]);
    await expect(fetchReportsApi('test')).rejects.toMatchObject({
      kind: 'invalidResponse',
    });
    respond([]);
    await expect(fetchConsultationHistoryApi('test')).resolves.toEqual({
      consultationshistory: [],
    });
  });
  it('rejects malformed login responses before they reach navigation', async () => {
    respond({access_token: 'test', mr_numbers: null});
    await expect(loginApi('test', 'test')).rejects.toMatchObject({
      kind: 'invalidResponse',
    });
  });
  it('rejects malformed nested report history without throwing a raw TypeError', async () => {
    for (const history of [
      [null],
      [{results: [null]}],
      [{results: 'invalid'}],
    ]) {
      respond([{history}]);
      await expect(fetchCombineLabReportsApi('test')).rejects.toMatchObject({
        kind: 'invalidResponse',
      });
    }
  });
  it('never reports mock authentication success when endpoints are missing', async () => {
    fail(404);
    await expect(checkRegistrationEligibilityApi('test')).rejects.toMatchObject(
      {kind: 'notFound'},
    );
    await expect(
      sendOtpApi({mobile: 'test', email: 'test@example.com'}),
    ).rejects.toMatchObject({kind: 'notFound'});
    await expect(
      verifyOtpAndResetApi({
        mobile: 'test',
        email: 'test@example.com',
        otp_code: '123456',
        new_password: 'test-password',
      }),
    ).rejects.toMatchObject({kind: 'notFound'});
  });
  it('discards a late 401 from an older session, even when a token is reused', async () => {
    store.dispatch(loginSuccess({token: 'same-token', mrProfiles: []}));
    let release!: () => void;
    let started!: () => void;
    const ready = new Promise<void>(resolve => {
      started = resolve;
    });
    api.defaults.adapter = config =>
      new Promise((_resolve, reject) => {
        release = () =>
          reject(
            new AxiosError('expired', 'ERR_BAD_RESPONSE', config, undefined, {
              status: 401,
              statusText: 'Error',
              data: {},
              headers: {},
              config,
            }),
          );
        started();
      });
    const request = fetchReportsApi('test');
    await ready;
    store.dispatch(loginSuccess({token: 'same-token', mrProfiles: []}));
    release();
    await expect(request).rejects.toMatchObject({kind: 'cancelled'});
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });
});

describe('retry rules', () => {
  it('only retries transient reads, at most twice', () => {
    expect(shouldRetryQuery(0, new AppError('network'))).toBe(true);
    expect(shouldRetryQuery(2, new AppError('network'))).toBe(false);
    for (const kind of [
      'credentials',
      'session',
      'validation',
      'permission',
      'cancelled',
      'rateLimit',
    ] as const) {
      expect(shouldRetryQuery(0, new AppError(kind))).toBe(false);
    }
  });
  it('does not automatically repeat a mutation', async () => {
    const client = createQueryClient();
    const mutationFn = jest.fn(async () => {
      throw new AppError('timeout');
    });
    const mutation = client
      .getMutationCache()
      .build(client, {mutationFn, gcTime: Infinity});
    await expect(mutation.execute(undefined)).rejects.toMatchObject({
      kind: 'timeout',
    });
    expect(mutationFn).toHaveBeenCalledTimes(1);
    client.clear();
  });
});
