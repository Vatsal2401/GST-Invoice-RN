import axios from 'axios';

export function getApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message[0] : String(data.message);
    }
    if (!err.response) return 'Cannot connect to server. Check your internet connection.';
  }
  return fallback;
}
