import React from 'react';
import { Button, Dropdown, Grid, Popconfirm, Space } from 'antd';
import type { MenuProps } from 'antd';
import { DownOutlined, EllipsisOutlined } from '@ant-design/icons';

export interface ActionItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  confirm?: {
    title: string;
    description?: string;
    okText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  };
  popconfirm?: {
    title: string;
    description?: string;
    okText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  };
  onClick?: () => void;
}

export type TableActionItem = ActionItem;

export interface TableActionsProps {
  /**
   * 单一或多个首选操作（优先外显）
   */
  primary?: ActionItem | ActionItem[];
  /**
   * 次要操作（直接归入下拉折叠）
   */
  secondary?: ActionItem[];
  /**
   * 通用平铺列表（将根据屏幕断点自动拆分为 inline 项与下拉项）
   */
  actions?: ActionItem[];
  /**
   * 别名，兼容 items 传递
   */
  items?: ActionItem[];
  /**
   * 桌面端最大直接展示按钮数（默认 2；移动端自动收敛为 1）
   */
  maxInline?: number;
  /**
   * 按钮尺寸（默认 small）
   */
  size?: 'small' | 'middle';
  /**
   * 更多按钮样式定制
   */
  dropdownTriggerText?: React.ReactNode;
}

export const TableActions: React.FC<TableActionsProps> = ({
  primary,
  secondary = [],
  actions,
  items,
  maxInline = 2,
  size = 'small',
  dropdownTriggerText,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const effectiveActions = actions || items;

  // 整理并过滤有效操作
  const allActions: ActionItem[] = React.useMemo(() => {
    if (effectiveActions && effectiveActions.length > 0) {
      return effectiveActions.filter(a => !a.hidden);
    }
    const primList = primary ? (Array.isArray(primary) ? primary : [primary]) : [];
    return [...primList, ...secondary].filter(a => !a.hidden);
  }, [effectiveActions, primary, secondary]);

  if (allActions.length === 0) {
    return null;
  }

  // 移动端最多展示 1 个 inline 按钮，桌面端最多展示 maxInline 个
  const limit = isMobile ? 1 : maxInline;
  const inlineItems = allActions.slice(0, limit);
  const dropdownItems = allActions.slice(limit);

  const menuItems: MenuProps['items'] = dropdownItems.map((item) => {
    const conf = item.confirm || item.popconfirm;
    const content = (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {item.icon}
        <span>{item.label}</span>
      </span>
    );

    if (conf) {
      return {
        key: item.key,
        danger: item.danger,
        disabled: item.disabled,
        label: (
          <Popconfirm
            title={conf.title}
            description={conf.description}
            okText={conf.okText || '确定'}
            cancelText={conf.cancelText || '取消'}
            onConfirm={(e) => {
              e?.stopPropagation();
              if (conf.onConfirm) {
                conf.onConfirm();
              } else {
                item.onClick?.();
              }
            }}
          >
            <div onClick={(e) => e.stopPropagation()}>{content}</div>
          </Popconfirm>
        ),
      };
    }

    return {
      key: item.key,
      danger: item.danger,
      disabled: item.disabled,
      icon: item.icon,
      label: item.label,
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        item.onClick?.();
      },
    };
  });

  return (
    <Space
      size={4}
      className="admin-table-actions"
      onClick={(e) => e.stopPropagation()}
      style={{ whiteSpace: 'nowrap' }}
    >
      {inlineItems.map((item) => {
        const conf = item.confirm || item.popconfirm;
        const btn = (
          <Button
            key={item.key}
            type="link"
            size={size}
            danger={item.danger}
            disabled={item.disabled}
            icon={item.icon}
            onClick={(e) => {
              e.stopPropagation();
              if (!conf) {
                item.onClick?.();
              }
            }}
            className="admin-table-action-btn"
          >
            {item.label}
          </Button>
        );

        if (conf) {
          return (
            <Popconfirm
              key={item.key}
              title={conf.title}
              description={conf.description}
              okText={conf.okText || '确定'}
              cancelText={conf.cancelText || '取消'}
              onConfirm={(e) => {
                e?.stopPropagation();
                if (conf.onConfirm) {
                  conf.onConfirm();
                } else {
                  item.onClick?.();
                }
              }}
            >
              {btn}
            </Popconfirm>
          );
        }

        return btn;
      })}

      {dropdownItems.length > 0 && (
        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
          <Button
            type="link"
            size={size}
            className="admin-table-action-more"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '0 4px' }}
          >
            {dropdownTriggerText || (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                {isMobile ? <EllipsisOutlined style={{ fontSize: 16 }} /> : <>更多<DownOutlined style={{ fontSize: 9 }} /></>}
              </span>
            )}
          </Button>
        </Dropdown>
      )}
    </Space>
  );
};

export default TableActions;
