import api from './api';
import {
  fallbackCustomers,
  parseTagString,
  type TechnicianCustomerDetail,
  type TechnicianCustomerSummary,
} from './technicianData';

interface CustomerApiSummary {
  id: number;
  name: string;
  phone?: string | null;
  address?: string | null;
  tags?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface CustomerApiDetail extends CustomerApiSummary {
  quotes?: Array<{
    id: number;
    quoteNo: string;
    price: number;
    status: string;
    createdAt: string;
  }>;
  bookings?: Array<{
    id: number;
    bookingNo: string;
    startTime: string;
    status: string;
    isDepositPaid?: boolean;
    quote?: {
      title?: string | null;
      price?: number | null;
    };
  }>;
  revenues?: Array<{
    id: number;
    amount: number;
    recognizedAt: string;
  }>;
}

interface CustomerListResponse {
  data: CustomerApiSummary[];
}

function normalizeCustomerSummary(item: CustomerApiSummary): TechnicianCustomerSummary {
  return {
    id: item.id,
    name: item.name,
    phone: item.phone || '未填写',
    address: item.address || '未填写地址',
    tags: parseTagString(item.tags),
    note: item.notes || '暂无备注',
    recentServiceAt: item.createdAt,
    totalBookings: 0,
    totalSpent: 0,
  };
}

function normalizeCustomerDetail(item: CustomerApiDetail): TechnicianCustomerDetail {
  const tags = parseTagString(item.tags);
  const bookings = item.bookings ?? [];
  const revenues = item.revenues ?? [];

  return {
    id: item.id,
    name: item.name,
    phone: item.phone || '未填写',
    address: item.address || '未填写地址',
    tags,
    note: item.notes || '暂无备注',
    recentServiceAt: bookings[0]?.startTime || item.createdAt,
    totalBookings: bookings.length,
    totalSpent: revenues.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    preferenceStyle: tags[0] || '简约',
    preferenceColor: tags[1] || '裸色系',
    allergyNote: '暂无记录',
    history: bookings.map((booking) => ({
      id: booking.id,
      label: booking.quote?.title || booking.bookingNo,
      date: booking.startTime,
      price: Number(booking.quote?.price ?? 0),
      status: booking.status,
      depositPaid: Boolean(booking.isDepositPaid),
    })),
  };
}

export const customersService = {
  async list(params?: { technicianId?: number; search?: string }): Promise<TechnicianCustomerSummary[]> {
    try {
      const response = await api.get<CustomerListResponse>('/customers', { params });
      return response.data.data.map(normalizeCustomerSummary);
    } catch {
      const query = params?.search?.trim().toLowerCase();
      return fallbackCustomers
        .filter((customer) => !query || customer.name.toLowerCase().includes(query))
        .map((customer) => ({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          tags: customer.tags,
          note: customer.note,
          recentServiceAt: customer.recentServiceAt,
          totalBookings: customer.totalBookings,
          totalSpent: customer.totalSpent,
        }));
    }
  },

  async getById(id: number): Promise<TechnicianCustomerDetail | null> {
    try {
      const response = await api.get<CustomerApiDetail>(`/customers/${id}`);
      return normalizeCustomerDetail(response.data);
    } catch {
      return fallbackCustomers.find((customer) => customer.id === id) ?? null;
    }
  },
};
