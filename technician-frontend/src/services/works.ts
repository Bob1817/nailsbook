import api from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/technician';
const BASE_URL = API_URL.replace('/api/technician', '');

export interface Work {
  id: number;
  title: string | null;
  coverUrl: string | null;
  imageUrls: string[];
  description: string | null;
  tags: string[];
  price: number | null;
  standardPrice?: number | null;
  standardPriceFen?: number | null;
  isVisible: boolean;
  isPinned: boolean;
  isFeatured: boolean;
  heroSlot?: number | null;
  visibilityScope?: string;
  publicationStatus?: string;
  archivedAt?: string | null;
  sortOrder: number;
  viewCount: number;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  unreadComments: number;
  unreadLikes: number;
  unreadFavorites: number;
  isLiked: boolean;
  isFavorited: boolean;
  technicianName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkDto {
  createRequestId?: string;
  title: string;
  coverUrl?: string;
  coverWidth?: number;
  coverHeight?: number;
  images?: string[];
  description?: string;
  designIdea?: string;
  suitableScene?: string;
  outfitSuggestion?: string;
  recommendationScore?: number;
  tags?: string[];
  price?: number;
  selectedServiceIds?: string[];
  serviceCustomPrices?: Record<string, number>;
  standardPrice?: number;
  isVisible?: boolean;
  sortOrder?: number;
}

export type UpdateWorkDto = Partial<CreateWorkDto>;

export interface BatchWorksPayload {
  workIds: number[];
  action: 'show' | 'hide' | 'delete' | 'add_tags' | 'remove_tags' | 'update_price';
  tags?: string[];
  price?: number;
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
  isRead: boolean;
  isAuthor: boolean;
  user: CommentUser;
  replies: Comment[];
  createdAt: string;
  updatedAt: string;
}

function processWork(work: Work): Work {
  // Backend now returns absolute URLs, but we keep this for safety
  // in case some URLs are still relative (e.g., from old data)
  const rawImageUrls = work.imageUrls || [];
  const processedImageUrls = rawImageUrls.map(url => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url}`;
  }).filter((url): url is string => url !== null);

  const coverUrl = work.coverUrl?.startsWith('http')
    ? work.coverUrl
    : work.coverUrl
      ? `${BASE_URL}${work.coverUrl}`
      : null;

  const resolvedPrice =
    work.price ??
    work.standardPrice ??
    (work.standardPriceFen != null ? Math.round(work.standardPriceFen / 100) : null);

  return {
    ...work,
    price: resolvedPrice,
    coverUrl,
    imageUrls: processedImageUrls,
  };
}

export const worksService = {
  async list(): Promise<Work[]> {
    const response = await api.get('/works');
    return response.data.map(processWork);
  },

  async getById(id: number): Promise<Work> {
    const response = await api.get(`/works/${id}`);
    return processWork(response.data);
  },

  async create(data: CreateWorkDto): Promise<Work> {
    const response = await api.post('/works', {
      ...data,
      coverUrl: data.coverUrl ?? data.images?.[0],
      images: data.images ? JSON.stringify(data.images) : undefined,
      tags: data.tags ? data.tags.join(',') : undefined,
      price: data.price ?? undefined,
    });
    return processWork(response.data);
  },

  async update(id: number, data: UpdateWorkDto): Promise<Work> {
    const response = await api.patch(`/works/${id}`, {
      ...data,
      coverUrl: data.coverUrl ?? data.images?.[0],
      images: data.images ? JSON.stringify(data.images) : undefined,
      tags: data.tags ? data.tags.join(',') : undefined,
      price: data.price ?? undefined,
    });
    return processWork(response.data);
  },

  async delete(id: number): Promise<{ success: boolean }> {
    const response = await api.delete(`/works/${id}`);
    return response.data;
  },

  async toggleVisible(id: number): Promise<Work> {
    const response = await api.post(`/works/${id}/toggle-visible`);
    return processWork(response.data);
  },

  async togglePinned(id: number): Promise<Work> {
    const response = await api.post(`/works/${id}/toggle-pinned`);
    return processWork(response.data);
  },

  async toggleFeatured(id: number): Promise<Work> {
    const response = await api.post(`/works/${id}/toggle-featured`);
    return processWork(response.data);
  },

  // Like functionality
  async likeWork(id: number): Promise<{ liked: boolean }> {
    const response = await api.post(`/works/${id}/like`);
    return response.data;
  },

  // Favorite functionality
  async favoriteWork(id: number): Promise<{ favorited: boolean }> {
    const response = await api.post(`/works/${id}/favorite`);
    return response.data;
  },

  // Comment functionality
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

  async pinComment(workId: number, commentId: number): Promise<{ pinned: boolean }> {
    const response = await api.post(`/works/${workId}/comments/${commentId}/pin`);
    return response.data;
  },

  async hideComment(workId: number, commentId: number): Promise<{ hidden: boolean }> {
    const response = await api.post(`/works/${workId}/comments/${commentId}/hide`);
    return response.data;
  },

  async markCommentsAsRead(workId: number): Promise<{ success: boolean }> {
    const response = await api.post(`/works/${workId}/mark-comments-read`);
    return response.data;
  },

  async markLikesAsRead(workId: number): Promise<{ success: boolean }> {
    const response = await api.post(`/works/${workId}/mark-likes-read`);
    return response.data;
  },

  async markFavoritesAsRead(workId: number): Promise<{ success: boolean }> {
    const response = await api.post(`/works/${workId}/mark-favorites-read`);
    return response.data;
  },

  async createDraft(data: UpdateWorkDto): Promise<Work> {
    const response = await api.post('/works/drafts', {
      ...data,
      coverUrl: data.coverUrl ?? data.images?.[0],
      images: data.images ? JSON.stringify(data.images) : undefined,
      tags: data.tags ? data.tags.join(',') : undefined,
    });
    return processWork(response.data);
  },

  async saveDraft(id: number, data: UpdateWorkDto): Promise<Work> {
    const response = await api.patch(`/works/${id}/draft`, {
      ...data,
      coverUrl: data.coverUrl ?? data.images?.[0],
      images: data.images ? JSON.stringify(data.images) : undefined,
      tags: data.tags ? data.tags.join(',') : undefined,
    });
    return processWork(response.data);
  },

  async publish(id: number): Promise<Work> {
    const response = await api.post(`/works/${id}/publish`);
    return processWork(response.data);
  },

  async batchAction(payload: BatchWorksPayload): Promise<{ affected: number }> {
    const response = await api.post('/works/batch', payload);
    return response.data;
  },

  async reorder(orderedWorkIds: number[]): Promise<{ updated: number }> {
    const response = await api.put('/works/reorder', { orderedWorkIds });
    return response.data;
  },
};
