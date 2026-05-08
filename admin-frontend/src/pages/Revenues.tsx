import React, { useEffect, useState } from 'react';
import { Table, Space, Select, Tag, message, Card, Modal, Descriptions, DatePicker, Row, Col, Statistic, Button } from 'antd';
import { revenueService } from '../services/revenue';
import type { Revenue, RevenueStatistics } from '../services/revenue';
import type { PaginatedResponse } from '../services/technician';
import { technicianService } from '../services/technician';
import type { Technician } from '../services/technician';

const { RangePicker } = DatePicker;

const Revenues: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResponse<Revenue> | null>(null);
  const [statistics, setStatistics] = useState<RevenueStatistics | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedRevenue, setSelectedRevenue] = useState<Revenue | null>(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    technicianId: undefined as number | undefined,
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [result, stats] = await Promise.all([
        revenueService.getAll({
          page: filters.page,
          limit: filters.limit,
          technicianId: filters.technicianId,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }),
        revenueService.getStatistics({
          technicianId: filters.technicianId,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }),
      ]);
      setData(result);
      setStatistics(stats);
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

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '收入编号', dataIndex: 'revenueNo', key: 'revenueNo' },
    { 
      title: '金额', 
      dataIndex: 'amount', 
      key: 'amount',
      render: (amount: number) => <span style={{ color: '#f5222d', fontWeight: 'bold' }}>¥{amount.toFixed(2)}</span>,
    },
    { title: '美甲师', dataIndex: ['technician', 'name'], key: 'technician' },
    { title: '客户', dataIndex: ['customer', 'name'], key: 'customer' },
    { title: '预约编号', dataIndex: ['booking', 'bookingNo'], key: 'booking' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'confirmed' ? 'green' : 'red'}>
          {status === 'confirmed' ? '已确认' : '已作废'}
        </Tag>
      ),
    },
    {
      title: '确认时间',
      dataIndex: 'recognizedAt',
      key: 'recognizedAt',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Revenue) => (
        <a onClick={() => { setSelectedRevenue(record); setDetailVisible(true); }}>详情</a>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="总收入" value={statistics?.totalRevenue || 0} precision={2} prefix="¥" styles={{ content: { color: '#f5222d' } }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="收入笔数" value={statistics?.count || 0} suffix="笔" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="平均金额" value={statistics?.avgAmount || 0} precision={2} prefix="¥" />
          </Card>
        </Col>
      </Row>

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
            <RangePicker
              onChange={(dates) => setFilters({
                ...filters,
                page: 1,
                startDate: dates?.[0]?.format('YYYY-MM-DD'),
                endDate: dates?.[1]?.format('YYYY-MM-DD'),
              })}
            />
            <Button
              onClick={() => {
                const params = new URLSearchParams();
                if (filters.technicianId) params.set('technicianId', String(filters.technicianId));
                if (filters.startDate) params.set('startDate', filters.startDate);
                if (filters.endDate) params.set('endDate', filters.endDate);
                const base = import.meta.env.VITE_API_URL || '/api/admin';
                window.open(`${base}/revenues/export?${params.toString()}`, '_blank');
              }}
            >
              导出 CSV
            </Button>
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
        title="收入详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setSelectedRevenue(null); }}
        footer={null}
        width={700}
      >
        {selectedRevenue && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="收入编号">{selectedRevenue.revenueNo}</Descriptions.Item>
            <Descriptions.Item label="金额">¥{selectedRevenue.amount.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="美甲师">{selectedRevenue.technician?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="客户">{selectedRevenue.customer?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="预约编号">{selectedRevenue.booking?.bookingNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">{selectedRevenue.status === 'confirmed' ? '已确认' : '已作废'}</Descriptions.Item>
            <Descriptions.Item label="确认时间">{new Date(selectedRevenue.recognizedAt).toLocaleString('zh-CN')}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(selectedRevenue.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Revenues;
