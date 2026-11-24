import api from './api';
export interface NotificationDelivery {
  id: number; status: string; attemptCount: number; providerCode: string | null;
  providerMessage: string | null; sentAt: string | null; updatedAt: string; canRetry: boolean;
}
export interface BookingNotification {
  id: number; eventType: string; orderId: number; recipientRole: string; recipientId: number;
  status: string; createdAt: string; availableAt: string; deliveries: NotificationDelivery[];
}
export interface NotificationHealth { backlog: number; unknown: number; exhausted: number; misconfigured: number; noAuthorization: number; checkedAt: string }
export const bookingNotifications = {
  list: async (params: { page: number; orderId?: string; status?: string; failureGroup?: string }) =>
    (await api.get<{ data: BookingNotification[]; total: number }>('/booking-notifications', { params })).data,
  health: async () => (await api.get<NotificationHealth>('/booking-notifications/health')).data,
  retry: async (id: number) => (await api.post(`/booking-notifications/${id}/retry`)).data,
};
