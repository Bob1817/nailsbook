import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { mergeMap } from 'rxjs/operators';
import { ChatGateway } from '../chat/chat.gateway';
import { PrismaService } from '../common/prisma/prisma.service';

/** Only successful HTTP mutations: service transactions have committed before emission. */
@Injectable()
export class BookingEventsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(BookingEventsInterceptor.name);
  constructor(private readonly prisma: PrismaService, private readonly chat: ChatGateway) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    if (!['POST', 'PATCH', 'DELETE'].includes(request.method)) return next.handle();
    return next.handle().pipe(mergeMap(async (result) => {
      try {
        // For repeat bookings the response ID is the new booking; review responses
        // are not bookings, so prefer the route ID except for create/repeat.
        const creates = ['create', 'createFromDesign', 'repeat'].includes(context.getHandler().name);
        const id = Number(creates ? result?.id : request.params?.id || result?.orderId || result?.id);
        if (Number.isSafeInteger(id) && id > 0) {
          const order = await this.prisma.order.findUnique({
            where: { id }, select: { id: true, technicianId: true, clientUserId: true },
          });
          if (order && (order.technicianId === request.user?.technicianId
            || order.clientUserId === request.user?.clientUserId)) {
            this.chat.broadcastBookingChanged(order);
          }
        }
      } catch {
        // A notification failure must not turn a committed booking into an HTTP failure.
        this.logger.warn('Booking invalidation could not be delivered');
      }
      return result;
    }));
  }
}
