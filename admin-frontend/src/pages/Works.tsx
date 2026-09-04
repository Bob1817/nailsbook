import React, { useCallback, useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Input, Select, Tag, message, Card, Switch, Image, Drawer } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EyeOutlined, StarOutlined } from '@ant-design/icons';
import { adminWorkService } from '../services/adminWork';
import type { AdminWork } from '../services/adminWork';

const placeholderStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 4,
  background: 'var(--nb-line)',
};

const Works: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AdminWork[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [isVisible, setIsVisible] = useState<boolean | undefined>(undefined);
  const [isHomepageFeatured, setIsHomepageFeatured] = useState<boolean | undefined>(undefined);
  const [drawerWork, setDrawerWork] = useState<AdminWork | null>(null);

  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminWorkService.getAll({
        page,
        pageSize,
        keyword: keyword || undefined,
        isVisible,
        isHomepageFeatured,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch {
      message.error('获取作品列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, isVisible, isHomepageFeatured]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleVisibility = async (id: number) => {
    try {
      await adminWorkService.toggleVisibility(id);
      load();
    } catch {
      message.error('操作失败');
    }
  };

  const handleToggleHomepageFeatured = async (id: number) => {
    try {
      const result = await adminWorkService.toggleHomepageFeatured(id);
      setDrawerWork((prev) =>
        prev && prev.id === id ? { ...prev, isHomepageFeatured: result.isHomepageFeatured } : prev,
      );
      load();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除作品后不可恢复，是否继续？',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await adminWorkService.remove(id);
          message.success('已删除');
          load();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const columns: ColumnsType<AdminWork> = [
    {
      title: '封面',
      key: 'cover',
      width: 72,
      render: (_, record) =>
        record.coverUrl ? (
          <Image
            src={record.coverUrl}
            width={48}
            height={48}
            style={{ objectFit: 'cover', borderRadius: 4 }}
          />
        ) : (
          <div style={placeholderStyle} />
        ),
    },
    {
      title: '标题/标签',
      key: 'title',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.title || '无标题'}</div>
          <div style={{ marginTop: 4 }}>
            {record.tags.slice(0, 3).map((tag) => (
              <Tag key={tag} style={{ fontSize: 12 }}>
                {tag}
              </Tag>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: '美甲师',
      key: 'technician',
      render: (_, record) => record.technician?.name ?? '—',
    },
    {
      title: '点赞/评论',
      key: 'stats',
      render: (_, record) => `${record.likeCount} / ${record.commentCount}`,
    },
    {
      title: '可见',
      key: 'visible',
      render: (_, record) => (
        <Switch
          size="small"
          checked={record.isVisible}
          onChange={() => handleToggleVisibility(record.id)}
        />
      ),
    },
    {
      title: '官网精选',
      key: 'homepageFeatured',
      render: (_, record) => (
        <Switch
          size="small"
          checked={record.isHomepageFeatured}
          checkedChildren="精选"
          unCheckedChildren="否"
          onChange={() => handleToggleHomepageFeatured(record.id)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setDrawerWork(record)}>
            详情
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input.Search
              placeholder="搜索标题/标签"
              allowClear
              style={{ width: 200 }}
              onSearch={(value) => {
                setKeyword(value);
                setPage(1);
              }}
            />
            <Select
              placeholder="可见性"
              allowClear
              style={{ width: 120 }}
              value={isVisible}
              onChange={(value) => {
                setIsVisible(value);
                setPage(1);
              }}
              options={[
                { value: true, label: '可见' },
                { value: false, label: '已下架' },
              ]}
            />
            <Select
              placeholder="官网精选"
              allowClear
              style={{ width: 120 }}
              value={isHomepageFeatured}
              onChange={(value) => {
                setIsHomepageFeatured(value);
                setPage(1);
              }}
              options={[
                { value: true, label: '精选中' },
                { value: false, label: '未精选' },
              ]}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p) => setPage(p),
          }}
        />
      </Card>

      <Drawer
        title="作品详情"
        styles={{ wrapper: { width: 480 } }}
        open={!!drawerWork}
        onClose={() => setDrawerWork(null)}
      >
        {drawerWork && (
          <div>
            <Image.PreviewGroup>
              <Space wrap>
                {drawerWork.imageUrls.map((url) => (
                  <Image key={url} src={url} width={100} height={100} style={{ objectFit: 'cover' }} />
                ))}
              </Space>
            </Image.PreviewGroup>

            <div style={{ marginTop: 16 }}>
              <strong>标题：</strong>
              {drawerWork.title || '无标题'}
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>标签：</strong>
              <div style={{ marginTop: 4 }}>
                {drawerWork.tags.length > 0 ? (
                  drawerWork.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
                ) : (
                  '—'
                )}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <Space>
                <StarOutlined />
                <span>官网精选</span>
                <Switch
                  size="small"
                  checked={drawerWork.isHomepageFeatured}
                  checkedChildren="精选"
                  unCheckedChildren="否"
                  onChange={() => handleToggleHomepageFeatured(drawerWork.id)}
                />
              </Space>
            </div>

            {drawerWork.description && (
              <div style={{ marginTop: 12 }}>
                <strong>描述：</strong>
                <div style={{ marginTop: 4, color: 'var(--nb-secondary)' }}>{drawerWork.description}</div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Works;
