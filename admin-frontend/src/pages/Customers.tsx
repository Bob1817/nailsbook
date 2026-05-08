import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Input, Select, Tag, message, Card, Modal, Descriptions } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { customerService } from '../services/customer';
import type { Customer } from '../services/customer';
import type { PaginatedResponse } from '../services/technician';
import { technicianService } from '../services/technician';
import type { Technician } from '../services/technician';

const Customers: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResponse<Customer> | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [filters, setFilters] = useState({ page: 1, limit: 10, technicianId: undefined as number | undefined, search: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await customerService.getAll({
        page: filters.page,
        limit: filters.limit,
        technicianId: filters.technicianId,
        search: filters.search || undefined,
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

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '手机号', dataIndex: 'phone', key: 'phone' },
    { title: '性别', dataIndex: 'gender', key: 'gender' },
    { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string) => tags ? tags.split(',').map((tag, i) => <Tag key={i}>{tag}</Tag>) : '-',
    },
    { title: '所属美甲师', dataIndex: ['technician', 'name'], key: 'technician' },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Customer) => (
        <Button type="link" size="small" onClick={() => { setSelectedCustomer(record); setDetailVisible(true); }}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space>
            <Input
              placeholder="搜索姓名/手机号"
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, page: 1, search: e.target.value })}
              style={{ width: 200 }}
            />
            <Select
              placeholder="选择美甲师"
              allowClear
              value={filters.technicianId}
              onChange={(value) => setFilters({ ...filters, page: 1, technicianId: value })}
              style={{ width: 150 }}
              options={technicians.map(t => ({ value: t.id, label: t.name }))}
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
        title="客户详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setSelectedCustomer(null); }}
        footer={null}
        width={700}
      >
        {selectedCustomer && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="ID">{selectedCustomer.id}</Descriptions.Item>
            <Descriptions.Item label="姓名">{selectedCustomer.name}</Descriptions.Item>
            <Descriptions.Item label="手机号">{selectedCustomer.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="性别">{selectedCustomer.gender || '-'}</Descriptions.Item>
            <Descriptions.Item label="生日">{selectedCustomer.birthday ? new Date(selectedCustomer.birthday).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
            <Descriptions.Item label="地址">{selectedCustomer.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="标签">{selectedCustomer.tags || '-'}</Descriptions.Item>
            <Descriptions.Item label="备注">{selectedCustomer.notes || '-'}</Descriptions.Item>
            <Descriptions.Item label="所属美甲师">{selectedCustomer.technician?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(selectedCustomer.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Customers;
