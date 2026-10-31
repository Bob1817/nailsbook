import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Descriptions, Drawer, Empty, Grid, Input, Pagination, Select, Space, Spin, Table, Tag, Typography, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import AdminPageHeader from '../components/AdminPageHeader';
import { orderService } from '../services/order';
import type { AdminOrder } from '../services/order';
import type { PaginatedResponse } from '../services/technician';

const { Text } = Typography;
const statusConfig: Record<string, { label: string; color: string }> = {
  pending_quote: { label: '待美甲师报价', color: 'blue' },
  pending_confirm: { label: '待美甲师确认', color: 'processing' },
  pending_agree: { label: '待客户确认', color: 'geekblue' },
  pending_client_confirm: { label: '待客户确认', color: 'geekblue' },
  pending_home: { label: '待上门', color: 'cyan' },
  pending_shop: { label: '待到店', color: 'purple' },
  confirmed: { label: '已确认', color: 'processing' },
  in_progress: { label: '服务中', color: 'orange' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'default' },
  rejected: { label: '已拒绝', color: 'error' },
  expired: { label: '已过期', color: 'default' },
  no_show: { label: '未到店', color: 'warning' },
};
const statusLabels: Record<string, string> = Object.fromEntries(
  Object.entries(statusConfig).map(([k, v]) => [k, v.label])
);
const money = (fen?: number | null) => fen == null ? '待报价' : `¥${(fen / 100).toFixed(2)}`;
const dateTime = (value: string) => new Date(value).toLocaleString('zh-CN');

const Orders: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const mobile = !screens.md;
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResponse<AdminOrder> | null>(null);
  const [detail, setDetail] = useState<AdminOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: searchParams.get('status') || undefined as string | undefined,
    search: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await orderService.getAll(filters)); }
    catch { message.error('获取预约失败'); }
    finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try { setDetail(await orderService.getById(id)); }
    catch { message.error('获取预约详情失败'); }
    finally { setDetailLoading(false); }
  };

  useEffect(() => {
    const orderId = Number(searchParams.get('order'));
    if (Number.isInteger(orderId) && orderId > 0) openDetail(orderId);
    // The shared dashboard link is resolved once when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = (status?: string) => {
    setFilters(current => ({ ...current, page: 1, status }));
    const next = new URLSearchParams(searchParams);
    if (status) next.set('status', status);
    else next.delete('status');
    next.delete('order');
    setSearchParams(next, { replace: true });
  };

  const columns = [
    { title: '预约编号', dataIndex: 'orderNo', key: 'orderNo' },
    { title: '客户', dataIndex: ['customer', 'name'], key: 'customer' },
    { title: '美甲师', dataIndex: ['technician', 'name'], key: 'technician' },
    { title: '预约时间', dataIndex: 'startTime', key: 'startTime', render: dateTime },
    { title: '状态', dataIndex: 'status', key: 'status', render: (value: string) => {
      const conf = statusConfig[value];
      return <Tag color={conf?.color || 'default'}>{conf?.label || value}</Tag>;
    } },
    { title: '最终金额', dataIndex: 'finalPriceFen', key: 'finalPriceFen', render: (value: number | null) => <Text strong>{money(value)}</Text> },
    { title: '定金', key: 'deposit', render: (_: unknown, row: AdminOrder) => <span>{row.depositAmount == null ? '-' : `¥${row.depositAmount.toFixed(2)}`} · {row.isDepositPaid ? '已收' : '未收'}</span> },
    { title: '操作', key: 'action', render: (_: unknown, row: AdminOrder) => (
      <Button type="link" size="small" onClick={() => openDetail(row.id)}>详情</Button>
    ) },
  ];

  return <div>
    <AdminPageHeader title="预约管理" description="查询平台预约，核对报价、履约进度和款项状态。" />
    <Card className="admin-list-card">
      <Space wrap className="admin-filter-bar">
        <Input.Search allowClear placeholder="预约编号、客户或美甲师" className="admin-search-input" onSearch={search => setFilters(current => ({ ...current, page: 1, search }))} />
        <Select allowClear placeholder="全部状态" value={filters.status} className="admin-status-select" onChange={updateStatus}
          options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
      </Space>
      {mobile ? (
        <>
          <Spin spinning={loading}>
            <div className="admin-order-list">
              {(data?.data || []).map(order => (
                <button key={order.id} type="button" className="admin-order-mobile" onClick={() => openDetail(order.id)}>
                  <span className="admin-order-mobile__top">
                    <strong>{order.orderNo}</strong>
                    <Tag color={statusConfig[order.status]?.color || 'default'}>
                      {statusConfig[order.status]?.label || order.status}
                    </Tag>
                  </span>
                  <span className="admin-order-mobile__time">{dateTime(order.startTime)}</span>
                  <span className="admin-order-mobile__people">{order.customer.name} · {order.technician.name}</span>
                  <span className="admin-order-mobile__bottom">
                    <Text strong>{money(order.finalPriceFen)}</Text>
                    <span>查看详情 ›</span>
                  </span>
                </button>
              ))}
              {!loading && !data?.data.length ? <Empty description="暂无符合条件的预约" /> : null}
            </div>
          </Spin>
          <div className="admin-mobile-pagination">
            <Pagination
              simple
              current={filters.page}
              pageSize={filters.limit}
              total={data?.meta.total || 0}
              hideOnSinglePage
              onChange={page => setFilters(current => ({ ...current, page }))}
            />
          </div>
        </>
      ) : (
        <Table rowKey="id" columns={columns} dataSource={data?.data || []} loading={loading} scroll={{ x: 1050 }}
          pagination={{ current: filters.page, pageSize: filters.limit, total: data?.meta.total || 0, showSizeChanger: true,
            showTotal: total => `共 ${total} 条`, onChange: (page, limit) => setFilters(current => ({ ...current, page, limit })) }} />
      )}
    </Card>
    <Drawer title="预约与报价详情" size={mobile ? '100%' : 720} open={!!detail || detailLoading} loading={detailLoading} onClose={() => {
      setDetail(null);
      const next = new URLSearchParams(searchParams);
      next.delete('order');
      setSearchParams(next, { replace: true });
    }}>
      {detail && <>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="预约编号">{detail.orderNo}</Descriptions.Item>
          <Descriptions.Item label="状态">{statusLabels[detail.status] || detail.status}</Descriptions.Item>
          <Descriptions.Item label="客户">{detail.customer.name} {detail.customer.phone || ''}</Descriptions.Item>
          <Descriptions.Item label="美甲师">{detail.technician.name}</Descriptions.Item>
          <Descriptions.Item label="预约时间" span={2}>{dateTime(detail.startTime)} 至 {dateTime(detail.endTime)}</Descriptions.Item>
          <Descriptions.Item label="服务方式">{detail.serviceType || '-'}</Descriptions.Item>
          <Descriptions.Item label="报价版本">{detail.quoteVersion || '初始方案'}</Descriptions.Item>
          <Descriptions.Item label="最终金额">{money(detail.finalPriceFen)}</Descriptions.Item>
          <Descriptions.Item label="定金">{detail.depositAmount == null ? '-' : `¥${detail.depositAmount.toFixed(2)}`}（{detail.isDepositPaid ? '已收取' : '未收取'}）</Descriptions.Item>
          <Descriptions.Item label="地址" span={2}>{detail.address || '-'}</Descriptions.Item>
          <Descriptions.Item label="客户备注" span={2}>{detail.remark || '-'}</Descriptions.Item>
        </Descriptions>
        <Table style={{ marginTop: 20 }} size="small" pagination={false} rowKey="id" dataSource={detail.serviceLines || []}
          columns={[
            { title: '费用项目', dataIndex: 'nameSnapshot' },
            { title: '类型', dataIndex: 'source', render: (value: string) => value === 'surcharge' ? '附加费' : '基础服务' },
            { title: '数量', dataIndex: 'quantity' },
            { title: '金额', dataIndex: 'subtotalFen', render: money },
          ]} />
        {detail.pricingDetails && <Descriptions title="金额汇总" column={3} size="small" style={{ marginTop: 20 }}>
          <Descriptions.Item label="核心价格">{money(detail.pricingDetails.coreFen)}</Descriptions.Item>
          <Descriptions.Item label="附加费用">{money(detail.pricingDetails.extrasFen)}</Descriptions.Item>
          <Descriptions.Item label="优惠金额">{money(detail.pricingDetails.finalDiscountFen)}</Descriptions.Item>
        </Descriptions>}
      </>}
    </Drawer>
  </div>;
};

export default Orders;
