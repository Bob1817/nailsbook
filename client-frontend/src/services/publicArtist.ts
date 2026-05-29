import axios from 'axios';

// 公开接口（免登录），与 client 接口同源，仅前缀不同
const PUBLIC_BASE = (import.meta.env.VITE_API_URL || '/api/client').replace(/\/client$/, '/public');

const publicApi = axios.create({ baseURL: PUBLIC_BASE, timeout: 10000 });

export interface PublicArtistWork {
  id: number;
  title: string | null;
  coverUrl: string | null;
  imageUrls: string[];
}

export interface PublicArtist {
  id: number;
  name: string;
  avatarUrl: string | null;
  city: string | null;
  serviceArea: string | null;
  homeService: boolean;
  shopService: boolean;
  status: string;
  invitationCode: string;
  socialMedia: Record<string, string> | null;
}

export interface PublicArtistCard {
  artist: PublicArtist;
  works: PublicArtistWork[];
}

export interface PublicWorkComment {
  id: number;
  content: string;
  isPinned: boolean;
  user: { id: number; name: string; avatarUrl: string | null; role: string };
  replies: PublicWorkComment[];
  createdAt: string;
}

export interface PublicWorkDetailData {
  id: number;
  title: string | null;
  description: string | null;
  tags: string[];
  coverUrl: string | null;
  imageUrls: string[];
  likeCount: number;
  commentCount: number;
  technician: { id: number; name: string; avatarUrl: string | null };
  comments: PublicWorkComment[];
  createdAt: string;
}

export const publicArtistService = {
  async getCard(code: string): Promise<PublicArtistCard> {
    const response = await publicApi.get(`/artist/${encodeURIComponent(code)}`);
    return response.data;
  },

  async getWork(id: number): Promise<PublicWorkDetailData> {
    const response = await publicApi.get(`/works/${id}`);
    return response.data;
  },
};
