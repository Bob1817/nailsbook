import api from './api';

export interface NailWork {
  id: number;
  title: string | null;
  coverUrl: string | null;
  imageUrls: string[];
  description: string | null;
  tags: string[];
  likeCount: number;
  commentCount: number;
  technicianName: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkDetail extends NailWork {
  isLiked: boolean;
  isFavorited: boolean;
  comments: Comment[];
}

export interface Comment {
  id: number;
  content: string;
  technicianId?: number;
  clientId?: number;
  createdAt: string;
}

export const worksService = {
  async getWorks(): Promise<NailWork[]> {
    const response = await api.get('/works');
    return response.data;
  },

  async getWork(id: number): Promise<WorkDetail> {
    const response = await api.get(`/works/${id}`);
    return response.data;
  },

  async likeWork(id: number): Promise<{ liked: boolean }> {
    const response = await api.post(`/works/${id}/like`);
    return response.data;
  },

  async favoriteWork(id: number): Promise<{ favorited: boolean }> {
    const response = await api.post(`/works/${id}/favorite`);
    return response.data;
  },

  async getComments(workId: number): Promise<Comment[]> {
    const response = await api.get(`/works/${workId}/comments`);
    return response.data;
  },

  async addComment(workId: number, content: string): Promise<Comment> {
    const response = await api.post(`/works/${workId}/comments`, { content });
    return response.data;
  },
};
