import React, { useCallback, useEffect, useState } from 'react';
import { Card, Descriptions, Drawer, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { orderService } from '../services/order';
import type { AdminOrder } from '../services/order';
import type { PaginatedResponse } from '../services/technician';

const { Text } = Typography;
const statusLabels: Record<string, string> = {
  pending_quote: '待美甲师报价', pending_confirm: '待美甲师确认', pending_agree: '待客户确认',
  pending_client_confirm: '待客户确认', pending_home: '待上门', pending_shop: '待到店',
  confirmed: '已确认', in_progress: '服务中', completed: '已完成', cancelled: '已取消',
  rejected: '已拒绝', expired: '已过期', no_show: '未到店',
};
const money = (fen?: number | null) => fen == null ? '待报价' : `¥${(fen / 100).toFixed(2)}`;
const dateTime = (value: string) => new Date(value).toLocaleString('zh-CN');

const Orders: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResponse<AdminOrder> | null>(null);
  const [detail, setDetail] = useState<AdminOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: undefined as string | undefined, search: '' });

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

  const columns = [
    { title: '预约编号', dataIndex: 'orderNo', key: 'orderNo' },
    { title: '客户', dataIndex: ['customer', 'name'], key: 'customer' },
    { title: '美甲师', dataIndex: ['technician', 'name'], key: 'technician' },
    { title: '预约时间', dataIndex: 'startTime', key: 'startTime', render: dateTime },
    { title: '状态', dataIndex: 'status', key: 'status', render: (value: string) => <Tag>{statusLabels[value] || value}</Tag> },
    { title: '最终金额', dataIndex: 'finalPriceFen', key: 'finalPriceFen', render: (value: number | null) => <Text strong>{money(value)}</Text> },
    { title: '定金', key: 'deposit', render: (_: unknown, row: AdminOrder) => <span>{row.depositAmount == null ? '-' : `¥${row.depositAmount.toFixed(2)}`} · {row.isDepositPaid ? '已收' : '未收'}</span> },
    { title: '操作', key: 'action', render: (_: unknown, row: AdminOrder) => <a onClick={() => openDetail(row.id)}>详情</a> },
  ];

  return <div>
    <Card title="预约管理">
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="预约编号、客户或美甲师" style={{ width: 280 }} onSearch={search => setFilters(current => ({ ...current, page: 1, search }))} />
        <Select allowClear placeholder="全部状态" style={{ width: 180 }} onChange={status => setFilters(current => ({ ...current, page: 1, status }))}
          options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
      </Space>
      <Table rowKey="id" columns={columns} dataSource={data?.data || []} loading={loading} scroll={{ x: 1050 }}
        pagination={{ current: filters.page, pageSize: filters.limit, total: data?.meta.total || 0, showSizeChanger: true,
          showTotal: total => `共 ${total} 条`, onChange: (page, limit) => setFilters(current => ({ ...current, page, limit })) }} />
    </Card>
    <Drawer title="预约与报价详情" width={720} open={!!detail || detailLoading} loading={detailLoading} onClose={() => setDetail(null)}>
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
