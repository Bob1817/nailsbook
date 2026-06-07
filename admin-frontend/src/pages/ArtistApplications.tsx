import React, { useCallback, useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Tabs, Tag, Descriptions, message, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { artistApplicationService } from '../services/artistApplication';
import type { ArtistApplication, ApplicationListResponse } from '../services/artistApplication';

const statusColor: Record<string, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
};

const statusText: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
};

const serviceModeText: Record<string, string> = {
  home: '上门',
  shop: '到店',
  both: '均可',
};

const maskPhone = (phone: string) => phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

const renderStatusTag = (status: string) => (
  <Tag color={statusColor[status]}>{statusText[status] || status}</Tag>
);

const ArtistApplications: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApplicationListResponse | null>(null);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [page, setPage] = useState(1);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selected, setSelected] = useState<ArtistApplication | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await artistApplicationService.getAll({ page, limit: 20, status });
      setData(result);
    } catch {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (key: string) => {
    setStatus(key as 'pending' | 'approved' | 'rejected');
    setPage(1);
  };

  const handleApprove = async (id: number) => {
    try {
      await artistApplicationService.approve(id);
      message.success('已通过申请');
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '操作失败');
    }
  };

  const handleReject = (id: number) => {
    Modal.confirm({
      title: '确认拒绝该申请？',
      okText: '确认拒绝',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await artistApplicationService.reject(id);
          message.success('已拒绝申请');
          fetchData();
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } };
          message.error(err.response?.data?.message || '操作失败');
        }
      },
    });
  };

  const openDetail = (record: ArtistApplication) => {
    setSelected(record);
    setDetailVisible(true);
  };

  const columns: ColumnsType<ArtistApplication> = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => maskPhone(phone),
    },
    { title: '城市', dataIndex: 'city', key: 'city' },
    {
      title: '微信号',
      dataIndex: 'wechat',
      key: 'wechat',
      render: (value: string | null) => value || '—',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => renderStatusTag(value),
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ArtistApplication) => (
        <Space>
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            详情
          </Button>
          {record.status === 'pending' && (
            <>
              <Button type="link" size="small" onClick={() => handleApprove(record.id)}>
                通过
              </Button>
              <Button type="link" size="small" danger onClick={() => handleReject(record.id)}>
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Tabs
          activeKey={status}
          onChange={handleTabChange}
          items={[
            { key: 'pending', label: '待审核' },
            { key: 'approved', label: '已通过' },
            { key: 'rejected', label: '已拒绝' },
          ]}
        />

        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.meta.total || 0,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p) => setPage(p),
          }}
        />
      </Card>

      <Modal
        title="申请详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setSelected(null); }}
        footer={null}
        width={560}
      >
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="姓名">{selected.name}</Descriptions.Item>
            <Descriptions.Item label="手机号">{selected.phone}</Descriptions.Item>
            <Descriptions.Item label="微信号">{selected.wechat ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="城市">{selected.city}</Descriptions.Item>
            <Descriptions.Item label="服务方式">
              {selected.serviceMode ? serviceModeText[selected.serviceMode] || selected.serviceMode : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="经验">{selected.experience ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="专长">{selected.specialty ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="备注">{selected.note ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="状态">{renderStatusTag(selected.status)}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ArtistApplications;
