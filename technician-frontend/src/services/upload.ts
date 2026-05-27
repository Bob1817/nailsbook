import { normalizeImageUrl } from '../utils/imageUrl';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/technician';

export const uploadService = {
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/uploads/image`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('technician_token') || ''}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload error:', response.status, errorText);
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    return { ...result, url: normalizeImageUrl(result.url) };
  },
};
