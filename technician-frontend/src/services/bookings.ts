import api from './api';
import {
  bookingStatusActions,
  fallbackBookings,
  parseTagString,
  type BookingStatus,
  type TechnicianBooking,
} from './technicianData';

const localDraftKey = 'technician_local_bookings';

interface BookingApiItem {
  id: number;
  bookingNo: string;
  customerId: number;
  startTime: string;
  endTime: string;
  address: string | null;
  status: BookingStatus;
  serviceType?: string | null;
  isDepositPaid?: boolean;
  customer?: {
    id: number;
    name: string;
    phone?: string | null;
    tags?: string | null;
  };
  quote?: {
    id: number;
    quoteNo?: string;
    title?: string | null;
    description?: string | null;
    price?: number | null;
  };
  remark?: string | null;
}

interface BookingListResponse {
  data: BookingApiItem[];
}

interface CreateBookingInput {
  customerId: number;
  customerName: string;
  customerPhone?: string;
  serviceName: string;
  address: string;
  startTime: string;
  endTime: string;
  price: number;
  note?: string;
}

let bookingFallbackState = [...fallbackBookings];

function loadLocalDraftBookings(): TechnicianBooking[] {
  const stored = localStorage.getItem(localDraftKey);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as TechnicianBooking[];
  } catch {
    localStorage.removeItem(localDraftKey);
    return [];
  }
}

function saveLocalDraftBookings(bookings: TechnicianBooking[]) {
  localStorage.setItem(localDraftKey, JSON.stringify(bookings));
}

function mergeBookings(primary: TechnicianBooking[], secondary: TechnicianBooking[]) {
  const bookingMap = new Map<number, TechnicianBooking>();
  [...primary, ...secondary].forEach((booking) => {
    bookingMap.set(booking.id, booking);
  });

  return [...bookingMap.values()].sort((left, right) => left.startTime.localeCompare(right.startTime));
}

function isQuoteNumber(value?: string | null) {
  return Boolean(value && /^QT\d+[A-Z0-9]*$/i.test(value.trim()));
}

function normalizeBooking(item: BookingApiItem): TechnicianBooking {
  const serviceType =
    item.serviceType === '到店美甲'
      ? 'shop'
      : item.serviceType === '上门美甲'
        ? 'home'
        : undefined;

  const serviceName =
    item.quote?.title ||
    (item.quote?.description && !isQuoteNumber(item.quote.description) ? item.quote.description : null) ||
    parseTagString(item.customer?.tags)[0] ||
    '预约服务';

  return {
    id: item.id,
    bookingNo: item.bookingNo,
    customerId: item.customer?.id ?? item.customerId,
    customerName: item.customer?.name ?? '未命名客户',
    customerPhone: item.customer?.phone ?? undefined,
    serviceName,
    address: item.address || '待补充服务地址',
    startTime: item.startTime,
    endTime: item.endTime,
    status: item.status,
    serviceType,
    price: Number(item.quote?.price ?? 0),
    depositPaid: Boolean(item.isDepositPaid),
  };
}

function filterFallbackBookings(params?: {
  status?: BookingStatus;
  customerId?: number;
}) {
  return mergeBookings(bookingFallbackState, loadLocalDraftBookings()).filter((booking) => {
    if (params?.status && booking.status !== params.status) {
      return false;
    }
    if (params?.customerId && booking.customerId !== params.customerId) {
      return false;
    }
    return true;
  });
}

export const bookingsService = {
  async list(params?: {
    technicianId?: number;
    status?: BookingStatus;
    customerId?: number;
  }): Promise<TechnicianBooking[]> {
    try {
      const response = await api.get<BookingListResponse>('/bookings', { params });
      return mergeBookings(response.data.data.map(normalizeBooking), loadLocalDraftBookings()).filter((booking) => {
        if (params?.status && booking.status !== params.status) {
          return false;
        }
        if (params?.customerId && booking.customerId !== params.customerId) {
          return false;
        }
        return true;
      });
    } catch {
      return filterFallbackBookings(params);
    }
  },

  async getById(id: number): Promise<TechnicianBooking | null> {
    try {
      const response = await api.get<BookingApiItem>(`/bookings/${id}`);
      return normalizeBooking(response.data);
    } catch {
      return mergeBookings(bookingFallbackState, loadLocalDraftBookings()).find((booking) => booking.id === id) ?? null;
    }
  },

  async transition(id: number, nextStatus: BookingStatus): Promise<void> {
    const localDraftBookings = loadLocalDraftBookings();
    const localBooking = localDraftBookings.find((booking) => booking.id === id);

    if (localBooking) {
      const nextLocalBookings = localDraftBookings.map((booking) =>
        booking.id === id ? { ...booking, status: nextStatus } : booking
      );
      saveLocalDraftBookings(nextLocalBookings);
      return;
    }

    if (!['confirmed', 'completed', 'cancelled'].includes(nextStatus)) {
      throw new Error('当前版本暂不支持该状态变更');
    }

    try {
      const endpoint =
        nextStatus === 'confirmed'
          ? 'confirm'
          : nextStatus === 'completed'
            ? 'complete'
            : 'cancel';
      await api.patch(`/bookings/${id}/${endpoint}`);
      return;
    } catch {
      bookingFallbackState = bookingFallbackState.map((booking) =>
        booking.id === id ? { ...booking, status: nextStatus } : booking
      );
    }
  },

  async review(
    id: number,
    data: {
      serviceDate: string;
      startTime: string;
      durationMinutes: number;
      price: number;
    }
  ): Promise<TechnicianBooking> {
    const response = await api.patch<BookingApiItem>(`/bookings/${id}/review`, data);
    return normalizeBooking(response.data);
  },

  async update(
    id: number,
    data: {
      serviceType?: 'home' | 'shop';
      shopId?: number;
      startTime?: string;
      endTime?: string;
      price?: number;
      priceBreakdown?: {
        basePrice: number;
        homeServiceFee?: number;
        nightFee?: number;
        holidayFee?: number;
        otherFees?: number;
      };
      note?: string;
    }
  ): Promise<TechnicianBooking> {
    const response = await api.patch<BookingApiItem>(`/bookings/${id}`, data);
    return normalizeBooking(response.data);
  },

  async createDraft(input: {
    customerId: number;
    customerName: string;
    customerPhone?: string;
    serviceName: string;
    address: string;
    startTime: string;
    endTime: string;
    price: number;
    note?: string;
  }): Promise<TechnicianBooking> {
    try {
      const response = await api.post<BookingApiItem>('/technician/bookings', {
        customerId: input.customerId,
        serviceName: input.serviceName,
        address: input.address,
        startTime: input.startTime,
        endTime: input.endTime,
        price: input.price,
        note: input.note,
      });
      return normalizeBooking(response.data);
    } catch {
      return this.saveLocalDraft(input);
    }
  },

  async saveLocalDraft(input: CreateBookingInput): Promise<TechnicianBooking> {
    const nextBooking: TechnicianBooking = {
      id: Date.now(),
      bookingNo: `DRAFT${Date.now()}`,
      customerId: input.customerId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      serviceName: input.serviceName,
      address: input.address,
      startTime: input.startTime,
      endTime: input.endTime,
      status: 'pending_confirm',
      price: input.price,
      depositPaid: false,
      note: input.note,
      isLocalDraft: true,
    };

    const localDraftBookings = loadLocalDraftBookings();
    saveLocalDraftBookings([...localDraftBookings, nextBooking]);
    return nextBooking;
  },

  getAllowedActions(status: BookingStatus): BookingStatus[] {
    return bookingStatusActions[status] ?? [];
  },
};
