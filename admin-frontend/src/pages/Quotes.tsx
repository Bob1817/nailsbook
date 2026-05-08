import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Select, Tag, message, Card, Modal, Descriptions, Popconfirm } from 'antd';
import { quoteService } from '../services/quote';
import type { Quote } from '../services/quote';
import type { PaginatedResponse } from '../services/technician';
import { technicianService } from '../services/technician';
import type { Technician } from '../services/technician';

const Quotes: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResponse<Quote> | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [filters, setFilters] = useState({ page: 1, limit: 10, technicianId: undefined as number | undefined, status: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await quoteService.getAll({
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

  const handleCancel = async (id: number) => {
    try {
      await quoteService.cancel(id);
      message.success('取消成功');
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '取消失败');
    }
  };

  const statusMap: Record<string, { color: string; text: string }> = {
    pending: { color: 'blue', text: '待确认' },
    accepted: { color: 'green', text: '已接受' },
    cancelled: { color: 'red', text: '已取消' },
    expired: { color: 'gray', text: '已过期' },
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '报价编号', dataIndex: 'quoteNo', key: 'quoteNo' },
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
    { 
      title: '金额', 
      dataIndex: 'price', 
      key: 'price',
      render: (price: number) => `¥${price.toFixed(2)}`,
    },
    { 
      title: '定金', 
      dataIndex: 'depositAmount', 
      key: 'depositAmount',
      render: (amount: number) => amount ? `¥${amount.toFixed(2)}` : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const { color, text } = statusMap[status] || { color: 'default', text: status };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    { title: '美甲师', dataIndex: ['technician', 'name'], key: 'technician' },
    { title: '客户', dataIndex: ['customer', 'name'], key: 'customer' },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Quote) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setSelectedQuote(record); setDetailVisible(true); }}>
            详情
          </Button>
          {record.status === 'pending' && (
            <Popconfirm title="确定要取消该报价吗？" onConfirm={() => handleCancel(record.id)}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
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
        title="报价详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setSelectedQuote(null); }}
        footer={null}
        width={700}
      >
        {selectedQuote && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="报价编号">{selectedQuote.quoteNo}</Descriptions.Item>
            <Descriptions.Item label="标题">{selectedQuote.title || '-'}</Descriptions.Item>
            <Descriptions.Item label="金额">¥{selectedQuote.price.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="定金">{selectedQuote.depositAmount ? `¥${selectedQuote.depositAmount.toFixed(2)}` : '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">{statusMap[selectedQuote.status]?.text || selectedQuote.status}</Descriptions.Item>
            <Descriptions.Item label="美甲师">{selectedQuote.technician?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="客户">{selectedQuote.customer?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>{selectedQuote.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(selectedQuote.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Quotes;
