import React, { useEffect, useState } from 'react';
import { Table, Select, message, Card, Modal, Descriptions, DatePicker, Space } from 'antd';
import { operationLogService } from '../services/operationLog';
import type { OperationLog } from '../services/operationLog';
import type { PaginatedResponse } from '../services/technician';

const { RangePicker } = DatePicker;

const OperationLogs: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResponse<OperationLog> | null>(null);
  const [modules, setModules] = useState<{ module: string; count: number }[]>([]);
  const [actions, setActions] = useState<{ action: string; count: number }[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<OperationLog | null>(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    module: '',
    action: '',
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await operationLogService.getAll({
        page: filters.page,
        limit: filters.limit,
        module: filters.module || undefined,
        action: filters.action || undefined,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      setData(result);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const result = await operationLogService.getModules();
      setModules(result);
    } catch (error) {
      console.error('Failed to fetch modules');
    }
  };

  const fetchActions = async (module?: string) => {
    try {
      const result = await operationLogService.getActions(module);
      setActions(result);
    } catch (error) {
      console.error('Failed to fetch actions');
    }
  };

  useEffect(() => {
    fetchModules();
    fetchActions();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  useEffect(() => {
    if (filters.module) {
      fetchActions(filters.module);
    } else {
      fetchActions();
    }
  }, [filters.module]);

  const moduleTextMap: Record<string, string> = {
    technician: '美甲师',
    customer: '客户',
    quote: '报价',
    booking: '预约',
    revenue: '收入',
    subscription: '订阅',
    system: '系统',
    log: '日志',
    dashboard: '看板',
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '操作人', dataIndex: ['adminUser', 'realName'], key: 'adminUser', render: (text: string, record: OperationLog) => text || record.adminUser?.username },
    { title: '模块', dataIndex: 'module', key: 'module', render: (module: string) => moduleTextMap[module] || module },
    { title: '操作', dataIndex: 'action', key: 'action' },
    { title: '目标类型', dataIndex: 'targetType', key: 'targetType' },
    { title: '目标ID', dataIndex: 'targetId', key: 'targetId' },
    { title: 'IP地址', dataIndex: 'ip', key: 'ip' },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: OperationLog) => (
        <a onClick={() => { setSelectedLog(record); setDetailVisible(true); }}>详情</a>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              placeholder="选择模块"
              allowClear
              value={filters.module || undefined}
              onChange={(value) => setFilters({ ...filters, page: 1, module: value || '', action: '' })}
              style={{ width: 120 }}
              options={modules.map(m => ({ value: m.module, label: moduleTextMap[m.module] || m.module }))}
            />
            <Select
              placeholder="选择操作"
              allowClear
              value={filters.action || undefined}
              onChange={(value) => setFilters({ ...filters, page: 1, action: value || '' })}
              style={{ width: 150 }}
              options={actions.map(a => ({ value: a.action, label: a.action }))}
            />
            <RangePicker
              onChange={(dates) => setFilters({
                ...filters,
                page: 1,
                startDate: dates?.[0]?.format('YYYY-MM-DD'),
                endDate: dates?.[1]?.format('YYYY-MM-DD'),
              })}
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
        title="日志详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setSelectedLog(null); }}
        footer={null}
        width={700}
      >
        {selectedLog && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="ID">{selectedLog.id}</Descriptions.Item>
            <Descriptions.Item label="操作人">{selectedLog.adminUser?.realName || selectedLog.adminUser?.username}</Descriptions.Item>
            <Descriptions.Item label="模块">{moduleTextMap[selectedLog.module] || selectedLog.module}</Descriptions.Item>
            <Descriptions.Item label="操作">{selectedLog.action}</Descriptions.Item>
            <Descriptions.Item label="目标类型">{selectedLog.targetType || '-'}</Descriptions.Item>
            <Descriptions.Item label="目标ID">{selectedLog.targetId || '-'}</Descriptions.Item>
            <Descriptions.Item label="IP地址">{selectedLog.ip || '-'}</Descriptions.Item>
            <Descriptions.Item label="操作时间">{new Date(selectedLog.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
            <Descriptions.Item label="变更前数据" span={2}>
              <pre style={{ maxHeight: 150, overflow: 'auto', margin: 0 }}>
                {selectedLog.beforeData ? JSON.stringify(JSON.parse(selectedLog.beforeData), null, 2) : '-'}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="变更后数据" span={2}>
              <pre style={{ maxHeight: 150, overflow: 'auto', margin: 0 }}>
                {selectedLog.afterData ? JSON.stringify(JSON.parse(selectedLog.afterData), null, 2) : '-'}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default OperationLogs;
