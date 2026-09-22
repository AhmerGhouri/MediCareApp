import axios from 'axios';
import {store} from '../store';
import {AppError, ErrorContext, normalizeError} from '../errors/AppError';
import {notifySessionExpiry} from '../errors/errorEvents';
import {logAppointmentsFailure} from '../errors/apiDiagnostics';

declare module 'axios' {
  interface AxiosRequestConfig {
    errorContext?: ErrorContext;
    sessionVersion?: number;
    authenticatedRequest?: boolean;
    profileBelongsToSession?: boolean;
  }
}

// ─── Base Configuration ────────────────────────────────────────
// For Production
const BASE_URL = 'http://api.medicarehospital.pk';

// For Local
// const BASE_URL = 'http://172.20.0.72:8000/';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {'Content-Type': 'application/json'},
});

// Automatically attach JWT token to every request
api.interceptors.request.use(config => {
  const {sessionToken: token, sessionVersion} = store.getState().auth;
  const isPublicAuth =
    config.url?.startsWith('/auth/') && config.url !== '/auth/register-device';
  config.sessionVersion = sessionVersion;
  config.authenticatedRequest = !!token && !isPublicAuth;
  if (config.errorContext === 'upcomingAppointments') {
    config.profileBelongsToSession = store
      .getState()
      .auth.mrProfiles.some(
        profile =>
          config.url === `/patients/${profile.mr_no}/upcomingappointments`,
      );
  }
  if (config.authenticatedRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => {
    if (
      response.config.authenticatedRequest &&
      response.config.sessionVersion !== store.getState().auth.sessionVersion
    ) {
      throw new AppError('cancelled');
    }
    return response;
  },
  (error: unknown) => {
    const config = axios.isAxiosError(error) ? error.config : undefined;
    if (
      config?.authenticatedRequest &&
      config.sessionVersion !== store.getState().auth.sessionVersion
    ) {
      return Promise.reject(new AppError('cancelled'));
    }
    // Legacy backend uses 403 for this specific empty-result condition.
    // Scope the exception to this operation and exact detail, never all 403s.
    if (
      config?.errorContext === 'upcomingAppointments' &&
      axios.isAxiosError(error) &&
      error.response?.status === 403 &&
      (error.response.data?.detail ?? error.response.data?.message) ===
        'No Upcoming Appointments found for this MR Number'
    ) {
      return Promise.resolve({...error.response, data: {appointments: []}});
    }
    const safe = normalizeError(error, config?.errorContext ?? 'api');
    if (config?.errorContext === 'upcomingAppointments') {
      logAppointmentsFailure(
        axios.isAxiosError(error) ? error.response?.data : undefined,
        safe.status,
        !!config.headers?.Authorization,
        config.profileBelongsToSession === true,
      );
    }
    if (
      safe.kind === 'session' &&
      config?.authenticatedRequest &&
      config.sessionVersion !== undefined
    ) {
      notifySessionExpiry(config.sessionVersion);
    }
    // A public auth request must not log out an existing session.
    if (safe.kind === 'session' && !config?.authenticatedRequest) {
      return Promise.reject(new AppError('validation', safe.status));
    }
    return Promise.reject(safe);
  },
);

// ─── Type Definitions ──────────────────────────────────────────

export interface MrProfile {
  mr_no: string;
  patient_name: string;
  gender: string;
  dob: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  mr_numbers: MrProfile[];
}

export interface RegisterPayload {
  mobile_number: string;
  password: string;
  email: string;
  full_name: string;
  date_of_birth: string; // YYYY-MM-DD
  gender: 'M' | 'F';
}

export interface RegisterResponse {
  message: string;
  user_id: number;
}

export interface LabReport {
  id: string;
  test_id: string;
  testm_id: number;
  testd_id: string;
  test_desc: string;
  test_date: string;
  status: string; // "1", "2", "3", "4"
}

// ─── Report Download URL Builder ───────────────────────────────
const REPORT_BASE_URL =
  'http://rtums.sohailuniversity.edu.pk:9002/reports/rwservlet';

export const getLabReportDownloadUrl = (
  testm_id: number,
  testd_id: string,
): string => {
  const idParam = `${testm_id}-${testd_id}`;
  const url = `${REPORT_BASE_URL}?report=LAB_APPROVAL_REP.rep&cmdkey=orarep&ID=AND%20(ltestd_ltestm_id%20%7C%7C%20%27-%27%20%7C%7C%20to_char(ltestd_ltest_id))%20IN%20(%27${idParam}%27)%20&ID1=AND%20(LCULRESD_LCULRESM_LTESTM_ID%20%7C%7C%20%27-%27%20%7C%7C%20(LCULRESD_LCULRESM_LTEST_ID))%20%20IN%20(%27${idParam}%27)`;

  return url.replace(/ /g, '%20');
};

export const getCombineLabReportDownloadUrl = (
  opat_id: string | number,
  ltest_id: string | number,
): string => {
  const url = `${REPORT_BASE_URL}?report=LAB_REP_CP1.rep&cmdkey=orarep&ID&FR_OPAT_ID=${opat_id}&F_FR_LTEST_ID=${ltest_id}&F_TO_LTEST_ID=${ltest_id}&cb=${Date.now()}`;
  return url.replace(/ /g, '%20');
};

// ─── Report Download URL Builder ───────────────────────────────
// const RADIO_REPORT_BASE_URL =
//   'http://rtums.sohailuniversity.edu.pk:9002/reports/rwservlet';

export const getRadiologyReportDownloadUrl = (test_id: number): string => {
  const idParam = `${test_id}`;
  const url = `${REPORT_BASE_URL}?report=RADIOLOGY_REP1.rep&cmdkey=orarep&ID=AND%20REPTM_billm_id%20IN%20(${idParam})`;
  return url.replace(/ /g, '%20');
};

export interface LabReportsResponse {
  opat_id: number;
  patient_name: string;
  mobile: string;
  reports: LabReport[];
}

// ─── Combine Lab Report Types ──────────────────────────────────

export interface CombineLabResult {
  test_id: string;
  test_desc: string;
  result: string;
  unit: string;
  range?: string;
}

export interface CombineLabHistory {
  lbioresd_lbioresm_ltestm_id: number;
  date: string;
  results: CombineLabResult[];
}

export interface CombineLabTest {
  ltest_master_id: string;
  test_name: string;
  history: CombineLabHistory[];
}

export type CombineLabReportsResponse = CombineLabTest[];

export interface RadiologyReport {
  id: string;
  test_id: number;
  test_desc: string;
  test_dept_desc: string;
  test_req_date: string;
  reprting_date: string;
  test_refer_by: string;
  test_done_by: string;
  report_status: string; // e.g. "Approved", "Pending"
}

export interface RadiologyReportsResponse {
  opat_id: number;
  patient_name: string;
  mobile: string;
  reports: RadiologyReport[];
}

export interface InpatientReport {
  test_id: number;
  consultation: string;
  diagnosis: string;
  adm_date: string;
  dis_date: string;
  dept_id: string;
}

export interface InpatientHistoryResponse {
  opat_id: number;
  patient_name: number | string;
  mobile: string;
  inpatienthistory: InpatientReport[];
}

export interface ConsultationReport {
  test_id: number;
  consultation: string;
  ser_date: string;
  dept_id: string;
  amount: number;
}

export interface ConsultationHistoryResponse {
  opat_id: number;
  patient_name: string;
  mobile: string | null;
  consultationshistory: ConsultationReport[];
}

export interface Consultant {
  consl_id: string;
  consl_desc: string;
  consl_degr: string;
  consl_spec_id: string;
  consl_status: string;
  consl_mdept_id: string;
  mdept_desc: string;
  consl_img: string; // Base64 encoded image
}

export interface TimeSlot {
  time_fr: string;
  time_to: string;
  time_slot: string;
  mr_no?: string;
  'mr #'?: string;
}

export interface AppointmentSlotData {
  time_days: string;
  time_date: string;
  time_slot: TimeSlot[];
}

export interface AppointmentSlotsResponse {
  consl_id: string;
  consl_name: string;
  dept_id: string;
  Dept: string;
  appointments: AppointmentSlotData[];
}

export interface CreateAppointmentRequest {
  tran_id: number;
  consl_id: string;
  appoint_date: string; // "YYYY-MM-DD" or depending on backend (user example is "string")
  mobile_number: string;
  from_time: string; // e.g., "10:00"
  to_time: string; // e.g., "14:00"
  appointment_day: string;
  appoint_time: string; // e.g., "10:00"
  opat_id: string;
  patient_name: string;
}

export interface UpcomingFollowUp {
  followup_id: number;
  followup_date: string;
  followup_time: string;
  doctor_name: string;
  department: string;
}

export interface UpcomingFollowUpsResponse {
  opat_id: number;
  patient_name: string;
  mobile: string | null;
  follow_ups: UpcomingFollowUp[];
}

export interface UpcomingAppointment {
  trans_id: number;
  consultant: string;
  app_date: string;
  time_in: string;
  dept_id: string;
  dept: string;
}

export interface UpcomingAppointmentsResponse {
  opat_id: number;
  patient_name: string;
  mobile: string | null;
  appointments: UpcomingAppointment[];
}

export interface TodaysClinicConsultation {
  consl_id: string;
  consultant: string;
  from: string;
  to: string;
  dept_id: string;
  dept: string;
  scheduled_days: string;
}

export interface TodaysClinicResponse {
  day: string;
  current_date: string;
  consultations: TodaysClinicConsultation[];
}

interface Eligibility {
  eligible: boolean;
  // authorized: boolean,
  status?: string | undefined;
  message?: string | undefined;
}
// ─── Response validation ───────────────────────────────────────
// Keep supported array/envelope forms, but never disguise an invalid response
// or an unavailable endpoint as an empty list or a successful operation.
function objectBody(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('invalidResponse');
  }
  const body = value as Record<string, any>;
  if (body.success === false) {
    throw new AppError('validation');
  }
  return body;
}
function collection<T>(value: unknown, key: string): T {
  if (value === null) {
    return {[key]: []} as T;
  }
  if (Array.isArray(value)) {
    if (
      !value.every(
        item => item && typeof item === 'object' && !Array.isArray(item),
      )
    ) {
      throw new AppError('invalidResponse');
    }
    return {[key]: value} as T;
  }
  const body = objectBody(value);
  if (body[key] === null) {
    return {...body, [key]: []} as T;
  }
  if (Array.isArray(body[key])) {
    collection(body[key], key);
    return body as T;
  }
  if (body.data !== undefined) {
    return collection<T>(body.data, key);
  }
  throw new AppError('invalidResponse');
}
function arrayBody<T>(value: unknown): T[] {
  if (value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    collection(value, 'items');
    return value as T[];
  }
  const body = objectBody(value);
  if (body.data !== undefined) {
    return arrayBody<T>(body.data);
  }
  throw new AppError('invalidResponse');
}

// ─── Auth Endpoints ────────────────────────────────────────────
export const loginApi = async (
  mobile_number: string,
  password: string,
): Promise<LoginResponse> => {
  const response = await api.post(
    '/auth/login',
    {mobile_number, password},
    {errorContext: 'login'},
  );
  const body = objectBody(response.data);
  if (
    typeof body.access_token !== 'string' ||
    !body.access_token ||
    !Array.isArray(body.mr_numbers) ||
    !body.mr_numbers.length ||
    !body.mr_numbers.every(
      (profile: any) =>
        profile &&
        typeof profile.mr_no === 'string' &&
        typeof profile.patient_name === 'string',
    )
  ) {
    throw new AppError('invalidResponse');
  }
  return body as LoginResponse;
};
export const registerApi = async (
  payload: RegisterPayload,
): Promise<RegisterResponse> => {
  const response = await api.post('/auth/register', payload);
  const body = objectBody(response.data);
  if (typeof body.message !== 'string' || !body.message.trim()) {
    throw new AppError('invalidResponse');
  }
  return {
    ...body,
    message: 'Your account has been created',
  } as RegisterResponse;
};
export const checkRegistrationEligibilityApi = async (
  mobile_number: string,
): Promise<Eligibility> => {
  const response = await api.post('/auth/check-eligibility', {mobile_number});
  const body = objectBody(response.data);
  if (typeof body.eligible !== 'boolean') {
    throw new AppError('invalidResponse');
  }
  return {eligible: body.eligible};
};

// ─── Patient Data Endpoints ────────────────────────────────────
export const fetchReportsApi = async (
  mr_no: string,
): Promise<LabReportsResponse> =>
  collection((await api.get(`/patients/${mr_no}/reports`)).data, 'reports');

export const fetchCombineLabReportsApi = async (
  opat_id: string,
): Promise<CombineLabReportsResponse> => {
  const reports = arrayBody<CombineLabTest>(
    (await api.get(`/patients/${opat_id}/combinelabreports`)).data,
  );
  if (
    !reports.every(
      report =>
        Array.isArray(report.history) &&
        report.history.every(
          item =>
            item &&
            Array.isArray(item.results) &&
            item.results.every(
              result =>
                result && typeof result === 'object' && !Array.isArray(result),
            ),
        ),
    )
  ) {
    throw new AppError('invalidResponse');
  }
  return reports;
};
export const fetchRadiologyReportsApi = async (
  mr_no: string,
): Promise<RadiologyReportsResponse> =>
  collection((await api.get(`/patients/${mr_no}/radiology`)).data, 'reports');

export const fetchInpatientHistoryApi = async (
  mr_no: string,
): Promise<InpatientHistoryResponse> =>
  collection(
    (await api.get(`/patients/${mr_no}/inpatienthistory`)).data,
    'inpatienthistory',
  );

export const fetchConsultationHistoryApi = async (
  mr_no: string,
): Promise<ConsultationHistoryResponse> =>
  collection(
    (await api.get(`/patients/${mr_no}/consultationhistory`)).data,
    'consultationshistory',
  );

export const fetchConsultantsApi = async (): Promise<Consultant[]> =>
  arrayBody((await api.get('/patients/consultants')).data);

export const fetchAppointmentSlotsApi = async (
  opat_id: string,
  consl_id: string,
  date: string,
): Promise<AppointmentSlotsResponse> => {
  const result = collection<AppointmentSlotsResponse>(
    (await api.get(`/patients/${opat_id}/${consl_id}/${date}/appointments`))
      .data,
    'appointments',
  );
  if (
    !result.appointments.every(
      day =>
        Array.isArray(day.time_slot) &&
        day.time_slot.every(
          slot =>
            slot &&
            typeof slot.time_slot === 'string' &&
            typeof slot.time_fr === 'string' &&
            typeof slot.time_to === 'string',
        ),
    )
  ) {
    throw new AppError('invalidResponse');
  }
  return result;
};
export const createAppointmentApi = async (
  opat_id: string,
  consl_id: string,
  data: CreateAppointmentRequest,
): Promise<any> => {
  const body = objectBody(
    (
      await api.post(
        `/patients/${opat_id}/${consl_id}/createappointment`,
        data,
        {errorContext: 'booking'},
      )
    ).data,
  );
  if (!Object.keys(body).length) {
    throw new AppError('invalidResponse');
  }
  return body;
};
export const fetchUpcomingAppointmentsApi = async (
  mr_no: string,
): Promise<UpcomingAppointmentsResponse> => {
  const {data} = await api.get(`/patients/${mr_no}/upcomingappointments`, {
    errorContext: 'upcomingAppointments',
  });
  // A successful null payload or null collection also represents no records.
  const body =
    data === null
      ? {appointments: []}
      : data && data.success !== false && data.appointments === null
      ? {...data, appointments: []}
      : data;
  return collection(body, 'appointments');
};

export const fetchTodaysClinicApi = async (): Promise<TodaysClinicResponse> =>
  collection((await api.get('/patients/todaysclinic')).data, 'consultations');

// ─── Password recovery: success must come from the real service ───────────────
export const sendOtpApi = async (data: {
  mobile: string;
  email: string;
}): Promise<void> => {
  const body = objectBody((await api.post('/auth/request-otp', data)).data);
  if (body.success !== true && body.status !== 'success') {
    throw new AppError('invalidResponse');
  }
};

export const verifyOtpAndResetApi = async (data: {
  mobile: string;
  email: string;
  otp_code: string;
  new_password: string;
}): Promise<void> => {
  const body = objectBody(
    (await api.post('/auth/verify-otp-and-reset', data, {errorContext: 'otp'}))
      .data,
  );
  if (body.success !== true && body.status !== 'success') {
    throw new AppError('invalidResponse');
  }
};

export interface RegisterDeviceTokenPayload {
  device_token: string;
  platform: 'android' | 'ios';
}
export const registerDeviceTokenApi = async (
  payload: RegisterDeviceTokenPayload,
): Promise<void> => {
  await api.post('/auth/register-device', payload);
};
export default api;
