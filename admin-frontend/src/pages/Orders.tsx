import React, { useCallback, useEffect, useState } from 'react';
import { Table, Button, Space, Select, Tag, message, Card, Modal, Descriptions, Popconfirm } from 'antd';
import { orderService } from '../services/order';
import type { Order } from '../services/order';
import type { PaginatedResponse } from '../services/technician';
import { technicianService } from '../services/technician';
import type { Technician } from '../services/technician';

const STATUS_LABELS: Record<string, string> = {
  pending_quote: '待报价',
  pending_agree: '待同意',
  pending_confirm: '待确认',
  pending_home: '待上门',
  pending_shop: '待到店',
  in_progress: '服务中',
  completed: '已完成',
  cancelled: '已取消',
};

const STATUS_COLORS: Record<string, string> = {
  pending_quote: 'orange',
  pending_agree: 'orange',
  pending_confirm: 'orange',
  pending_home: 'blue',
  pending_shop: 'blue',
  in_progress: 'processing',
  completed: 'green',
  cancelled: 'red',
};

const Orders: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResponse<Order> | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filters, setFilters] = useState({ page: 1, limit: 10, technicianId: undefined as number | undefined, status: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await orderService.getAll({
        page: filters.page,
        limit: filters.limit,
        technicianId: filters.technicianId,
        status: filters.status || undefined,
      });
      setData(result);
    } catch {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchTechnicians = async () => {
    try {
      const result = await technicianService.getAll({ limit: 1000 });
      setTechnicians(result.data);
    } catch {
      console.error('Failed to fetch technicians');
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfirm = async (id: number) => {
    try {
      await orderService.confirm(id);
      message.success('确认成功');
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '确认失败');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await orderService.complete(id);
      message.success('完成成功，已自动生成收入记录');
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '完成失败');
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await orderService.cancel(id);
      message.success('取消成功');
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '取消失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '订单编号', dataIndex: 'orderNo', key: 'orderNo' },
    { title: '美甲师', dataIndex: ['technician', 'name'], key: 'technician' },
    { title: '客户', dataIndex: ['customer', 'name'], key: 'customer' },
    {
      title: '预约时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = STATUS_COLORS[status] || 'default';
        const text = STATUS_LABELS[status] || status;
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Order) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setSelectedOrder(record); setDetailVisible(true); }}>
            详情
          </Button>
          {record.status === 'pending_confirm' && (
            <Popconfirm title="确定要确认该订单吗？" onConfirm={() => handleConfirm(record.id)}>
              <Button type="link" size="small">确认</Button>
            </Popconfirm>
          )}
          {(record.status === 'pending_home' || record.status === 'pending_shop') && (
            <Popconfirm title="确定要完成该订单吗？将自动生成收入记录" onConfirm={() => handleComplete(record.id)}>
              <Button type="link" size="small">完成</Button>
            </Popconfirm>
          )}
          {record.status !== 'completed' && record.status !== 'cancelled' && (
            <Popconfirm title="确定要取消该订单吗？" onConfirm={() => handleCancel(record.id)}>
              <Button type="link" size="small" danger>取消</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Select
              placeholder="选择美甲师"
              allowClear
              value={filters.technicianId}
              onChange={(value) => setFilters({ ...filters, page: 1, technicianId: value })}
              style={{ width: 150 }}
              options={technicians.map(t => ({ value: t.id, label: t.name }))}
            />
            <Select
              placeholder="状态筛选"
              allowClear
              value={filters.status || undefined}
              onChange={(value) => setFilters({ ...filters, page: 1, status: value || '' })}
              style={{ width: 120 }}
              options={Object.entries(STATUS_LABELS).map(([key, val]) => ({ value: key, label: val }))}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={loading}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: data?.meta.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => setFilters({ ...filters, page, limit: pageSize }),
          }}
        />
      </Card>

      <Modal
        title="订单详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setSelectedOrder(null); }}
        footer={null}
        width={700}
      >
        {selectedOrder && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="订单编号">{selectedOrder.orderNo}</Descriptions.Item>
            <Descriptions.Item label="状态">{STATUS_LABELS[selectedOrder.status] || selectedOrder.status}</Descriptions.Item>
            <Descriptions.Item label="美甲师">{selectedOrder.technician?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="客户">{selectedOrder.customer?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="开始时间">{new Date(selectedOrder.startTime).toLocaleString('zh-CN')}</Descriptions.Item>
            <Descriptions.Item label="结束时间">{new Date(selectedOrder.endTime).toLocaleString('zh-CN')}</Descriptions.Item>
            <Descriptions.Item label="地址" span={2}>{selectedOrder.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="是否已付定金">{selectedOrder.isDepositPaid ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="报价金额">¥{selectedOrder.quote?.price.toFixed(2) || '-'}</Descriptions.Item>
            <Descriptions.Item label="报价备注" span={2}>{selectedOrder.quoteRemark || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(selectedOrder.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Orders;
