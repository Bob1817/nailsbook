# Admin Technician Operations & First-Login Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin delete/disable/reset operations for technicians, and force first-login password change after admin creation or reset.

**Architecture:** Add `mustChangePassword` boolean to Technician schema. Admin creates accounts as `active` (not `inactive`). Login returns `mustChangePassword` flag; technician frontend intercepts and shows set-password screen before entering the app.

**Tech Stack:** NestJS, Prisma, React (Ant Design admin), React (Tailwind technician frontend)

**Spec:** `docs/superpowers/specs/2026-06-02-admin-technician-ops-and-first-login-password-design.md`

---

### Task 1: Add `mustChangePassword` field to Prisma schema and migrate

**Files:**
- Modify: `backend/prisma/schema.prisma:59-96`

- [ ] **Step 1: Add field to schema**

In `backend/prisma/schema.prisma`, add `mustChangePassword` to the `Technician` model after `tokenVersion` (line 64):

```prisma
  tokenVersion          Int                     @default(0)
  mustChangePassword    Boolean                 @default(false)
```

- [ ] **Step 2: Generate and apply migration**

Run: `cd backend && npx prisma migrate dev --name add-must-change-password`

Expected: Migration created, dev.db updated.

- [ ] **Step 3: Verify field exists**

Run: `cd backend && npx prisma studio` or check `backend/prisma/dev.db` to confirm the column exists with default `false`.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(backend): add mustChangePassword field to Technician model"
```

---

### Task 2: Modify admin create technician — set status to `active` and `mustChangePassword: true`

**Files:**
- Modify: `backend/src/technicians/technicians.service.ts:103-127`

- [ ] **Step 1: Update create method**

In `backend/src/technicians/technicians.service.ts`, change the `create` method (lines 117-124):

Replace:
```typescript
    const technician = await this.prisma.technician.create({
      data: {
        ...dto,
        invitationCode,
        passwordHash: defaultPasswordHash,
        status: 'inactive',
      },
    });
```

With:
```typescript
    const technician = await this.prisma.technician.create({
      data: {
        ...dto,
        invitationCode,
        passwordHash: defaultPasswordHash,
        status: 'active',
        mustChangePassword: true,
      },
    });
```

- [ ] **Step 2: Verify by reading the file**

Read `backend/src/technicians/technicians.service.ts` lines 103-127 to confirm the change is correct.

- [ ] **Step 3: Commit**

```bash
git add backend/src/technicians/technicians.service.ts
git commit -m "feat(backend): admin-created technicians are active with mustChangePassword"
```

---

### Task 3: Modify admin reset password — set `mustChangePassword: true`

**Files:**
- Modify: `backend/src/technicians/technicians.service.ts:168-186`

- [ ] **Step 1: Update resetPassword method**

In `backend/src/technicians/technicians.service.ts`, change the `resetPassword` method.

Replace:
```typescript
    await this.prisma.technician.update({
      where: { id: technicianId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
```

With:
```typescript
    await this.prisma.technician.update({
      where: { id: technicianId },
      data: { passwordHash, tokenVersion: { increment: 1 }, mustChangePassword: true },
    });
```

Also remove the guard that rejects if `passwordHash` is empty (lines 173-175), since new admin-created accounts will always have a hash:

Replace:
```typescript
    if (!technician.passwordHash) {
      throw new BadRequestException('该账号尚未激活，请生成邀请密钥让美甲师注册激活');
    }
```

With:
```typescript
    if (technician.status === 'deleted') {
      throw new BadRequestException('该账号已删除，无法重置密码');
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/technicians/technicians.service.ts
git commit -m "feat(backend): reset password sets mustChangePassword and blocks deleted accounts"
```

---

### Task 4: Add delete and disable endpoints to backend

**Files:**
- Modify: `backend/src/technicians/technicians.service.ts`
- Modify: `backend/src/technicians/technicians.controller.ts`

- [ ] **Step 1: Add deleteTechnician method to service**

Add after the `updateStatus` method (after line 136) in `backend/src/technicians/technicians.service.ts`:

```typescript
  async deleteTechnician(id: number) {
    const technician = await this.prisma.technician.findUnique({ where: { id } });
    if (!technician) throw new NotFoundException('美甲师不存在');
    if (technician.status === 'deleted') return technician;

    return this.prisma.technician.update({
      where: { id },
      data: { status: 'deleted' },
    });
  }

  async disableTechnician(id: number) {
    const technician = await this.prisma.technician.findUnique({ where: { id } });
    if (!technician) throw new NotFoundException('美甲师不存在');
    if (technician.status === 'suspended') return technician;

    return this.prisma.technician.update({
      where: { id },
      data: { status: 'suspended' },
    });
  }
```

- [ ] **Step 2: Add DELETE and PATCH /disable endpoints to controller**

In `backend/src/technicians/technicians.controller.ts`, add `Delete` to the imports (line 5):

Replace:
```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
```

With:
```typescript
import {
  Controller,
  Delete,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
```

Add these two endpoint methods before the closing `}` of the class (before line 175):

```typescript
  @Delete(':id')
  @Permissions('technician.delete')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({
    module: 'technician',
    action: 'delete',
    targetType: 'technician',
  })
  @ApiOperation({ summary: '删除美甲师（软删除）' })
  @ApiParam({ name: 'id', type: String, description: '美甲师ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '美甲师不存在' })
  remove(@Param('id') id: string) {
    return this.techniciansService.deleteTechnician(parseInt(id, 10));
  }

  @Patch(':id/disable')
  @Permissions('technician.disable')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({
    module: 'technician',
    action: 'disable',
    targetType: 'technician',
  })
  @ApiOperation({ summary: '禁用美甲师' })
  @ApiParam({ name: 'id', type: String, description: '美甲师ID' })
  @ApiResponse({ status: 200, description: '禁用成功' })
  @ApiResponse({ status: 404, description: '美甲师不存在' })
  disable(@Param('id') id: string) {
    return this.techniciansService.disableTechnician(parseInt(id, 10));
  }
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/technicians/technicians.service.ts backend/src/technicians/technicians.controller.ts
git commit -m "feat(backend): add delete and disable endpoints for technicians"
```

---

### Task 5: Add `technician:delete` permission to seed

**Files:**
- Modify: `backend/scripts/seed.ts:49-67`

- [ ] **Step 1: Add permission to seed**

In `backend/scripts/seed.ts`, add a new permission entry after the `technician:disable` line (after line 54):

```typescript
    { name: '美甲师删除', code: 'technician:delete', module: 'technician', action: 'delete' },
```

- [ ] **Step 2: Re-run seed**

Run: `cd backend && npx ts-node scripts/seed.ts`

Expected: The new permission is created and assigned to the `super_admin` role.

- [ ] **Step 3: Commit**

```bash
git add backend/scripts/seed.ts
git commit -m "feat(backend): add technician:delete permission to seed"
```

---

### Task 6: Modify technician login — block deleted/suspended, return `mustChangePassword`

**Files:**
- Modify: `backend/src/technician-auth/technician-auth.service.ts:314-335`

- [ ] **Step 1: Update login method**

In `backend/src/technician-auth/technician-auth.service.ts`, replace the `login` method (lines 314-335):

```typescript
  async login(phone: string, password: string) {
    const technician = await this.findTechnicianByPhone(phone);

    if (!technician) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    if (technician.status === 'deleted') {
      throw new UnauthorizedException('账号已被删除');
    }

    if (technician.status === 'suspended') {
      throw new UnauthorizedException('账号已被禁用');
    }

    if (!technician.passwordHash) {
      throw new UnauthorizedException('账号未设置密码，请联系管理员');
    }

    const valid = await bcrypt.compare(password, technician.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const result = await this.issueTokens(technician.id, technician.phone);
    return {
      ...result,
      mustChangePassword: technician.mustChangePassword,
    };
  }
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/technician-auth/technician-auth.service.ts
git commit -m "feat(backend): login blocks deleted/suspended and returns mustChangePassword"
```

---

### Task 7: Add `set-password` endpoint for technicians

**Files:**
- Create: `backend/src/technician-auth/dto/set-password.dto.ts`
- Modify: `backend/src/technician-auth/technician-auth.service.ts`
- Modify: `backend/src/technician-auth/technician-auth.controller.ts`

- [ ] **Step 1: Create SetPasswordDto**

Create `backend/src/technician-auth/dto/set-password.dto.ts`:

```typescript
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/password.validator';

export class SetPasswordDto {
  @ApiProperty({ description: '新密码（至少 8 位，含字母和数字）' })
  @IsString()
  @IsStrongPassword()
  newPassword: string;
}
```

- [ ] **Step 2: Add setPassword method to service**

Add after the `changePassword` method (after line 374) in `backend/src/technician-auth/technician-auth.service.ts`:

```typescript
  async setPassword(technicianId: number, newPassword: string) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
    });

    if (!technician) {
      throw new UnauthorizedException('美甲师不存在');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.technician.update({
      where: { id: technicianId },
      data: { passwordHash, tokenVersion: { increment: 1 }, mustChangePassword: false },
    });

    return this.issueTokens(technician.id, technician.phone);
  }
```

- [ ] **Step 3: Add set-password endpoint to controller**

Add import for `SetPasswordDto` at the top of `backend/src/technician-auth/technician-auth.controller.ts`:

Add after the existing dto imports (after line 28):
```typescript
import { SetPasswordDto } from './dto/set-password.dto';
```

Add the endpoint method after the `changePassword` method (after line 156):

```typescript
  @Post('set-password')
  @UseGuards(TechnicianJwtAuthGuard)
  @ApiOperation({ summary: '首次登录设置密码' })
  @ApiBody({ type: SetPasswordDto })
  @ApiResponse({ status: 200, description: '密码设置成功，返回新 token' })
  @ApiResponse({ status: 401, description: '未授权' })
  async setPassword(
    @Req() request: { user: { technicianId: number } },
    @Body() body: SetPasswordDto,
  ) {
    return this.technicianAuthService.setPassword(
      request.user.technicianId,
      body.newPassword,
    );
  }
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/technician-auth/dto/set-password.dto.ts backend/src/technician-auth/technician-auth.service.ts backend/src/technician-auth/technician-auth.controller.ts
git commit -m "feat(backend): add set-password endpoint for first-login password change"
```

---

### Task 8: Admin frontend — add delete and disable API methods

**Files:**
- Modify: `admin-frontend/src/services/technician.ts`

- [ ] **Step 1: Add delete and disable methods**

In `admin-frontend/src/services/technician.ts`, add after the `resetPassword` method (after line 94):

```typescript
  deleteTechnician: async (id: number): Promise<void> => {
    await api.delete(`/technicians/${id}`);
  },

  disableTechnician: async (id: number): Promise<Technician> => {
    const response = await api.patch(`/technicians/${id}/disable`);
    return response.data;
  },
```

- [ ] **Step 2: Commit**

```bash
git add admin-frontend/src/services/technician.ts
git commit -m "feat(admin): add delete and disable technician API methods"
```

---

### Task 9: Admin frontend — update technician list with delete/disable/reset actions

**Files:**
- Modify: `admin-frontend/src/pages/Technicians.tsx`

- [ ] **Step 1: Add delete handler**

Add after `handleStatusChange` (after line 125) in `admin-frontend/src/pages/Technicians.tsx`:

```typescript
  const handleDelete = async (id: number) => {
    try {
      await technicianService.deleteTechnician(id);
      message.success('删除成功');
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '删除失败');
    }
  };

  const handleDisable = async (id: number) => {
    try {
      await technicianService.disableTechnician(id);
      message.success('禁用成功');
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '禁用失败');
    }
  };

  const handleResetFromList = async (id: number) => {
    try {
      const result = await technicianService.resetPassword(id);
      Modal.success({
        title: '密码重置成功',
        content: (
          <div>
            <p>临时密码：<code style={{ fontSize: 16, letterSpacing: 1 }}>{result.tempPassword}</code></p>
            <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>请将此密码发送给美甲师，美甲师下次登录时需重新设置密码。</p>
          </div>
        ),
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '重置失败');
    }
  };
```

- [ ] **Step 2: Update status column to include `deleted` tag**

Replace the status render (lines 172-184):

```typescript
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'green',
          inactive: 'orange',
          suspended: 'red',
          deleted: 'default',
        };
        const textMap: Record<string, string> = {
          active: '活跃',
          inactive: '未激活',
          suspended: '已禁用',
          deleted: '已删除',
        };
        return <Tag color={colorMap[status]}>{textMap[status] || status}</Tag>;
      },
```

- [ ] **Step 3: Update action column with delete/disable/reset buttons**

Replace the action column render (lines 196-216):

```typescript
      render: (_: unknown, record: Technician) => (
        <Space>
          {record.status !== 'deleted' && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          <Button type="link" size="small" onClick={() => { setSelectedTechnician(record); setDetailVisible(true); }}>
            详情
          </Button>
          {record.status === 'active' && (
            <>
              <Popconfirm title="确定要禁用该美甲师吗？" description="禁用后该账号将无法登录。" onConfirm={() => handleDisable(record.id)}>
                <Button type="link" size="small" danger>禁用</Button>
              </Popconfirm>
              <Popconfirm title="确定要重置该美甲师的密码？" description="重置后美甲师需要在下次登录时重新设置密码。" onConfirm={() => handleResetFromList(record.id)}>
                <Button type="link" size="small">重置密码</Button>
              </Popconfirm>
            </>
          )}
          {record.status === 'suspended' && (
            <Popconfirm title="确定要启用该美甲师吗？" onConfirm={() => handleStatusChange(record.id, 'active')}>
              <Button type="link" size="small">启用</Button>
            </Popconfirm>
          )}
          {record.status !== 'deleted' && (
            <Popconfirm title="确定要删除该美甲师账号？" description="删除后该账号将无法登录，但历史数据将被保留。" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
```

- [ ] **Step 4: Update status filter options**

Replace the status filter options (lines 237-241):

```typescript
              options={[
                { value: 'active', label: '活跃' },
                { value: 'inactive', label: '未激活' },
                { value: 'suspended', label: '已禁用' },
                { value: 'deleted', label: '已删除' },
              ]}
```

- [ ] **Step 5: Commit**

```bash
git add admin-frontend/src/pages/Technicians.tsx
git commit -m "feat(admin): add delete, disable, and reset password actions to technician list"
```

---

### Task 10: Admin frontend — update edit modal (remove activation key section, keep reset)

**Files:**
- Modify: `admin-frontend/src/pages/Technicians.tsx`

- [ ] **Step 1: Remove activation key section from edit modal**

Delete the entire activation key block (lines 363-398) — the `selectedTechnician.status === 'inactive'` section that shows the "Generate Activation Key" button. This section is no longer needed since new accounts are created as `active`.

- [ ] **Step 2: Update reset password section to show for all non-deleted accounts**

Replace the condition on line 400:

```typescript
        {selectedTechnician && selectedTechnician.status !== 'deleted' && (
```

This ensures the reset password section shows for `active`, `inactive`, and `suspended` accounts (but not `deleted`).

- [ ] **Step 3: Update edit modal status dropdown to include `deleted`**

Replace the status Select options (lines 354-358):

```typescript
              options={[
                { value: 'active', label: '活跃' },
                { value: 'inactive', label: '未激活' },
                { value: 'suspended', label: '已禁用' },
                { value: 'deleted', label: '已删除' },
              ]}
```

- [ ] **Step 4: Commit**

```bash
git add admin-frontend/src/pages/Technicians.tsx
git commit -m "feat(admin): remove activation key section, update edit modal for new flow"
```

---

### Task 11: Technician frontend — update auth service to handle `mustChangePassword`

**Files:**
- Modify: `technician-frontend/src/services/auth.ts`

- [ ] **Step 1: Update AuthApiResponse to include mustChangePassword**

Replace the `AuthApiResponse` interface (lines 23-41):

```typescript
interface AuthApiResponse {
  accessToken: string;
  mustChangePassword?: boolean;
  technician: {
    id: number;
    name: string;
    phone: string;
    avatarUrl?: string;
    city?: string;
    serviceArea?: string;
    status: string;
    invitationCode?: string;
    homeService?: boolean;
    shopService?: boolean;
    shopAddresses?: ShopAddress[];
    socialMedia?: SocialMediaAccounts;
    subscription?: TechnicianSubscription | null;
    serviceItems?: Technician['serviceItems'];
  };
}
```

- [ ] **Step 2: Update AuthResponse to include mustChangePassword**

Replace the `AuthResponse` interface (lines 18-21):

```typescript
export interface AuthResponse {
  access_token: string;
  mustChangePassword: boolean;
  technician: Technician;
}
```

- [ ] **Step 3: Update login method to return mustChangePassword**

In the `login` method (lines 101-128), update the `mappedResponse` to include `mustChangePassword`:

Replace:
```typescript
    const mappedResponse: AuthResponse = {
      access_token: response.data.accessToken,
      technician: {
```

With:
```typescript
    const mappedResponse: AuthResponse = {
      access_token: response.data.accessToken,
      mustChangePassword: response.data.mustChangePassword ?? false,
      technician: {
```

- [ ] **Step 4: Add setPassword method**

Add after the `changePassword` method (after line 298):

```typescript
  setPassword: async (newPassword: string): Promise<AuthResponse> => {
    const response = await api.post<AuthApiResponse>('/auth/set-password', { newPassword });
    const mappedResponse: AuthResponse = {
      access_token: response.data.accessToken,
      mustChangePassword: false,
      technician: {
        id: response.data.technician.id,
        name: response.data.technician.name,
        email: `${response.data.technician.phone}@nailbook.local`,
        phone: response.data.technician.phone,
        avatar: response.data.technician.avatarUrl,
        status: response.data.technician.status,
        invitationCode: response.data.technician.invitationCode,
        city: response.data.technician.city,
        serviceArea: response.data.technician.serviceArea,
        homeService: response.data.technician.homeService,
        shopService: response.data.technician.shopService,
        shopAddresses: normalizeShopAddresses(response.data.technician.shopAddresses),
        socialMedia: response.data.technician.socialMedia,
        subscription: response.data.technician.subscription ?? null,
        serviceItems: response.data.technician.serviceItems,
      },
    };
    if (mappedResponse.access_token) {
      localStorage.setItem('technician_token', mappedResponse.access_token);
    }
    return mappedResponse;
  },
```

- [ ] **Step 5: Commit**

```bash
git add technician-frontend/src/services/auth.ts
git commit -m "feat(tech): update auth service to handle mustChangePassword and add setPassword"
```

---

### Task 12: Technician frontend — update AuthContext to handle `mustChangePassword`

**Files:**
- Modify: `technician-frontend/src/contexts/AuthContext.tsx`
- Modify: `technician-frontend/src/contexts/authTypes.ts`

- [ ] **Step 1: Update AuthContextType to include setPassword**

In `technician-frontend/src/contexts/authTypes.ts`, add `setPassword` to `AuthContextType` (line 138-148):

```typescript
export interface AuthContextType {
  technician: Technician | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, passwordOrCode: string) => Promise<{ mustChangePassword: boolean }>;
  register: (params: { inviteKey: string; name: string; phone: string; password: string }) => Promise<void>;
  setPassword: (newPassword: string) => Promise<void>;
  updateTechnicianStatus: (status: string) => Promise<void>;
  updateServiceType: (settings: ServiceTypeSettings) => Promise<void>;
  updateTechnicianProfile: (profile: Partial<Technician>) => Promise<void>;
  logout: () => void;
}
```

- [ ] **Step 2: Update login in AuthContext to return mustChangePassword**

In `technician-frontend/src/contexts/AuthContext.tsx`, update the `login` function (lines 74-82):

```typescript
  const login = async (phone: string, passwordOrCode: string) => {
    const response = await authService.login({ phone, password: passwordOrCode });

    localStorage.setItem('technician_token', response.access_token);
    localStorage.setItem('technician_info', JSON.stringify(response.technician));

    setToken(response.access_token);
    setTechnician(response.technician as unknown as Technician);

    return { mustChangePassword: response.mustChangePassword };
  };
```

- [ ] **Step 3: Add setPassword function to AuthContext**

Add after the `register` function (after line 95):

```typescript
  const setPassword = async (newPassword: string) => {
    const response = await authService.setPassword(newPassword);

    localStorage.setItem('technician_token', response.access_token);
    localStorage.setItem('technician_info', JSON.stringify(response.technician));

    setToken(response.access_token);
    setTechnician(response.technician as unknown as Technician);
  };
```

- [ ] **Step 4: Add setPassword to the context provider value**

Replace line 141:

```typescript
    <AuthContext.Provider value={{ technician, token, loading, login, register, setPassword, updateTechnicianStatus, updateServiceType, updateTechnicianProfile, logout }}>
```

- [ ] **Step 5: Commit**

```bash
git add technician-frontend/src/contexts/AuthContext.tsx technician-frontend/src/contexts/authTypes.ts
git commit -m "feat(tech): update AuthContext to support mustChangePassword and setPassword"
```

---

### Task 13: Technician frontend — create SetPasswordPage

**Files:**
- Create: `technician-frontend/src/pages/SetPasswordPage.tsx`

- [ ] **Step 1: Create SetPasswordPage**

Create `technician-frontend/src/pages/SetPasswordPage.tsx`:

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const SetPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setPassword } = useAuth();
  const navigate = useNavigate();

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return '密码至少 8 位';
    if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return '密码需同时包含字母和数字';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pwdErr = validatePassword(newPassword);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    setLoading(true);
    try {
      await setPassword(newPassword);
      navigate('/');
    } catch {
      setError('密码设置失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffaf9] flex items-center justify-center px-5">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-3 mb-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6889] to-[#f55684] text-xl font-bold text-white shadow-lg">
            N
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#0f1422]">NailArt 美甲师工具</h1>
            <p className="text-xs text-[#838998]">更专业的服务，更高效的管理</p>
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-[#0f1422]">设置登录密码</h2>
        <p className="mt-2 text-sm text-[#5a6475]">请设置您的登录密码，密码至少 8 位，需包含字母和数字</p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="password"
            placeholder="设置新密码（至少 8 位，含字母和数字）"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-14 w-full rounded-2xl border border-[#ece8ec] bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-[#ff7ea9]/30"
          />
          <input
            type="password"
            placeholder="确认新密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-14 w-full rounded-2xl border border-[#ece8ec] bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-[#ff7ea9]/30"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#ff636e] to-[#ff71aa] text-base font-semibold text-white shadow-lg active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? '设置中...' : '确认设置'}
          </button>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add technician-frontend/src/pages/SetPasswordPage.tsx
git commit -m "feat(tech): add SetPasswordPage for first-login password change"
```

---

### Task 14: Technician frontend — add route and update login flow

**Files:**
- Modify: `technician-frontend/src/App.tsx`
- Modify: `technician-frontend/src/pages/Login.tsx`

- [ ] **Step 1: Add SetPasswordPage route to App.tsx**

In `technician-frontend/src/App.tsx`, add lazy import after the `ForgotPassword` import (after line 14):

```typescript
const SetPasswordPage = lazy(async () => {
  const module = await import('./pages/SetPasswordPage');
  return { default: module.SetPasswordPage };
});
```

Add the route after the `/forgot-password` route (after line 87), outside the `ProtectedRoute`:

```typescript
                <Route path="/set-password" element={<SetPasswordPage />} />
```

Note: This route is outside `ProtectedRoute` because the user has a JWT but hasn't completed the password-change gate. The `SetPasswordPage` itself calls `setPassword` which requires a valid JWT.

- [ ] **Step 2: Update Login.tsx to handle mustChangePassword**

In `technician-frontend/src/pages/Login.tsx`, update the `handleLogin` function (lines 58-86).

Replace:
```typescript
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agreed) {
      setError('请阅读并同意用户协议和隐私政策');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }
    setLoading(true);
    try {
      await login(phone, password);
      const storedTechnician = localStorage.getItem('technician_info');
      if (storedTechnician) {
        const technician = JSON.parse(storedTechnician);
        if (technician.homeService === undefined && technician.shopService === undefined) {
          setShowServiceTypeModal(true);
          return;
        }
      }
      navigate('/');
    } catch (e) {
      setError(getErrorMessage(e, '登录失败，请检查手机号和密码'));
    } finally {
      setLoading(false);
    }
  };
```

With:
```typescript
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agreed) {
      setError('请阅读并同意用户协议和隐私政策');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }
    setLoading(true);
    try {
      const result = await login(phone, password);
      if (result.mustChangePassword) {
        navigate('/set-password');
        return;
      }
      const storedTechnician = localStorage.getItem('technician_info');
      if (storedTechnician) {
        const technician = JSON.parse(storedTechnician);
        if (technician.homeService === undefined && technician.shopService === undefined) {
          setShowServiceTypeModal(true);
          return;
        }
      }
      navigate('/');
    } catch (e) {
      setError(getErrorMessage(e, '登录失败，请检查手机号和密码'));
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 3: Commit**

```bash
git add technician-frontend/src/App.tsx technician-frontend/src/pages/Login.tsx
git commit -m "feat(tech): add set-password route and redirect on mustChangePassword"
```

---

### Task 15: Manual verification

- [ ] **Step 1: Start backend and admin frontend**

Run: `cd backend && npm run start:dev`
Run: `cd admin-frontend && npm run dev`

- [ ] **Step 2: Test admin create technician**

1. Log in to admin panel
2. Create a new technician with name and phone
3. Verify: technician appears in list with status "活跃" (active), not "未激活"

- [ ] **Step 3: Test admin disable technician**

1. Click "禁用" on the active technician
2. Confirm the dialog
3. Verify: status changes to "已禁用"

- [ ] **Step 4: Test admin enable technician**

1. Click "启用" on the suspended technician
2. Verify: status changes back to "活跃"

- [ ] **Step 5: Test admin reset password**

1. Click "重置密码" on an active technician
2. Confirm the dialog
3. Verify: a temp password is shown in a modal

- [ ] **Step 6: Test admin delete technician**

1. Click "删除" on a technician
2. Confirm the dialog
3. Verify: status changes to "已删除", edit button disappears

- [ ] **Step 7: Test technician first-login password change**

1. Start technician frontend: `cd technician-frontend && npm run dev`
2. Log in with the newly created technician's phone and default password `123456`
3. Verify: redirected to set-password page
4. Enter new password + confirm
5. Verify: redirected to home page
6. Log out and log in again with the new password
6. Verify: goes directly to home (no set-password redirect)

- [ ] **Step 8: Test technician login with disabled account**

1. Disable a technician from admin
2. Try to log in with that technician's phone
3. Verify: error message "账号已被禁用"

- [ ] **Step 9: Test technician login with deleted account**

1. Delete a technician from admin
2. Try to log in with that technician's phone
3. Verify: error message "账号已被删除"
