import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Select, Tag, message, Card, Modal, Descriptions, Popconfirm } from 'antd';
import { bookingService } from '../services/booking';
import type { Booking } from '../services/booking';
import type { PaginatedResponse } from '../services/technician';
import { technicianService } from '../services/technician';
import type { Technician } from '../services/technician';

const Bookings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResponse<Booking> | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filters, setFilters] = useState({ page: 1, limit: 10, technicianId: undefined as number | undefined, status: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await bookingService.getAll({
        page: filters.page,
        limit: filters.limit,
        technicianId: filters.technicianId,
        status: filters.status || undefined,
      });
      setData(result);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const result = await technicianService.getAll({ limit: 1000 });
      setTechnicians(result.data);
    } catch (error) {
      console.error('Failed to fetch technicians');
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleConfirm = async (id: number) => {
    try {
      await bookingService.confirm(id);
      message.success('确认成功');
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '确认失败');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await bookingService.complete(id);
      message.success('完成成功，已自动生成收入记录');
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '完成失败');
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await bookingService.cancel(id);
      message.success('取消成功');
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '取消失败');
    }
  };

  const statusMap: Record<string, { color: string; text: string }> = {
    pending_confirm: { color: 'orange', text: '待确认' },
    confirmed: { color: 'blue', text: '已确认' },
    completed: { color: 'green', text: '已完成' },
    cancelled: { color: 'red', text: '已取消' },
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '预约编号', dataIndex: 'bookingNo', key: 'bookingNo' },
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
        const { color, text } = statusMap[status] || { color: 'default', text: status };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Booking) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setSelectedBooking(record); setDetailVisible(true); }}>
            详情
          </Button>
          {record.status === 'pending_confirm' && (
            <Popconfirm title="确定要确认该预约吗？" onConfirm={() => handleConfirm(record.id)}>
              <Button type="link" size="small">确认</Button>
            </Popconfirm>
          )}
          {record.status === 'confirmed' && (
            <Popconfirm title="确定要完成该预约吗？将自动生成收入记录" onConfirm={() => handleComplete(record.id)}>
              <Button type="link" size="small">完成</Button>
            </Popconfirm>
          )}
          {record.status !== 'completed' && record.status !== 'cancelled' && (
            <Popconfirm title="确定要取消该预约吗？" onConfirm={() => handleCancel(record.id)}>
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
              options={Object.entries(statusMap).map(([key, val]) => ({ value: key, label: val.text }))}
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
        title="预约详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setSelectedBooking(null); }}
        footer={null}
        width={700}
      >
        {selectedBooking && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="预约编号">{selectedBooking.bookingNo}</Descriptions.Item>
            <Descriptions.Item label="状态">{statusMap[selectedBooking.status]?.text || selectedBooking.status}</Descriptions.Item>
            <Descriptions.Item label="美甲师">{selectedBooking.technician?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="客户">{selectedBooking.customer?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="开始时间">{new Date(selectedBooking.startTime).toLocaleString('zh-CN')}</Descriptions.Item>
            <Descriptions.Item label="结束时间">{new Date(selectedBooking.endTime).toLocaleString('zh-CN')}</Descriptions.Item>
            <Descriptions.Item label="地址" span={2}>{selectedBooking.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="是否已付定金">{selectedBooking.isDepositPaid ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="报价金额">¥{selectedBooking.quote?.price.toFixed(2) || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(selectedBooking.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Bookings;
