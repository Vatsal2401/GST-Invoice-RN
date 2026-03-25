import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://invoice-backend.autoreels.in';

// Callback set by the store after it initialises — avoids circular imports
let onLogout: (() => void) | null = null;
export function setLogoutCallback(fn: () => void) {
  onLogout = fn;
}

const apiClient = axios.create({ baseURL: BASE_URL });

// Attach access token to every request
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 → try refresh once, else logout
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await AsyncStorage.getItem('refresh_token');
        if (!refresh) throw new Error('no refresh token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refresh,
        });
        await AsyncStorage.setItem('access_token', data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(original);
      } catch {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        if (onLogout) onLogout();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
