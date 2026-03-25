import apiClient from '../lib/apiClient';
import type { BusinessProfile, BusinessProfileInput } from '../types';

export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  const res = await apiClient.get<BusinessProfile>('/invoice/profile');
  return res.data ?? null;
}

export async function saveBusinessProfile(data: BusinessProfileInput): Promise<void> {
  await apiClient.put('/invoice/profile', data);
}

export async function uploadLogo(fileUri: string, fileName: string, mimeType: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', { uri: fileUri, name: fileName, type: mimeType } as unknown as Blob);
  const res = await apiClient.post<{ logo_url: string }>('/invoice/profile/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.logo_url;
}
