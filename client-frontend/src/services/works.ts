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
  favoriteCount?: number;
  isLiked?: boolean;
  technicianName: string;
  technicianAvatarUrl?: string | null;
  technicianId?: number;
  createdAt: string;
  updatedAt: string;
}

export type WorksSortBy = 'latest' | 'likes' | 'comments' | 'favorites';

export interface WorkDetail extends NailWork {
  isLiked: boolean;
  isFavorited: boolean;
  technician?: { id: number; name: string; avatarUrl: string | null };
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
  async getWorks(techId?: number, sortBy?: WorksSortBy, sortDir?: 'asc' | 'desc'): Promise<NailWork[]> {
    const params: Record<string, string | number> = {};
    if (techId) params.techId = techId;
    if (sortBy) params.sortBy = sortBy;
    if (sortDir) params.sortDir = sortDir;
    const response = await api.get('/works', Object.keys(params).length ? { params } : undefined);
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

  async reportComment(
    commentId: number,
    reason: 'spam' | 'inappropriate' | 'harassment' | 'other',
  ): Promise<{ success: boolean; alreadyReported: boolean }> {
    const response = await api.post('/client/reports', { commentId, reason });
    return response.data;
  },
};
