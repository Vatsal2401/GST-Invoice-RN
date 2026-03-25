import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLogoutCallback } from '../lib/apiClient';
import type { BusinessProfile } from '../types';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface AppStore {
  // Auth
  isAuthenticated: boolean;
  setAuthenticated: (v: boolean) => void;
  logout: () => void;

  // Business profile
  businessProfile: BusinessProfile | null;
  setBusinessProfile: (profile: BusinessProfile | null) => void;

  // Toast
  toast: ToastState | null;
  showToast: (message: string, type: 'success' | 'error') => void;
  clearToast: () => void;
}

export const useStore = create<AppStore>((set) => {
  const logout = () => {
    AsyncStorage.multiRemove(['access_token', 'refresh_token']).catch(() => {});
    set({ isAuthenticated: false, businessProfile: null });
  };
  // Wire apiClient's 401 handler to this store's logout
  setLogoutCallback(logout);

  return {
  isAuthenticated: false,
  setAuthenticated: (v) => set({ isAuthenticated: v }),
  logout,

  businessProfile: null,
  setBusinessProfile: (profile) => set({ businessProfile: profile }),

  toast: null,
  showToast: (message, type) => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
  };
});
