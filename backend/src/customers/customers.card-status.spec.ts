import { CustomersService } from './customers.service';

describe('Customer card account and binding status', () => {
  it('returns only the binding status for this customer’s technician', async () => {
    const prisma = {
      customer: {
        findMany: jest.fn().mockResolvedValue([{
          id: 1, technicianId: 7, clientUserId: 9,
          clientUser: { status: 'deleted', bindings: [
            { techId: 8, status: 'active' }, { techId: 7, status: 'inactive' },
          ] },
          orders: [], revenues: [], _count: { orders: 0 },
        }, {
          id: 2, technicianId: 7, clientUserId: null, clientUser: null,
          orders: [], revenues: [], _count: { orders: 0 },
        }]),
        count: jest.fn().mockResolvedValue(2),
      },
    };
    const result = await new CustomersService(prisma as never).findAll(1, 20, 7);
    expect(result.data[0].bindingStatus).toBe('inactive');
    expect(result.data[0].account.status).toBe('deleted');
    expect(result.data[0]).not.toHaveProperty('clientUser');
    expect(result.data[1].bindingStatus).toBeNull();
  });
});
