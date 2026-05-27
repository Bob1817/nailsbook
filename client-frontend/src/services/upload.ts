import api from './api';
import { normalizeImageUrl } from '../utils/imageUrl';

export const uploadService = {
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/uploads/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return {
      ...response.data,
      url: normalizeImageUrl(response.data.url),
    };
  },
};
