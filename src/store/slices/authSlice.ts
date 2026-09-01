import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {MrProfile} from '../../services/api';

interface AuthState {
  isAuthenticated: boolean;
  sessionToken: string | null;
  mobileNumber: string | null; // Persisted for push notification background refresh
  mrProfiles: MrProfile[];
  selectedMrNo: string | null;
  selectedPatientName: string | null;
  selectedGender: string | null;
  selectedDob: string | null;
  resetEmail: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  sessionToken: null,
  mobileNumber: null,
  mrProfiles: [],
  selectedMrNo: null,
  selectedPatientName: null,
  selectedGender: null,
  selectedDob: null,
  resetEmail: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<{token: string; mrProfiles: MrProfile[]; mobileNumber?: string}>,
    ) => {
      state.isAuthenticated = true;
      state.sessionToken = action.payload.token;
      state.mrProfiles = action.payload.mrProfiles;
      if (action.payload.mobileNumber) {
        state.mobileNumber = action.payload.mobileNumber;
      }
    },
    selectProfile: (
      state,
      action: PayloadAction<{
        mr_no: string;
        patient_name: string;
        gender?: string;
        dob?: string;
      }>,
    ) => {
      state.selectedMrNo = action.payload.mr_no;
      state.selectedPatientName = action.payload.patient_name;
      state.selectedGender = action.payload.gender || null;
      state.selectedDob = action.payload.dob || null;
    },
    setGender: (state, action: PayloadAction<'M' | 'F'>) => {
      state.selectedGender = action.payload;
    },
    logout: state => {
      state.isAuthenticated = false;
      state.sessionToken = null;
      state.mobileNumber = null;
      state.mrProfiles = [];
      state.selectedMrNo = null;
      state.selectedPatientName = null;
      state.selectedGender = null;
      state.selectedDob = null;
      state.resetEmail = null;
    },
    setResetEmail: (state, action: PayloadAction<string>) => {
      state.resetEmail = action.payload;
    },
    clearResetEmail: state => {
      state.resetEmail = null;
    },
  },
});

export const {
  loginSuccess,
  selectProfile,
  setGender,
  logout,
  setResetEmail,
  clearResetEmail,
} = authSlice.actions;

export default authSlice.reducer;
