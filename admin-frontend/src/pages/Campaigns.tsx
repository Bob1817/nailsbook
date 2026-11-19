import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Divider,
  Drawer,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Radio,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  GiftOutlined,
  GlobalOutlined,
  LinkOutlined,
  MobileOutlined,
  PictureOutlined,
  PlusOutlined,
  StopOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminPageHeader from '../components/AdminPageHeader';
import { colors } from '../colors.generated';
import { campaignService } from '../services/campaign';
import type { CreateCampaignInput, PlatformCampaign } from '../services/campaign';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// 预设的项目其他页面路由，供富文本与目标跳转快捷选择
export const PROJECT_PAGE_PRESETS = [
  {
    category: '美甲师端',
    label: '💎 美甲师官方入驻与标杆扶持申请',
    url: '/pages/technician/apply/index',
    description: '合二为一入驻申请与标杆名额抢占页',
  },
  {
    category: '客户端',
    label: '💅 客户预约服务/选款下单',
    url: '/pages/client/create-order/index',
    description: '客户创建预约与选择美甲款式的核心入口',
  },
  {
    category: '客户端',
    label: '🏠 客户端首页',
    url: '/pages/client/home/index',
    description: '客户小程序首页',
  },
  {
    category: '客户端',
    label: '🔍 发现精选美甲作品',
    url: '/pages/client/discover/index',
    description: '客户浏览精选款式与美甲师动态',
  },
  {
    category: '客户端',
    label: '🎨 美甲师主页与作品集',
    url: '/pages/client/artist-home/index',
    description: '指定美甲师公开主页与服务报价',
  },
  {
    category: '通用',
    label: '💬 在线咨询与官方客服',
    url: '/pages/client/chat/index',
    description: '客户与美甲师/客服沟通面板',
  },
  {
    category: '官网',
    label: '🌐 官网标杆美甲师招募专页',
    url: '/model-artists',
    description: '官方网站标杆美甲师品牌展示与招募页',
  },
  {
    category: '官网',
    label: '🌐 官网美甲师入驻申请',
    url: '/apply',
    description: '官方网站美甲师在线入驻申请',
  },
];

// 展示对象映射
export const AUDIENCE_OPTIONS = [
  { value: 'all', label: '全部用户 (所有人可见)', icon: <TeamOutlined /> },
  { value: 'client', label: '客户端客户 (顾客)', icon: <UserOutlined /> },
  { value: 'technician', label: '美甲师端 (入驻/在驻美甲师)', icon: <GiftOutlined /> },
  { value: 'guest', label: '游客 (未登录访客)', icon: <GlobalOutlined /> },
];

export const AUDIENCE_TEXT_MAP: Record<string, string> = {
  all: '全部用户',
  client: '客户端客户',
  technician: '美甲师端',
  guest: '游客访客',
};

// 展示位置选项
export const DISPLAY_LOCATION_OPTIONS = [
  { label: '客户端首页 Hero', value: 'client_home_hero' },
  { label: '美甲师端首页 Hero', value: 'technician_home_hero' },
  { label: '官网首页 Banner', value: 'website_banner' },
  { label: '客户端发现页 Banner', value: 'client_discover' },
  { label: '系统通知/弹窗公告', value: 'notification_popup' },
];

export const DISPLAY_LOCATION_TEXT_MAP: Record<string, string> = {
  client_home_hero: '客户端首页Hero',
  technician_home_hero: '美甲师首页Hero',
  website_banner: '官网Banner',
  client_discover: '发现页Banner',
  notification_popup: '弹窗公告',
};

// 状态文字与配色标签
export const STATUS_TAG_MAP: Record<string, { label: string; color: string }> = {
  active: { label: '进行中', color: 'success' },
  scheduled: { label: '未开始', color: 'processing' },
  draft: { label: '草稿', color: 'default' },
  ended: { label: '已结束', color: 'default' },
  offline: { label: '已下架', color: 'error' },
};

const Campaigns: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  // 列表状态
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PlatformCampaign[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 过滤项
  const [selectedStatusTab, setSelectedStatusTab] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterAudience, setFilterAudience] = useState<string | undefined>(undefined);
  const [filterLocation, setFilterLocation] = useState<string | undefined>(undefined);

  // 详情/预览抽屉
  const [previewCampaign, setPreviewCampaign] = useState<PlatformCampaign | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // 编辑/新增抽屉
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // 富文本编辑器状态与快速插入链接弹窗
  const [richContent, setRichContent] = useState('');
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkPresetUrl, setLinkPresetUrl] = useState('');
  const [customLinkUrl, setCustomLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkStyle, setLinkStyle] = useState<'text' | 'card'>('card');

  // 获取活动列表数据
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await campaignService.list({
        page,
        pageSize,
        keyword: searchKeyword || undefined,
        status: selectedStatusTab === 'all' ? undefined : selectedStatusTab,
        targetAudience: filterAudience,
        displayLocation: filterLocation,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
      setCounts(res.counts || {});
    } catch {
      message.error('加载活动列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchKeyword, selectedStatusTab, filterAudience, filterLocation]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // 打开创建活动抽屉
  const handleOpenCreate = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({
      title: '',
      summary: '',
      badgeText: '官方扶持',
      targetAudience: 'all',
      displayLocations: ['technician_home_hero', 'client_home_hero'],
      actionType: 'page',
      actionUrl: '/pages/technician/apply/index',
      status: 'active',
      sortOrder: 10,
      isForever: true,
    });
    setRichContent(`<h2>活动背景与核心亮点</h2>
<p>为帮助优秀美甲师快速打造数字化标杆，OnlyNail 官方推出 1v1 全程指导扶持服务。</p>
<blockquote>官方专员全程协助配置店铺价格表、主推作品集与在线预约时段，助您轻松拎包入驻。</blockquote>
<h3>专属权益</h3>
<ul>
  <li>官方运营 1 对 1 专属管家协助完成全套系统配置</li>
  <li>微信小程序专属预约卡片与小红书定制推广物料</li>
  <li>核心经营数据看板与智能客户档案全功能支持</li>
</ul>
<div class="campaign-cta-card" data-url="/pages/technician/apply/index">
  <div>
    <div class="campaign-cta-title">👉 抢占标杆美甲师扶持席位</div>
    <div class="campaign-cta-path">链接至：美甲师入驻与标杆扶持申请</div>
  </div>
  <span style="font-size: 16px;">›</span>
</div>
<p>名额有限，先到先得，官方审核通过后将于 24 小时内与您取得联系。</p>`);
    setEditorVisible(true);
  };

  // 打开编辑活动抽屉
  const handleOpenEdit = async (record: PlatformCampaign) => {
    setEditingId(record.id);
    form.resetFields();
    try {
      const detail = await campaignService.getDetail(record.id);
      form.setFieldsValue({
        title: detail.title,
        summary: detail.summary || '',
        coverUrl: detail.coverUrl || '',
        badgeText: detail.badgeText || '',
        targetAudience: detail.targetAudience,
        displayLocations: detail.displayLocations || [],
        actionType: detail.actionType,
        actionUrl: detail.actionUrl || '',
        status: detail.status,
        sortOrder: detail.sortOrder,
        isForever: !detail.startTime && !detail.endTime,
        timeRange:
          detail.startTime && detail.endTime
            ? [dayjs(detail.startTime), dayjs(detail.endTime)]
            : undefined,
      });
      setRichContent(detail.content || '');
      setEditorVisible(true);
    } catch {
      message.error('获取活动详情失败');
    }
  };

  // 提交保存活动
  const handleSaveCampaign = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      let startTime: string | null = null;
      let endTime: string | null = null;
      if (!values.isForever && values.timeRange && values.timeRange.length === 2) {
        startTime = values.timeRange[0].toISOString();
        endTime = values.timeRange[1].toISOString();
      }

      const payload: CreateCampaignInput = {
        title: values.title,
        summary: values.summary || '',
        coverUrl: values.coverUrl || '',
        badgeText: values.badgeText || '',
        content: richContent,
        targetAudience: values.targetAudience,
        displayLocations: values.displayLocations || [],
        actionType: values.actionType,
        actionUrl: values.actionUrl || '',
        startTime,
        endTime,
        status: values.status,
        sortOrder: values.sortOrder || 0,
      };

      if (editingId) {
        await campaignService.update(editingId, payload);
        message.success('活动更新成功');
      } else {
        await campaignService.create(payload);
        message.success('活动创建成功');
      }

      setEditorVisible(false);
      fetchCampaigns();
    } catch {
      message.error('保存失败，请检查表单输入');
    } finally {
      setSaving(false);
    }
  };

  // 快捷切换上下架状态
  const handleToggleStatus = async (record: PlatformCampaign) => {
    const nextStatus = record.status === 'active' ? 'offline' : 'active';
    try {
      await campaignService.setStatus(record.id, nextStatus);
      message.success(nextStatus === 'active' ? '活动已上架' : '活动已下架');
      fetchCampaigns();
    } catch {
      message.error('状态修改失败');
    }
  };

  // 删除活动
  const handleDeleteCampaign = async (id: number) => {
    try {
      await campaignService.delete(id);
      message.success('活动已删除');
      fetchCampaigns();
    } catch {
      message.error('删除活动失败');
    }
  };

  // 插入项目页面链接弹窗确认
  const handleConfirmInsertLink = () => {
    const finalUrl = customLinkUrl.trim() || linkPresetUrl.trim();
    if (!finalUrl) {
      message.warning('请选择或输入目标页面链接');
      return;
    }
    const finalLabel = linkText.trim() || '👉 点击前往该页面';

    let snippet = '';
    if (linkStyle === 'card') {
      snippet = `\n<div class="campaign-cta-card" data-url="${finalUrl}">
  <div>
    <div class="campaign-cta-title">${finalLabel}</div>
    <div class="campaign-cta-path">目标路径: ${finalUrl}</div>
  </div>
  <span style="font-size: 16px;">›</span>
</div>\n`;
    } else {
      snippet = `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer">${finalLabel}</a>`;
    }

    setRichContent((prev) => prev + snippet);
    setLinkModalVisible(false);
    setLinkText('');
    setCustomLinkUrl('');
    setLinkPresetUrl('');
    message.success('已插入项目页面链接');
  };

  // 格式化富文本辅助操作
  const appendRichText = (tag: string, placeholder = '内容') => {
    if (tag === 'h2') setRichContent((prev) => `${prev}\n<h2>${placeholder}</h2>\n`);
    else if (tag === 'h3') setRichContent((prev) => `${prev}\n<h3>${placeholder}</h3>\n`);
    else if (tag === 'p') setRichContent((prev) => `${prev}\n<p>${placeholder}</p>\n`);
    else if (tag === 'bold') setRichContent((prev) => `${prev} <strong>加粗重点</strong> `);
    else if (tag === 'blockquote') setRichContent((prev) => `${prev}\n<blockquote>提示或特别说明</blockquote>\n`);
    else if (tag === 'ul') setRichContent((prev) => `${prev}\n<ul>\n  <li>核心要点 1</li>\n  <li>核心要点 2</li>\n</ul>\n`);
    else if (tag === 'hr') setRichContent((prev) => `${prev}\n<hr />\n`);
    else if (tag === 'image') {
      Modal.confirm({
        title: '插入展示图片',
        content: (
          <Input
            id="image-url-input"
            placeholder="请输入图片 URL（如 CDN 或图床链接）"
            style={{ marginTop: 12 }}
          />
        ),
        onOk: () => {
          const input = document.getElementById('image-url-input') as HTMLInputElement;
          if (input?.value?.trim()) {
            setRichContent((prev) => `${prev}\n<img src="${input.value.trim()}" alt="活动配图" />\n`);
          }
        },
      });
    }
  };

  // 表格列定义
  const columns: ColumnsType<PlatformCampaign> = [
    {
      title: '活动名称与封面',
      key: 'title',
      render: (_, record) => (
        <Space align="start" size={12}>
          {record.coverUrl ? (
            <img
              src={record.coverUrl}
              alt={record.title}
              style={{
                width: 68,
                height: 48,
                borderRadius: 6,
                objectFit: 'cover',
                background: colors.activeSurface,
                border: `1px solid ${colors.line}`,
              }}
            />
          ) : (
            <div
              style={{
                width: 68,
                height: 48,
                borderRadius: 6,
                background: colors.activeSurface,
                border: `1px solid ${colors.line}`,
                display: 'grid',
                placeItems: 'center',
                color: colors.muted,
                fontSize: 18,
              }}
            >
              <PictureOutlined />
            </div>
          )}
          <div>
            <Space orientation="horizontal" size={6} wrap>
              <Text strong style={{ color: colors.ink }}>
                {record.title}
              </Text>
              {record.badgeText ? (
                <Tag color="cyan" style={{ fontSize: 11 }}>
                  {record.badgeText}
                </Tag>
              ) : null}
            </Space>
            {record.summary ? (
              <Paragraph
                type="secondary"
                ellipsis={{ rows: 1 }}
                style={{ fontSize: 12, margin: '4px 0 0', maxWidth: 280 }}
              >
                {record.summary}
              </Paragraph>
            ) : null}
            {record.actionUrl ? (
              <Text type="secondary" style={{ fontSize: 11, color: colors.link, display: 'block', marginTop: 2 }}>
                链接: {record.actionUrl}
              </Text>
            ) : null}
          </div>
        </Space>
      ),
    },
    {
      title: '展示对象',
      dataIndex: 'targetAudience',
      key: 'targetAudience',
      width: 120,
      render: (aud: string) => {
        const text = AUDIENCE_TEXT_MAP[aud] || aud;
        return <Tag icon={<UserOutlined />}>{text}</Tag>;
      },
    },
    {
      title: '展示位置',
      dataIndex: 'displayLocations',
      key: 'displayLocations',
      width: 200,
      render: (locs: string[]) => (
        <Space size={[4, 4]} wrap>
          {locs && locs.length > 0 ? (
            locs.map((loc) => (
              <Tag key={loc} color="default" style={{ fontSize: 11 }}>
                {DISPLAY_LOCATION_TEXT_MAP[loc] || loc}
              </Tag>
            ))
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              未指定位置
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '活动起止时间',
      key: 'timeRange',
      width: 200,
      render: (_, record) => {
        if (!record.startTime && !record.endTime) {
          return <Tag color="blue">长期有效</Tag>;
        }
        return (
          <div style={{ fontSize: 12, lineHeight: 1.4 }}>
            <div>起: {record.startTime ? dayjs(record.startTime).format('YYYY-MM-DD HH:mm') : '即日起'}</div>
            <div>止: {record.endTime ? dayjs(record.endTime).format('YYYY-MM-DD HH:mm') : '长期'}</div>
          </div>
        );
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 110,
      render: (_, record) => {
        const statusCfg = STATUS_TAG_MAP[record.effectiveStatus] || {
          label: record.effectiveStatus,
          color: 'default',
        };
        return <Tag color={statusCfg.color}>{statusCfg.label}</Tag>;
      },
    },
    {
      title: '数据统计',
      key: 'metrics',
      width: 120,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>浏览: <Text strong>{record.viewCount}</Text></div>
          <div>点击: <Text strong>{record.clickCount}</Text></div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="预览手机活动页面">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setPreviewCampaign(record);
                setPreviewVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="编辑活动">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>
          <Tooltip title={record.status === 'active' ? '下架活动' : '上架活动'}>
            <Button
              type="text"
              size="small"
              icon={record.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
              onClick={() => handleToggleStatus(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除该活动？"
            description="删除后不可恢复，公开页面与Banner将即时移除"
            onConfirm={() => handleDeleteCampaign(record.id)}
            okText="删除"
            cancelText="取消"
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 手机端模拟器渲染组件（用于抽屉预览与编辑时实时查看）
  const renderPhoneSimulator = (campaign: Partial<PlatformCampaign> & { isForever?: boolean }) => {
    return (
      <div className="campaign-phone-mockup">
        <div className="campaign-phone-notch">
          <div className="campaign-phone-notch-bar" />
        </div>
        <div className="campaign-phone-header">
          <span style={{ position: 'absolute', left: 14, fontSize: 13, color: colors.secondary }}>
            ‹ 返回
          </span>
          <Text ellipsis style={{ maxWidth: 200, fontWeight: 600 }}>
            {campaign.title || '活动详情'}
          </Text>
        </div>
        <div className="campaign-phone-body">
          {campaign.coverUrl ? (
            <div style={{ width: '100%', height: 160, position: 'relative' }}>
              <img
                src={campaign.coverUrl}
                alt={campaign.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {campaign.badgeText ? (
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    background: 'rgba(0, 0, 0, 0.75)',
                    color: colors.inverse,
                    padding: '3px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {campaign.badgeText}
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={{ padding: '16px', background: colors.surface }}>
            <Space size={6} wrap style={{ marginBottom: 6 }}>
              {campaign.badgeText && !campaign.coverUrl ? (
                <Tag color="cyan">{campaign.badgeText}</Tag>
              ) : null}
              {campaign.targetAudience ? (
                <Tag>{AUDIENCE_TEXT_MAP[campaign.targetAudience] || '全部用户'}</Tag>
              ) : null}
            </Space>
            <Title level={4} style={{ margin: '0 0 6px', color: colors.ink, fontSize: 18 }}>
              {campaign.title || '活动标题待输入'}
            </Title>
            {campaign.summary ? (
              <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
                {campaign.summary}
              </Paragraph>
            ) : null}

            <div
              style={{
                fontSize: 11,
                color: colors.muted,
                padding: '6px 10px',
                background: colors.activeSurface,
                borderRadius: 6,
                marginBottom: 14,
              }}
            >
              活动有效期：
              {campaign.isForever || (!campaign.startTime && !campaign.endTime)
                ? '长期有效'
                : `${campaign.startTime ? dayjs(campaign.startTime).format('MM-DD HH:mm') : '即日'} 至 ${
                    campaign.endTime ? dayjs(campaign.endTime).format('MM-DD HH:mm') : '长期'
                  }`}
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* 富文本核心渲染区 */}
            <div
              className="campaign-rich-content"
              dangerouslySetInnerHTML={{
                __html: campaign.content || '<p style="color: #8A8A8F;">暂无详细活动说明</p>',
              }}
              onClick={(e) => {
                const target = (e.target as HTMLElement).closest('[data-url]');
                if (target) {
                  const url = target.getAttribute('data-url');
                  Modal.info({
                    title: '模拟器：项目内页跳转触发',
                    content: `在微信小程序或客户端中，点击此卡片将直接跳转到项目内置页面：\n${url}`,
                  });
                }
              }}
            />
          </div>
        </div>

        {/* 底部行动栏 */}
        <div className="campaign-phone-footer">
          <Button
            type="primary"
            block
            size="large"
            style={{
              height: 44,
              borderRadius: 22,
              background: colors.action,
              color: colors.inverse,
              fontWeight: 600,
            }}
            onClick={() => {
              const url = campaign.actionUrl || '/pages/technician/apply/index';
              Modal.info({
                title: '模拟器：主行动按钮跳转',
                content: `点击主行动按钮，跳转至：\n${url}`,
              });
            }}
          >
            {campaign.actionType === 'internal_link' ? '前往办理/预约' : '立即参与活动'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: isMobile ? 12 : 24, maxWidth: 1440, margin: '0 auto' }}>
      <AdminPageHeader
        title="活动中心"
        description="统一管理平台各端（客户端、美甲师端、官网）营销活动与展示页面，支持富文本排版、项目内页链接深度跳转与起止时间自动化控制。"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            style={{ background: colors.action, height: 44, borderRadius: 8 }}
            onClick={handleOpenCreate}
          >
            新建活动页面
          </Button>
        }
      />

      {/* 顶部状态统计 Tabs */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '12px 16px' } }}>
        <Tabs
          activeKey={selectedStatusTab}
          onChange={(k) => {
            setSelectedStatusTab(k);
            setPage(1);
          }}
          items={[
            { key: 'all', label: `全部活动 (${counts.total || 0})` },
            { key: 'active', label: `进行中 (${counts.active || 0})` },
            { key: 'scheduled', label: `未开始` },
            { key: 'draft', label: `草稿箱 (${counts.draft || 0})` },
            { key: 'offline', label: `已下架 (${counts.offline || 0})` },
            { key: 'ended', label: `已结束` },
          ]}
        />

        {/* 检索与筛选栏 */}
        <Space orientation={isMobile ? 'vertical' : 'horizontal'} size={12} style={{ width: '100%', marginTop: 8 }} wrap>
          <Input.Search
            placeholder="搜索活动标题、副标题或跳转链接"
            allowClear
            style={{ width: isMobile ? '100%' : 260 }}
            onSearch={(v) => {
              setSearchKeyword(v);
              setPage(1);
            }}
          />
          <Select
            placeholder="筛选展示受众"
            allowClear
            style={{ width: isMobile ? '100%' : 180 }}
            value={filterAudience}
            onChange={(v) => {
              setFilterAudience(v);
              setPage(1);
            }}
            options={AUDIENCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <Select
            placeholder="筛选展示位置"
            allowClear
            style={{ width: isMobile ? '100%' : 190 }}
            value={filterLocation}
            onChange={(v) => {
              setFilterLocation(v);
              setPage(1);
            }}
            options={DISPLAY_LOCATION_OPTIONS}
          />
        </Space>
      </Card>

      {/* 列表呈现：PC端表格 / 移动端卡片 */}
      <Card styles={{ body: { padding: isMobile ? 8 : 16 } }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Spin size="large" />
          </div>
        ) : items.length === 0 ? (
          <Empty description="暂无符合条件的活动记录" style={{ padding: 36 }}>
            <Button type="primary" onClick={handleOpenCreate}>
              立即创建首个活动页面
            </Button>
          </Empty>
        ) : isMobile ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {items.map((item) => (
              <Card key={item.id} size="small" style={{ borderRadius: 8, border: `1px solid ${colors.line}` }}>
                <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text strong style={{ fontSize: 15 }}>{item.title}</Text>
                  <Tag color={STATUS_TAG_MAP[item.effectiveStatus]?.color}>
                    {STATUS_TAG_MAP[item.effectiveStatus]?.label}
                  </Tag>
                </Space>
                {item.summary ? (
                  <Paragraph type="secondary" style={{ fontSize: 12, margin: '6px 0' }}>
                    {item.summary}
                  </Paragraph>
                ) : null}
                <div style={{ fontSize: 12, color: colors.muted, margin: '6px 0' }}>
                  受众: {AUDIENCE_TEXT_MAP[item.targetAudience]} | 浏览: {item.viewCount} | 点击: {item.clickCount}
                </div>
                <Space wrap style={{ marginTop: 8 }}>
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => {
                      setPreviewCampaign(item);
                      setPreviewVisible(true);
                    }}
                  >
                    预览
                  </Button>
                  <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(item)}>
                    编辑
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleToggleStatus(item)}
                  >
                    {item.status === 'active' ? '下架' : '上架'}
                  </Button>
                  <Popconfirm title="确认删除？" onConfirm={() => handleDeleteCampaign(item.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </Card>
            ))}
            <div style={{ textAlign: 'right', marginTop: 12 }}>
              <Pagination
                size="small"
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(p) => setPage(p)}
              />
            </div>
          </Space>
        ) : (
          <>
            <Table
              columns={columns}
              dataSource={items}
              rowKey="id"
              pagination={false}
              bordered={false}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                showSizeChanger
                showQuickJumper
                showTotal={(t) => `共 ${t} 项活动记录`}
                onChange={(p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                }}
              />
            </div>
          </>
        )}
      </Card>

      {/* 创建 / 编辑活动抽屉 */}
      <Drawer
        title={editingId ? '编辑活动页面' : '创建活动页面'}
        open={editorVisible}
        onClose={() => setEditorVisible(false)}
        width={screens.xl ? 1120 : screens.lg ? 960 : '96%'}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setEditorVisible(false)}>取消</Button>
            <Button
              type="primary"
              loading={saving}
              style={{ background: colors.action, color: colors.inverse }}
              onClick={handleSaveCampaign}
            >
              保存并发布
            </Button>
          </Space>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: screens.lg ? '1fr 380px' : '1fr', gap: 24 }}>
          {/* 左侧：表单与富文本编辑器 */}
          <div>
            <Form form={form} layout="vertical">
              <Card title="1. 活动基本信息" size="small" style={{ marginBottom: 16 }}>
                <Form.Item
                  label="活动主标题"
                  name="title"
                  rules={[{ required: true, message: '请输入活动主标题' }]}
                >
                  <Input placeholder="例如：官方指导配置标杆美甲师招募 / 新人预约限时立减" />
                </Form.Item>

                <Form.Item label="活动副标题 / 简介" name="summary">
                  <Input.TextArea
                    rows={2}
                    placeholder="简短说明活动核心亮点，将展示在列表卡片与Banner下方"
                  />
                </Form.Item>

                <Space style={{ width: '100%' }} size={16} wrap>
                  <Form.Item label="角标/高亮标签" name="badgeText" style={{ flex: 1, minWidth: 200 }}>
                    <Input placeholder="例如：官方扶持 · 限量10席 / 热门活动" />
                  </Form.Item>
                  <Form.Item label="排序权重" name="sortOrder" style={{ width: 140 }}>
                    <InputNumber min={0} max={9999} style={{ width: '100%' }} />
                  </Form.Item>
                </Space>

                <Form.Item label="封面 / Banner 图片 URL" name="coverUrl">
                  <Input
                    placeholder="请输入图片 URL（支持阿里云 OSS、微信图床等图片地址）"
                    suffix={
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          form.setFieldValue(
                            'coverUrl',
                            'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=80',
                          );
                        }}
                      >
                        填入优质素材图
                      </Button>
                    }
                  />
                </Form.Item>
              </Card>

              <Card title="2. 投放对象与展示位置" size="small" style={{ marginBottom: 16 }}>
                <Form.Item
                  label="活动展示对象（人群可见性）"
                  name="targetAudience"
                  rules={[{ required: true }]}
                >
                  <Radio.Group options={AUDIENCE_OPTIONS} optionType="button" buttonStyle="solid" />
                </Form.Item>

                <Form.Item
                  label="活动展示位置（多选）"
                  name="displayLocations"
                  rules={[{ required: true, message: '请至少选择一个投放展示位置' }]}
                >
                  <Checkbox.Group options={DISPLAY_LOCATION_OPTIONS} />
                </Form.Item>

                <Form.Item label="活动起止时间" style={{ marginBottom: 8 }}>
                  <Form.Item name="isForever" valuePropName="checked" noStyle>
                    <Checkbox
                      onChange={(e) => {
                        if (e.target.checked) form.setFieldValue('timeRange', undefined);
                      }}
                    >
                      长期有效（无固定截止时间）
                    </Checkbox>
                  </Form.Item>
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate={(prev, cur) => prev.isForever !== cur.isForever}
                >
                  {({ getFieldValue }) =>
                    !getFieldValue('isForever') ? (
                      <Form.Item
                        name="timeRange"
                        rules={[{ required: true, message: '请选择活动起止时间' }]}
                      >
                        <RangePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>

                <Space size={24} style={{ marginTop: 8 }}>
                  <Form.Item label="发布状态" name="status" style={{ marginBottom: 0 }}>
                    <Radio.Group>
                      <Radio.Button value="active">立即发布上线</Radio.Button>
                      <Radio.Button value="draft">存为草稿</Radio.Button>
                      <Radio.Button value="offline">暂存下架</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Space>
              </Card>

              <Card title="3. 点击动作与目标跳转" size="small" style={{ marginBottom: 16 }}>
                <Form.Item label="用户点击活动后的交互模式" name="actionType">
                  <Radio.Group>
                    <Radio value="page">进入活动独立富文本详情页面（推荐）</Radio>
                    <Radio value="internal_link">直接跳转项目内置其他页面</Radio>
                    <Radio value="external_link">打开外部链接</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item label="目标跳转页面路径（内链或外链）" name="actionUrl">
                  <Input
                    placeholder="如 /pages/technician/apply/index 或完整 URL"
                    addonAfter={
                      <Select
                        placeholder="快速选择项目内页"
                        style={{ width: 180 }}
                        onChange={(val) => form.setFieldValue('actionUrl', val)}
                        options={PROJECT_PAGE_PRESETS.map((p) => ({
                          label: p.label,
                          value: p.url,
                        }))}
                      />
                    }
                  />
                </Form.Item>
              </Card>

              <Card
                title={
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <span>4. 活动页面富文本排版</span>
                    <Button
                      type="primary"
                      icon={<LinkOutlined />}
                      size="small"
                      style={{ background: colors.action, borderRadius: 6 }}
                      onClick={() => setLinkModalVisible(true)}
                    >
                      插入项目页面链接
                    </Button>
                  </Space>
                }
                size="small"
                style={{ marginBottom: 16 }}
              >
                {/* 富文本辅助工具栏 */}
                <div className="campaign-editor-toolbar">
                  <Button size="small" onClick={() => appendRichText('h2', '二级主标题')}>H2 标题</Button>
                  <Button size="small" onClick={() => appendRichText('h3', '三级小标题')}>H3 小标</Button>
                  <Button size="small" onClick={() => appendRichText('p', '输入段落正文文本...')}>段落</Button>
                  <Button size="small" onClick={() => appendRichText('bold')}>加粗</Button>
                  <Button size="small" onClick={() => appendRichText('blockquote')}>引用块</Button>
                  <Button size="small" onClick={() => appendRichText('ul')}>列表</Button>
                  <Button size="small" onClick={() => appendRichText('hr')}>分割线</Button>
                  <Button size="small" icon={<PictureOutlined />} onClick={() => appendRichText('image')}>插图</Button>
                  <Button
                    size="small"
                    icon={<LinkOutlined />}
                    type="dashed"
                    onClick={() => setLinkModalVisible(true)}
                  >
                    + 内页链接卡片
                  </Button>
                </div>

                <Input.TextArea
                  value={richContent}
                  onChange={(e) => setRichContent(e.target.value)}
                  rows={14}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 13,
                    borderRadius: '0 0 8px 8px',
                    borderTop: 'none',
                  }}
                  placeholder="可直接在此编辑 HTML 或使用上方工具栏快速构建活动页面内容..."
                />
              </Card>
            </Form>
          </div>

          {/* 右侧：实时真机模拟视窗 */}
          {screens.lg ? (
            <div>
              <div style={{ position: 'sticky', top: 16 }}>
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ color: colors.ink }}>
                    <MobileOutlined style={{ marginRight: 6 }} />
                    手机端实时预览效果
                  </Text>
                  <Tag color="green">实时同步</Tag>
                </div>
                {renderPhoneSimulator({
                  title: form.getFieldValue('title'),
                  summary: form.getFieldValue('summary'),
                  coverUrl: form.getFieldValue('coverUrl'),
                  badgeText: form.getFieldValue('badgeText'),
                  targetAudience: form.getFieldValue('targetAudience'),
                  actionType: form.getFieldValue('actionType'),
                  actionUrl: form.getFieldValue('actionUrl'),
                  isForever: form.getFieldValue('isForever'),
                  content: richContent,
                })}
              </div>
            </div>
          ) : null}
        </div>
      </Drawer>

      {/* 独立预览抽屉（从列表中点击眼睛图标唤起） */}
      <Drawer
        title="活动页面真机预览"
        open={previewVisible}
        onClose={() => setPreviewVisible(false)}
        width={screens.md ? 460 : '100%'}
        destroyOnClose
      >
        {previewCampaign ? renderPhoneSimulator(previewCampaign) : null}
      </Drawer>

      {/* 插入项目其他页面链接 Modal */}
      <Modal
        title="插入项目其他页面链接"
        open={linkModalVisible}
        onOk={handleConfirmInsertLink}
        onCancel={() => setLinkModalVisible(false)}
        okText="插入链接"
        cancelText="取消"
        okButtonProps={{ style: { background: colors.action } }}
      >
        <div style={{ padding: '8px 0' }}>
          <Paragraph type="secondary" style={{ fontSize: 13 }}>
            选择项目现有功能页面，活动页面在客户端中点击时将无缝跳转到对应业务模块。
          </Paragraph>

          <div style={{ marginBottom: 14 }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              1. 快捷选择内置项目页面：
            </Text>
            <Select
              placeholder="从内置业务模块中快速选择"
              style={{ width: '100%' }}
              value={linkPresetUrl || undefined}
              onChange={(val) => {
                setLinkPresetUrl(val);
                setCustomLinkUrl('');
                const found = PROJECT_PAGE_PRESETS.find((p) => p.url === val);
                if (found && !linkText) {
                  setLinkText(found.label.replace(/^[^\s]+\s*/, ''));
                }
              }}
              options={PROJECT_PAGE_PRESETS.map((p) => ({
                label: (
                  <div>
                    <Text strong>{p.label}</Text>
                    <div style={{ fontSize: 11, color: colors.muted }}>{p.url}</div>
                  </div>
                ),
                value: p.url,
              }))}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              或自定义页面路径 / 外部链接：
            </Text>
            <Input
              placeholder="如 /pages/client/home/index 或 https://..."
              value={customLinkUrl}
              onChange={(e) => {
                setCustomLinkUrl(e.target.value);
                setLinkPresetUrl('');
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              2. 链接显示文案：
            </Text>
            <Input
              placeholder="例如：👉 立即抢占标杆美甲师扶持名额 / 点击前往预约"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
            />
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              3. 视觉展现形式：
            </Text>
            <Radio.Group
              value={linkStyle}
              onChange={(e) => setLinkStyle(e.target.value)}
            >
              <Radio.Button value="card">行动卡片（带箭头高亮大按钮，强烈推荐）</Radio.Button>
              <Radio.Button value="text">普通文字超链接</Radio.Button>
            </Radio.Group>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Campaigns;
