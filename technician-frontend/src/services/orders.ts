import api from './api';
import {
  orderStatusActions,
  fallbackOrders,
  parseTagString,
  type OrderStatus,
  type TechnicianOrder,
} from './technicianData';

const localDraftKey = 'technician_local_orders';

interface OrderApiItem {
  id: number;
  orderNo: string;
  customerId: number;
  startTime: string;
  endTime: string;
  address: string | null;
  status: OrderStatus;
  serviceType?: string | null;
  isDepositPaid?: boolean;
  customer?: {
    id: number;
    name: string;
    phone?: string | null;
    tags?: string | null;
    avatarUrl?: string | null;
  };
  quotePrice?: number | null;
  quoteRemark?: string | null;
  quotedAt?: string | null;
  remark?: string | null;
}

interface OrderListResponse {
  data: OrderApiItem[];
}

interface CreateOrderInput {
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

let orderFallbackState = [...fallbackOrders];

function loadLocalDraftOrders(): TechnicianOrder[] {
  const stored = localStorage.getItem(localDraftKey);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as TechnicianOrder[];
  } catch {
    localStorage.removeItem(localDraftKey);
    return [];
  }
}

function saveLocalDraftOrders(orders: TechnicianOrder[]) {
  localStorage.setItem(localDraftKey, JSON.stringify(orders));
}

function mergeOrders(primary: TechnicianOrder[], secondary: TechnicianOrder[]) {
  const orderMap = new Map<number, TechnicianOrder>();
  [...primary, ...secondary].forEach((order) => {
    orderMap.set(order.id, order);
  });

  return [...orderMap.values()].sort((left, right) => left.startTime.localeCompare(right.startTime));
}

function normalizeOrder(item: OrderApiItem): TechnicianOrder {
  const serviceType =
    item.serviceType === '到店美甲'
      ? 'shop'
      : item.serviceType === '上门美甲'
        ? 'home'
        : undefined;

  const serviceName =
    (item.remark && item.remark.trim() && !/^QT\d+[A-Z0-9]*$/i.test(item.remark.trim())
      ? item.remark
      : null) ||
    parseTagString(item.customer?.tags)[0] ||
    '预约服务';

  return {
    id: item.id,
    orderNo: item.orderNo,
    customerId: item.customer?.id ?? item.customerId,
    customerName: item.customer?.name ?? '未命名客户',
    customerPhone: item.customer?.phone ?? undefined,
    customerAvatar: item.customer?.avatarUrl ?? undefined,
    serviceName,
    address: item.address || '待补充服务地址',
    startTime: item.startTime,
    endTime: item.endTime,
    status: item.status,
    serviceType,
    price: Number(item.quotePrice ?? 0),
    quoteRemark: item.quoteRemark ?? null,
    quotedAt: item.quotedAt ?? null,
    depositPaid: Boolean(item.isDepositPaid),
  };
}

function filterFallbackOrders(params?: {
  status?: OrderStatus;
  customerId?: number;
}) {
  return mergeOrders(orderFallbackState, loadLocalDraftOrders()).filter((order) => {
    if (params?.status && order.status !== params.status) {
      return false;
    }
    if (params?.customerId && order.customerId !== params.customerId) {
      return false;
    }
    return true;
  });
}

export const ordersService = {
  async list(params?: {
    technicianId?: number;
    status?: OrderStatus;
    customerId?: number;
  }): Promise<TechnicianOrder[]> {
    try {
      const response = await api.get<OrderListResponse>('/technician/orders', { params });
      return mergeOrders(response.data.data.map(normalizeOrder), loadLocalDraftOrders()).filter((order) => {
        if (params?.status && order.status !== params.status) {
          return false;
        }
        if (params?.customerId && order.customerId !== params.customerId) {
          return false;
        }
        return true;
      });
    } catch {
      return filterFallbackOrders(params);
    }
  },

  async getById(id: number): Promise<TechnicianOrder | null> {
    try {
      const response = await api.get<OrderApiItem>(`/technician/orders/${id}`);
      return normalizeOrder(response.data);
    } catch {
      return mergeOrders(orderFallbackState, loadLocalDraftOrders()).find((order) => order.id === id) ?? null;
    }
  },

  async getTrips(): Promise<TechnicianOrder[]> {
    try {
      const response = await api.get<OrderApiItem[]>('/technician/orders/trips');
      return response.data.map(normalizeOrder);
    } catch {
      return filterFallbackOrders().filter(
        (order) =>
          order.status === 'pending_home' ||
          order.status === 'pending_shop' ||
          order.status === 'in_progress',
      );
    }
  },

  async submitQuote(
    id: number,
    data: {
      serviceDate: string;
      startTime: string;
      durationMinutes: number;
      price: number;
      remark?: string;
    },
  ): Promise<TechnicianOrder> {
    const response = await api.patch<OrderApiItem>(`/technician/orders/${id}/review`, data);
    return normalizeOrder(response.data);
  },

  async agree(id: number): Promise<TechnicianOrder> {
    const localDraftOrders = loadLocalDraftOrders();
    const localOrder = localDraftOrders.find((order) => order.id === id);

    if (localOrder) {
      const nextLocalOrders = localDraftOrders.map((order) =>
        order.id === id ? { ...order, status: 'pending_confirm' as OrderStatus } : order,
      );
      saveLocalDraftOrders(nextLocalOrders);
      return { ...localOrder, status: 'pending_confirm' };
    }

    const current = await this.getById(id);
    if (current) {
      return { ...current, status: 'pending_confirm' };
    }
    throw new Error('订单不存在');
  },

  async confirm(
    id: number,
    data?: { depositConfirmed?: boolean },
  ): Promise<TechnicianOrder> {
    const localDraftOrders = loadLocalDraftOrders();
    const localOrder = localDraftOrders.find((order) => order.id === id);

    if (localOrder) {
      const nextStatus: OrderStatus = localOrder.serviceType === 'home' ? 'pending_home' : 'pending_shop';
      const nextLocalOrders = localDraftOrders.map((order) =>
        order.id === id ? { ...order, status: nextStatus } : order,
      );
      saveLocalDraftOrders(nextLocalOrders);
      return { ...localOrder, status: nextStatus };
    }

    const response = await api.patch<OrderApiItem>(
      `/technician/orders/${id}/confirm`,
      data ?? {},
    );
    return normalizeOrder(response.data);
  },

  async startService(id: number): Promise<TechnicianOrder> {
    const localDraftOrders = loadLocalDraftOrders();
    const localOrder = localDraftOrders.find((order) => order.id === id);

    if (localOrder) {
      const nextLocalOrders = localDraftOrders.map((order) =>
        order.id === id ? { ...order, status: 'in_progress' as OrderStatus } : order,
      );
      saveLocalDraftOrders(nextLocalOrders);
      return { ...localOrder, status: 'in_progress' };
    }

    const current = await this.getById(id);
    if (current) {
      return { ...current, status: 'in_progress' };
    }
    throw new Error('订单不存在');
  },

  async complete(id: number): Promise<TechnicianOrder> {
    const localDraftOrders = loadLocalDraftOrders();
    const localOrder = localDraftOrders.find((order) => order.id === id);

    if (localOrder) {
      const nextLocalOrders = localDraftOrders.map((order) =>
        order.id === id ? { ...order, status: 'completed' as OrderStatus } : order,
      );
      saveLocalDraftOrders(nextLocalOrders);
      return { ...localOrder, status: 'completed' };
    }

    const response = await api.patch<OrderApiItem>(`/technician/orders/${id}/complete`);
    return normalizeOrder(response.data);
  },

  async cancel(id: number): Promise<void> {
    const localDraftOrders = loadLocalDraftOrders();
    const localOrder = localDraftOrders.find((order) => order.id === id);

    if (localOrder) {
      const nextLocalOrders = localDraftOrders.map((order) =>
        order.id === id ? { ...order, status: 'cancelled' as OrderStatus } : order,
      );
      saveLocalDraftOrders(nextLocalOrders);
      return;
    }

    await api.patch(`/technician/orders/${id}/cancel`);
  },

  async review(
    id: number,
    data: {
      serviceDate: string;
      startTime: string;
      durationMinutes: number;
      price: number;
      remark?: string;
    },
  ): Promise<TechnicianOrder> {
    return this.submitQuote(id, data);
  },

  async update(
    id: number,
    data: {
      serviceType?: 'home' | 'shop';
      shopId?: number;
      startTime?: string;
      endTime?: string;
      price?: number;
      note?: string;
    },
  ): Promise<TechnicianOrder> {
    const response = await api.patch<OrderApiItem>(`/technician/orders/${id}`, data);
    return normalizeOrder(response.data);
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
  }): Promise<TechnicianOrder> {
    try {
      const response = await api.post<OrderApiItem>('/technician/orders', {
        customerId: input.customerId,
        serviceName: input.serviceName,
        address: input.address,
        startTime: input.startTime,
        endTime: input.endTime,
        note: input.note,
      });
      return normalizeOrder(response.data);
    } catch {
      return this.saveLocalDraft(input);
    }
  },

  async saveLocalDraft(input: CreateOrderInput): Promise<TechnicianOrder> {
    const nextOrder: TechnicianOrder = {
      id: Date.now(),
      orderNo: `DRAFT${Date.now()}`,
      customerId: input.customerId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      serviceName: input.serviceName,
      address: input.address,
      startTime: input.startTime,
      endTime: input.endTime,
      status: 'pending_quote',
      price: input.price,
      quoteRemark: null,
      quotedAt: null,
      depositPaid: false,
      note: input.note,
      isLocalDraft: true,
    };

    const localDraftOrders = loadLocalDraftOrders();
    saveLocalDraftOrders([...localDraftOrders, nextOrder]);
    return nextOrder;
  },

  getAllowedActions(status: OrderStatus): OrderStatus[] {
    return orderStatusActions[status] ?? [];
  },
};
