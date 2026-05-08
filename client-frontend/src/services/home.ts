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

export interface TechnicianInfo {
  id: number;
  name: string;
  phone: string;
  avatarUrl: string | null;
  city: string | null;
  serviceArea: string | null;
}

export interface LatestBooking {
  id: number;
  bookingNo: string;
  status: string;
  startTime: string;
  endTime: string;
  address: string | null;
  serviceType?: string;
}

export interface HomeData {
  technician: TechnicianInfo;
  works: NailWork[];
  latestBooking: LatestBooking | null;
}

export const homeService = {
  async getHome(): Promise<HomeData> {
    const response = await api.get('/home');
    return response.data;
  },

  async getWorks(): Promise<NailWork[]> {
    const response = await api.get('/home/works');
    return response.data;
  },

  async getWork(id: number): Promise<NailWork> {
    const response = await api.get(`/home/works/${id}`);
    return response.data;
  },
};
