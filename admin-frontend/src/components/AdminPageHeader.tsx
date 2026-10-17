import React from 'react';
import { Typography } from 'antd';

const { Title, Text } = Typography;

interface AdminPageHeaderProps {
  title: string;
  description: string;
  extra?: React.ReactNode;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ title, description, extra }) => (
  <div className="admin-page-header">
    <div>
      <Title level={3}>{title}</Title>
      <Text type="secondary">{description}</Text>
    </div>
    {extra ? <div className="admin-page-header__extra">{extra}</div> : null}
  </div>
);

export default AdminPageHeader;
