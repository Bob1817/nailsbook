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
  technicianId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkDetail extends NailWork {
  isLiked: boolean;
  isFavorited: boolean;
  comments: Comment[];
}

export interface CommentUser {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: 'technician' | 'client' | 'unknown';
}

export interface Comment {
  id: number;
  workId: number;
  parentId: number | null;
  content: string;
  isPinned: boolean;
  isHidden: boolean;
  isAuthor: boolean;
  user: CommentUser;
  replies: Comment[];
  createdAt: string;
  updatedAt: string;
}

export const worksService = {
  async getWorks(): Promise<NailWork[]> {
    const response = await api.get('/works');
    return response.data;
  },

  async getFavorites(): Promise<NailWork[]> {
    const response = await api.get('/favorites');
    return response.data;
  },

  async getLikes(): Promise<NailWork[]> {
    const response = await api.get('/likes');
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

  async addComment(workId: number, content: string, parentId?: number): Promise<Comment> {
    const response = await api.post(`/works/${workId}/comments`, { content, parentId });
    return response.data;
  },

  async deleteComment(workId: number, commentId: number): Promise<{ success: boolean }> {
    const response = await api.delete(`/works/${workId}/comments/${commentId}`);
    return response.data;
  },
};
