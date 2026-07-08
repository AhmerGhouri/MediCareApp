import axios from 'axios';
import { store } from '../store';

// ─── Base Configuration ────────────────────────────────────────
const BASE_URL = 'http://api.medicarehospital.pk';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Automatically attach JWT token to every request
api.interceptors.request.use(config => {
  const token = store.getState().auth.sessionToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  return `${REPORT_BASE_URL}?report=LAB_APPROVAL_REP.rep&cmdkey=orarep&ID=AND%20(ltestd_ltestm_id%20%7C%7C%20%27-%27%20%7C%7C%20to_char(ltestd_ltest_id))%20IN%20(%27${idParam}%27)%20&ID1=AND%20(LCULRESD_LCULRESM_LTESTM_ID%20%7C%7C%20%27-%27%20%7C%7C%20(LCULRESD_LCULRESM_LTEST_ID))%20%20IN%20(%27${idParam}%27)`;
};

// ─── Report Download URL Builder ───────────────────────────────
// const RADIO_REPORT_BASE_URL =
//   'http://rtums.sohailuniversity.edu.pk:9002/reports/rwservlet';

export const getRadiologyReportDownloadUrl = (test_id: number): string => {
  const idParam = `${test_id}`;
  return `${REPORT_BASE_URL}?report=RADIOLOGY_REP1.rep&cmdkey=orarep&ID=AND%20REPTM_billm_id%20IN%20(${idParam})`;
};

export interface LabReportsResponse {
  opat_id: number;
  patient_name: string;
  mobile: string;
  reports: LabReport[];
}

export interface RadiologyReport {
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
  "mr #"?: string;
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
  to_time: string;   // e.g., "14:00"
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

// ─── Auth Endpoints ────────────────────────────────────────────

export const loginApi = async (
  mobile_number: string,
  password: string,
): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/login', {
    mobile_number,
    password,
  });
  return response.data;
};

export const registerApi = async (
  payload: RegisterPayload,
): Promise<RegisterResponse> => {
  const response = await api.post<RegisterResponse>('/auth/register', payload);
  return response.data;
};

/** Check if mobile number is allowed to register (exists in hospital DB) */
export const checkRegistrationEligibilityApi = async (
  mobile_number: string,
): Promise<{ authorized: boolean }> => {
  try {
    const response = await api.post<{ authorized: boolean }>(
      '/auth/check-eligibility',
      {
        mobile_number,
      },
    );
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ authorized: true }); // Mock default so it doesn't block frontend testing
        }, 1000);
      });
    }
    throw error;
  }
};

// ─── Patient Data Endpoints ────────────────────────────────────

export const fetchReportsApi = async (
  mr_no: string,
): Promise<LabReportsResponse> => {
  try {
    const response = await api.get<LabReportsResponse>(
      `/patients/${mr_no}/reports`,
    );
    if (response.data && Array.isArray(response.data.reports)) {
      return response.data;
    }
    if (Array.isArray(response.data)) {
      return { reports: response.data } as any;
    }
    if (
      (response.data as any)?.data &&
      Array.isArray((response.data as any).data.reports)
    ) {
      return (response.data as any).data;
    }

    // No valid data — return empty reports instead of throwing
    return { opat_id: 0, patient_name: '', mobile: '', reports: [] };
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.detail || 'Unable to fetch reports. Please try again.',
    );
  }
};

export const fetchRadiologyReportsApi = async (
  mr_no: string,
): Promise<RadiologyReportsResponse> => {
  try {
    const response = await api.get<RadiologyReportsResponse>(
      `/patients/${mr_no}/radiology`,
    );

    if (response.data && Array.isArray(response.data.reports)) {
      return response.data;
    }
    if (Array.isArray(response.data)) {
      return { reports: response.data } as any;
    }
    if (
      (response.data as any)?.data &&
      Array.isArray((response.data as any).data.reports)
    ) {
      return (response.data as any).data;
    }

    return { opat_id: 0, patient_name: '', mobile: '', reports: [] };
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.detail || 'Unable to fetch radiology reports. Please try again.',
    );
  }
};

export const fetchInpatientHistoryApi = async (
  mr_no: string,
): Promise<InpatientHistoryResponse> => {
  try {
    const response = await api.get<InpatientHistoryResponse>(
      `/patients/${mr_no}/inpatienthistory`,
    );

    if (response.data && Array.isArray(response.data.inpatienthistory)) {
      return response.data;
    }
    if (Array.isArray(response.data)) {
      return { inpatienthistory: response.data } as any;
    }
    if (
      (response.data as any)?.data &&
      Array.isArray((response.data as any).data.inpatienthistory)
    ) {
      return (response.data as any).data;
    }

    return { opat_id: 0, patient_name: '', mobile: '', inpatienthistory: [] };
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.detail || 'Unable to fetch inpatient history. Please try again.',
    );
  }
};

export const fetchConsultationHistoryApi = async (
  mr_no: string,
): Promise<ConsultationHistoryResponse> => {
  try {
    const response = await api.get<ConsultationHistoryResponse>(
      `/patients/${mr_no}/consultationhistory`,
    );

    if (response.data && Array.isArray(response.data.consultationshistory)) {
      return response.data;
    }
    if (Array.isArray(response.data)) {
      return { reports: response.data } as any;
    }
    if (
      (response.data as any)?.data &&
      Array.isArray((response.data as any).data.consultationshistory)
    ) {
      return (response.data as any).data;
    }

    return { opat_id: 0, patient_name: '', mobile: null, consultationshistory: [] };
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.detail || 'Unable to fetch consultation history. Please try again.',
    );
  }
};

export const fetchConsultantsApi = async (): Promise<Consultant[]> => {
  try {
    const response = await api.get<Consultant[]>(`patients/consultants`);

    if (Array.isArray(response.data)) {
      // console.log("Consultants Data:", response.data);
      return response.data;

    }
    if ((response.data as any)?.data && Array.isArray((response.data as any).data)) {
      return (response.data as any).data;
    }

    throw new Error('No valid consultants array found in response');
  } catch (error) {
    console.error('Error fetching consultants data:', error);
    throw error;
  }
};

export const fetchAppointmentSlotsApi = async (
  opat_id: string,
  consl_id: string,
  date: string,
): Promise<AppointmentSlotsResponse> => {
  try {
    const response = await api.get<AppointmentSlotsResponse>(
      `/patients/${opat_id}/${consl_id}/${date}/appointments`
    );
    console.log("data", response)
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.detail || 'Unable to fetch appointment slots. Please try again.'
    );
  }
};

export const createAppointmentApi = async (
  opat_id: string,
  consl_id: string,
  data: CreateAppointmentRequest
): Promise<any> => {
  try {
    const response = await api.post(
      `/patients/${opat_id}/${consl_id}/createappointment`,
      data
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.detail || 'Unable to book appointment. Please try again.'
    );
  }
};

export const fetchUpcomingAppointmentsApi = async (
  mr_no: string,
): Promise<UpcomingAppointmentsResponse> => {
  try {
    const response = await api.get<UpcomingAppointmentsResponse>(
      `/patients/${mr_no}/upcomingappointments`,
    );

    if (response.data && Array.isArray(response.data.appointments)) {
      return response.data;
    }
    if (Array.isArray(response.data)) {
      return { appointments: response.data } as any;
    }
    if (
      (response.data as any)?.data &&
      Array.isArray((response.data as any).data.appointments)
    ) {
      return (response.data as any).data;
    }

    return { opat_id: 0, patient_name: '', mobile: null, appointments: [] };
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.detail || 'Unable to fetch upcoming appointments. Please try again.',
    );
  }
};

export const fetchTodaysClinicApi = async (): Promise<TodaysClinicResponse> => {
  try {
    const response = await api.get<TodaysClinicResponse>('/patients/todaysclinic');
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.detail || "Unable to fetch today's clinic data. Please try again.",
    );
  }
};

// ─── Forgot Password Endpoints ─────────────────────────────────
// These endpoints need to be created on your backend.
// Currently using mock implementations — swap with real API calls when ready.

/** Step 1: Verify if mobile number is registered */
export const verifyMobileApi = async (
  mobile_number: string,
): Promise<{ registered: boolean; masked_email: string }> => {
  try {
    const response = await api.post<{
      registered: boolean;
      masked_email: string;
    }>('/auth/verify-mobile', {
      mobile_number,
    });
    return response.data;
  } catch (error: any) {
    // If backend endpoint doesn't exist yet, fallback to mock
    if (error?.response?.status === 404) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ registered: true, masked_email: 'u***@example.com' });
        }, 1200);
      });
    }
    throw error;
  }
};

/** Step 2: Send OTP to the email associated with the mobile number */
export const sendOtpApi = async (
  mobile_number: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post<{ success: boolean; message: string }>(
      '/auth/send-otp',
      {
        mobile_number,
      },
    );
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ success: true, message: 'OTP sent to registered email.' });
        }, 1500);
      });
    }
    throw error;
  }
};

/** Step 3: Verify OTP code */
export const verifyOtpApi = async (data: {
  mobile_number: string;
  otp: string;
}): Promise<{ success: boolean; reset_token: string }> => {
  try {
    const response = await api.post<{ success: boolean; reset_token: string }>(
      '/auth/verify-otp',
      {
        mobile_number: data.mobile_number,
        otp: data.otp,
      },
    );
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      // Mock: accept '1234' as valid OTP for testing
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (data.otp === '1234') {
            resolve({ success: true, reset_token: 'mock-reset-token-777' });
          } else {
            reject(new Error('Invalid OTP code.'));
          }
        }, 1500);
      });
    }
    throw error;
  }
};

/** Step 4: Reset password with the verified token */
export const resetPasswordApi = async (data: {
  reset_token: string;
  mobile_number: string;
  new_password: string;
}): Promise<{ success: boolean }> => {
  try {
    const response = await api.post<{ success: boolean }>(
      '/auth/reset-password',
      {
        reset_token: data.reset_token,
        mobile_number: data.mobile_number,
        new_password: data.new_password,
      },
    );
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (data.new_password.length < 6) {
            return reject(new Error('Password must be at least 6 characters.'));
          }
          resolve({ success: true });
        }, 1500);
      });
    }
    throw error;
  }
};

export default api;
