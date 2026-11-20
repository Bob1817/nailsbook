import React, { useCallback, useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Tabs, Tag, Descriptions, message, Card, Grid, Empty, Spin, Pagination } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, EyeOutlined, CopyOutlined } from '@ant-design/icons';
import { artistApplicationService } from '../services/artistApplication';
import type { ArtistApplication, ApplicationListResponse } from '../services/artistApplication';
import AdminPageHeader from '../components/AdminPageHeader';
import TableActions, { type TableActionItem } from '../components/TableActions';

const statusColor: Record<string, string> = {
  pending: 'processing',
  approved: 'success',
  rejected: 'error',
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
  model_artist: '标杆扶持',
};

const maskPhone = (phone: string) => phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

const isModelArtist = (record: ArtistApplication) =>
  record.serviceMode === 'model_artist' ||
  (record.note && (record.note.includes('标杆') || record.note.includes('样板') || record.note.includes('星火')));

const renderStatusTag = (status: string) => (
  <Tag color={statusColor[status]}>{statusText[status] || status}</Tag>
);

const ArtistApplications: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const mobile = !screens.md;
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
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ArtistApplication) => (
        <Space direction="vertical" size={2}>
          <Space size={6}>
            <span style={{ fontWeight: 600 }}>{name}</span>
            {isModelArtist(record) && <Tag color="purple">指导配置</Tag>}
          </Space>
          <span style={{ fontSize: 12, color: 'var(--nb-muted)' }}>{record.city}</span>
        </Space>
      ),
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => maskPhone(phone),
    },
    { title: '城市', dataIndex: 'city', key: 'city' },
    {
      title: '服务方式',
      dataIndex: 'serviceMode',
      key: 'serviceMode',
      render: (val: string | null) => (val ? serviceModeText[val] || val : '—'),
    },
    {
      title: '微信号',
      dataIndex: 'wechat',
      key: 'wechat',
      render: (value: string | null) => value || '—',
    },
    {
      title: '关注公众号',
      dataIndex: 'followedMp',
      key: 'followedMp',
      render: (value: boolean | undefined) =>
        value ? <Tag color="success">已关注</Tag> : <Tag>未关注</Tag>,
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
      width: 140,
      render: (_: unknown, record: ArtistApplication) => {
        const actionItems: TableActionItem[] = [
          {
            key: 'detail',
            label: '详情',
            onClick: () => openDetail(record),
          },
        ];
        if (record.status === 'pending') {
          actionItems.push(
            {
              key: 'approve',
              label: '通过',
              popconfirm: {
                title: '确认审批通过并生成美甲师专属账号？',
                onConfirm: () => handleApprove(record.id),
              },
            },
            {
              key: 'reject',
              label: '拒绝',
              danger: true,
              popconfirm: {
                title: '确认拒绝该入驻申请？',
                onConfirm: () => handleReject(record.id),
              },
            }
          );
        }
        return <TableActions items={actionItems} maxInline={1} />;
      },
    },
  ];

  return (
    <div>
      <AdminPageHeader title="美甲师申请" description="审核外部独立美甲师与样板美甲师的入驻申请与资料认证。" />
      <Card className="admin-list-card">
        <Tabs
          activeKey={status}
          onChange={handleTabChange}
          items={[
            { key: 'pending', label: '待审核' },
            { key: 'approved', label: '已通过' },
            { key: 'rejected', label: '已拒绝' },
          ]}
        />

        {mobile ? (
          <div>
            {loading ? (
              <div className="admin-loading" style={{ minHeight: 200 }}>
                <Spin tip="加载中..." />
              </div>
            ) : !data?.data?.length ? (
              <Empty description="暂无相关申请记录" style={{ padding: '36px 0' }} />
            ) : (
              <div>
                {data.data.map((record) => (
                  <div key={record.id} className="admin-app-card">
                    <div className="admin-app-card-head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="admin-app-card-title">{record.name}</span>
                        {isModelArtist(record) && <Tag color="purple">指导配置</Tag>}
                      </div>
                      <div>{renderStatusTag(record.status)}</div>
                    </div>

                    <div className="admin-app-card-body">
                      <div className="admin-app-card-row">
                        <span className="admin-app-card-label">联系电话</span>
                        <span className="admin-app-card-value">
                          <a href={`tel:${record.phone}`} style={{ color: 'var(--nb-link)', fontWeight: 600 }}>
                            {record.phone}
                          </a>
                        </span>
                      </div>
                      <div className="admin-app-card-row">
                        <span className="admin-app-card-label">所在城市</span>
                        <span className="admin-app-card-value">{record.city || '—'}</span>
                      </div>
                      <div className="admin-app-card-row">
                        <span className="admin-app-card-label">服务模式</span>
                        <span className="admin-app-card-value">
                          {record.serviceMode ? serviceModeText[record.serviceMode] || record.serviceMode : '—'}
                        </span>
                      </div>
                      {record.experience && (
                        <div className="admin-app-card-row">
                          <span className="admin-app-card-label">从业经验</span>
                          <span className="admin-app-card-value">{record.experience}</span>
                        </div>
                      )}
                      {record.note && (
                        <div className="admin-app-card-row">
                          <span className="admin-app-card-label">申请备注</span>
                          <span className="admin-app-card-value" style={{ color: 'var(--nb-ink)' }}>{record.note}</span>
                        </div>
                      )}
                      <div className="admin-app-card-row">
                        <span className="admin-app-card-label">申请时间</span>
                        <span className="admin-app-card-value" style={{ color: 'var(--nb-muted)', fontSize: 12 }}>
                          {new Date(record.createdAt).toLocaleString('zh-CN', { hour12: false })}
                        </span>
                      </div>
                    </div>

                    <div className="admin-app-card-actions">
                      <Button
                        type="default"
                        icon={<EyeOutlined />}
                        onClick={() => openDetail(record)}
                      >
                        详情
                      </Button>
                      {record.status === 'pending' && (
                        <>
                          <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={() => handleApprove(record.id)}
                          >
                            通过
                          </Button>
                          <Button
                            danger
                            icon={<CloseOutlined />}
                            onClick={() => handleReject(record.id)}
                          >
                            拒绝
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                <Pagination
                  size="small"
                  current={page}
                  pageSize={20}
                  total={data?.meta.total || 0}
                  showTotal={(t) => `共 ${t} 条`}
                  onChange={(p) => setPage(p)}
                  style={{ marginTop: 16, textAlign: 'center', display: 'flex', justifyContent: 'center' }}
                />
              </div>
            )}
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={data?.data || []}
            rowKey="id"
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={{
              current: page,
              pageSize: 20,
              total: data?.meta.total || 0,
              showTotal: (t) => `共 ${t} 条`,
              onChange: (p) => setPage(p),
            }}
          />
        )}
      </Card>

      <Modal
        title="申请详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setSelected(null); }}
        footer={
          selected?.status === 'pending' ? (
            <Space style={{ width: '100%', justifyContent: 'flex-end', paddingTop: 8 }}>
              <Button
                danger
                onClick={() => {
                  if (selected) {
                    handleReject(selected.id);
                    setDetailVisible(false);
                  }
                }}
              >
                拒绝申请
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  if (selected) {
                    handleApprove(selected.id);
                    setDetailVisible(false);
                  }
                }}
              >
                通过申请
              </Button>
            </Space>
          ) : null
        }
        width={mobile ? '92vw' : 560}
      >
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="姓名">
              <Space>
                <span style={{ fontWeight: 600 }}>{selected.name}</span>
                {isModelArtist(selected) && <Tag color="purple">标杆扶持</Tag>}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="手机号">
              <Space>
                <span>{selected.phone}</span>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => navigator.clipboard.writeText(selected.phone).then(() => message.success('手机号已复制'))}
                >
                  复制
                </Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="微信号">{selected.wechat ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="城市">{selected.city}</Descriptions.Item>
            <Descriptions.Item label="服务方式">
              {selected.serviceMode ? serviceModeText[selected.serviceMode] || selected.serviceMode : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="经验">{selected.experience ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="专长">{selected.specialty ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="备注">{selected.note ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="关注公众号">
              {selected.followedMp ? <Tag color="success">已关注</Tag> : <Tag>未关注</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="状态">{renderStatusTag(selected.status)}</Descriptions.Item>
            <Descriptions.Item label="申请时间">
              {new Date(selected.createdAt).toLocaleString('zh-CN', { hour12: false })}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ArtistApplications;
