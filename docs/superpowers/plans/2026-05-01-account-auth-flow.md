# Account Auth Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a consistent account invitation, code-request, login, and registration flow across admin, technician, and client apps while keeping the development verification code fixed at `123456`.

**Architecture:** Centralize account eligibility checks in backend auth services with explicit request-code endpoints, keep `Technician.invitationCode` as the single public invite identifier, and update frontend “get code” actions to call the backend before starting countdowns. Preserve the multi-technician binding model and only tighten login/register state transitions around it.

**Tech Stack:** NestJS, Prisma, Jest, React, Vite, Ant Design, Tailwind-style utility CSS

---

## File Map

### Backend

- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/technician-auth/technician-auth.service.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/technician-auth/technician-auth.controller.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/technician-auth/dto/technician-login.dto.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/client-auth/client-auth.service.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/client-auth/client-auth.controller.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/client-auth/dto/register-by-invite.dto.ts`
- Create: `/Users/shibo/Documents/Codex/nailBook/backend/src/client-auth/dto/request-client-code.dto.ts`
- Create: `/Users/shibo/Documents/Codex/nailBook/backend/src/technician-auth/dto/request-technician-code.dto.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/technicians/technicians.service.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/client-auth/client-auth.service.spec.ts`
- Create: `/Users/shibo/Documents/Codex/nailBook/backend/src/technician-auth/technician-auth.service.spec.ts`
- Create or modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/technicians/technicians.service.spec.ts`

### Client Frontend

- Modify: `/Users/shibo/Documents/Codex/nailBook/client-frontend/src/services/auth.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/client-frontend/src/pages/Login.tsx`
- Modify if needed: `/Users/shibo/Documents/Codex/nailBook/client-frontend/src/contexts/AuthContext.tsx`

### Technician Frontend

- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/services/auth.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/Login.tsx`
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/MePage.tsx`
- Modify if needed: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/contexts/AuthContext.tsx`
- Modify if needed: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/contexts/authTypes.ts`

### Admin Frontend

- Modify if needed: `/Users/shibo/Documents/Codex/nailBook/admin-frontend/src/pages/Technicians.tsx`
- Modify if needed: `/Users/shibo/Documents/Codex/nailBook/admin-frontend/src/services/technician.ts`

---

### Task 1: Backend technician invite-code and request-code flow

**Files:**
- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/technicians/technicians.service.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/technician-auth/technician-auth.service.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/technician-auth/technician-auth.controller.ts`
- Create: `/Users/shibo/Documents/Codex/nailBook/backend/src/technician-auth/dto/request-technician-code.dto.ts`
- Test: `/Users/shibo/Documents/Codex/nailBook/backend/src/technician-auth/technician-auth.service.spec.ts`
- Test: `/Users/shibo/Documents/Codex/nailBook/backend/src/technicians/technicians.service.spec.ts`

- [ ] **Step 1: Write failing tests for technician invite-code generation and request-code eligibility**

```ts
it('creates a unique invitation code when admin creates a technician', async () => {
  prisma.technician.findUnique.mockResolvedValueOnce(null);
  prisma.technician.create.mockResolvedValueOnce({
    id: 7,
    name: '小美',
    phone: '13800138000',
    invitationCode: 'AB12CD34',
    status: 'active',
  });

  const result = await service.create({
    name: '小美',
    phone: '13800138000',
  });

  expect(result.invitationCode).toBe('AB12CD34');
  expect(prisma.technician.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      phone: '13800138000',
      invitationCode: expect.any(String),
      status: 'active',
    }),
  });
});

it('allows requesting a technician code only for invited active technicians', async () => {
  prisma.technician.findUnique.mockResolvedValueOnce({
    id: 7,
    phone: '13800138000',
    invitationCode: 'AB12CD34',
    status: 'active',
  });

  await expect(service.requestCode('13800138000')).resolves.toEqual({
    codeSent: true,
    devCode: '123456',
  });
});

it('rejects requesting a technician code for an unknown phone', async () => {
  prisma.technician.findUnique.mockResolvedValueOnce(null);

  await expect(service.requestCode('13800138009')).rejects.toThrow(
    new UnauthorizedException('该账号未被邀请，无法登录'),
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/shibo/Documents/Codex/nailBook/backend && npm test -- --runInBand src/technician-auth/technician-auth.service.spec.ts src/technicians/technicians.service.spec.ts`

Expected: FAIL because `requestCode` or the new spec files do not exist yet.

- [ ] **Step 3: Implement minimal technician request-code flow and keep invitationCode unique**

```ts
// backend/src/technician-auth/dto/request-technician-code.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class RequestTechnicianCodeDto {
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;
}
```

```ts
// backend/src/technician-auth/technician-auth.service.ts
async requestCode(phone: string) {
  const technician = await this.prisma.technician.findUnique({
    where: { phone },
  });

  if (!technician) {
    throw new UnauthorizedException('该账号未被邀请，无法登录');
  }

  if (technician.status === 'suspended') {
    throw new UnauthorizedException('账号已被禁用');
  }

  return {
    codeSent: true,
    devCode: '123456',
  };
}
```

```ts
// backend/src/technician-auth/technician-auth.controller.ts
@Post('request-code')
async requestCode(@Body() body: RequestTechnicianCodeDto) {
  return this.technicianAuthService.requestCode(body.phone);
}
```

- [ ] **Step 4: Run the focused backend technician tests**

Run: `cd /Users/shibo/Documents/Codex/nailBook/backend && npm test -- --runInBand src/technician-auth/technician-auth.service.spec.ts src/technicians/technicians.service.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add backend/src/technician-auth backend/src/technicians
git commit -m "feat: enforce technician invite eligibility for code requests"
```

### Task 2: Backend client login/register eligibility flow

**Files:**
- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/client-auth/client-auth.service.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/client-auth/client-auth.controller.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/client-auth/dto/register-by-invite.dto.ts`
- Create: `/Users/shibo/Documents/Codex/nailBook/backend/src/client-auth/dto/request-client-code.dto.ts`
- Test: `/Users/shibo/Documents/Codex/nailBook/backend/src/client-auth/client-auth.service.spec.ts`

- [ ] **Step 1: Write failing tests for client login precheck, register precheck, and invite-code-first registration**

```ts
it('rejects requesting a client login code when the phone is not registered', async () => {
  prisma.clientUser.findUnique.mockResolvedValueOnce(null);

  await expect(service.requestLoginCode('13800138001')).rejects.toThrow(
    new UnauthorizedException('该手机号码还未注册，请先注册后再登录'),
  );
});

it('rejects requesting a client login code when the user has no active bindings', async () => {
  prisma.clientUser.findUnique.mockResolvedValueOnce({
    id: 11,
    phone: '13800138001',
    status: 'active',
    bindings: [],
  });

  await expect(service.requestLoginCode('13800138001')).rejects.toThrow(
    new UnauthorizedException('该账号尚未绑定美甲师，请先通过邀请码注册/绑定'),
  );
});

it('rejects requesting a client register code for an invalid invite code', async () => {
  prisma.technician.findFirst.mockResolvedValueOnce(null);

  await expect(
    service.requestRegisterCode('13800138001', 'BADCODE'),
  ).rejects.toThrow(
    new NotFoundException('该邀请码无效，请跟您的美甲师确认后再注册'),
  );
});

it('registers by invite code authority instead of trusting techId', async () => {
  prisma.technician.findFirst.mockResolvedValueOnce({
    id: 7,
    name: '小美',
    phone: '13800138000',
    status: 'active',
    invitationCode: 'AB12CD34',
  });

  await service.registerByInvite({
    phone: '13800138001',
    code: '123456',
    techId: 999,
    inviteCode: 'AB12CD34',
  });

  expect(prisma.clientTechBinding.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      techId: 7,
      inviteCode: 'AB12CD34',
    }),
  });
});
```

- [ ] **Step 2: Run the client auth tests to verify RED**

Run: `cd /Users/shibo/Documents/Codex/nailBook/backend && npm test -- --runInBand src/client-auth/client-auth.service.spec.ts`

Expected: FAIL with missing `requestLoginCode` / `requestRegisterCode` or old expectations.

- [ ] **Step 3: Implement explicit client precheck methods and invite-code-first lookup**

```ts
// backend/src/client-auth/dto/request-client-code.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestClientLoginCodeDto {
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;
}

export class RequestClientRegisterCodeDto {
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: '邀请码不能为空' })
  inviteCode: string;
}
```

```ts
// backend/src/client-auth/client-auth.service.ts
async requestLoginCode(phone: string) {
  const client = await this.prisma.clientUser.findUnique({
    where: { phone },
    include: {
      bindings: {
        where: { status: 'active' },
      },
    },
  });

  if (!client) {
    throw new UnauthorizedException('该手机号码还未注册，请先注册后再登录');
  }

  if (client.status !== 'active') {
    throw new UnauthorizedException('账号已被禁用');
  }

  if (client.bindings.length === 0) {
    throw new UnauthorizedException('该账号尚未绑定美甲师，请先通过邀请码注册/绑定');
  }

  return { codeSent: true, devCode: '123456' };
}

async requestRegisterCode(phone: string, inviteCode: string) {
  this.validateCode('123456');
  await this.findTechnicianByInviteCodeStrict(inviteCode);
  return { codeSent: true, devCode: '123456' };
}
```

```ts
// backend/src/client-auth/client-auth.service.ts
private async findTechnicianByInviteCodeStrict(inviteCode: string) {
  const technician = await this.prisma.technician.findFirst({
    where: {
      invitationCode: inviteCode,
      status: 'active',
    },
  });

  if (!technician) {
    throw new NotFoundException('该邀请码无效，请跟您的美甲师确认后再注册');
  }

  return technician;
}
```

- [ ] **Step 4: Expose the new endpoints and update registration to resolve technician by inviteCode**

```ts
// backend/src/client-auth/client-auth.controller.ts
@Post('request-login-code')
async requestLoginCode(@Body() body: RequestClientLoginCodeDto) {
  return this.clientAuthService.requestLoginCode(body.phone);
}

@Post('request-register-code')
async requestRegisterCode(@Body() body: RequestClientRegisterCodeDto) {
  return this.clientAuthService.requestRegisterCode(body.phone, body.inviteCode);
}
```

```ts
// backend/src/client-auth/client-auth.service.ts
const technician = await this.findTechnicianByInviteCodeStrict(dto.inviteCode);
```

- [ ] **Step 5: Run the focused client auth tests**

Run: `cd /Users/shibo/Documents/Codex/nailBook/backend && npm test -- --runInBand src/client-auth/client-auth.service.spec.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add backend/src/client-auth
git commit -m "feat: add client code-request eligibility flow"
```

### Task 3: Technician frontend login and Me page invite display

**Files:**
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/services/auth.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/Login.tsx`
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/MePage.tsx`
- Modify if needed: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/contexts/authTypes.ts`

- [ ] **Step 1: Add a failing UI-facing service expectation**

```ts
// define the API contract to consume before touching the page
export interface RequestCodeResponse {
  codeSent: boolean;
  devCode: string;
}
```

Document the target behavior in code comments or a minimal service-level assertion:

```ts
// authService.requestCode('13800138000') should POST /auth/request-code
```

- [ ] **Step 2: Run the technician frontend build to capture baseline**

Run: `cd /Users/shibo/Documents/Codex/nailBook/technician-frontend && npm run build`

Expected: PASS before changes

- [ ] **Step 3: Implement requestCode in the technician auth service**

```ts
export interface RequestCodeResponse {
  codeSent: boolean;
  devCode: string;
}

requestCode: async (phone: string): Promise<RequestCodeResponse> => {
  const response = await api.post<RequestCodeResponse>('/auth/request-code', {
    phone,
  });
  return response.data;
},
```

- [ ] **Step 4: Update the technician login page so countdown starts only after backend success**

```tsx
const handleSendCode = async () => {
  if (!phone || phone.length !== 11) {
    setError('请输入正确的手机号');
    return;
  }

  try {
    setError('');
    await authService.requestCode(phone);
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  } catch (err: any) {
    setError(err.response?.data?.message || '获取验证码失败，请稍后重试');
  }
};
```

- [ ] **Step 5: Show invitationCode on the technician Me page and use it for share link data**

```tsx
<div className="rounded-2xl bg-white p-4">
  <p className="text-sm text-gray-500">我的邀请码</p>
  <p className="mt-1 text-lg font-semibold text-[#111827]">
    {technician?.invitationCode || '-'}
  </p>
</div>
```

```ts
const shareLink = technician?.invitationCode
  ? `${window.location.origin}/invite?invite_code=${technician.invitationCode}`
  : '';
```

- [ ] **Step 6: Run technician frontend build**

Run: `cd /Users/shibo/Documents/Codex/nailBook/technician-frontend && npm run build`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add technician-frontend/src/services/auth.ts technician-frontend/src/pages/Login.tsx technician-frontend/src/pages/MePage.tsx technician-frontend/src/contexts
git commit -m "feat: wire technician code requests and invite display"
```

### Task 4: Client frontend login/register flow and invite-code handling

**Files:**
- Modify: `/Users/shibo/Documents/Codex/nailBook/client-frontend/src/services/auth.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/client-frontend/src/pages/Login.tsx`
- Modify if needed: `/Users/shibo/Documents/Codex/nailBook/client-frontend/src/contexts/AuthContext.tsx`

- [ ] **Step 1: Add the service contracts for client request-code endpoints**

```ts
export interface RequestCodeResponse {
  codeSent: boolean;
  devCode: string;
}

async requestLoginCode(phone: string): Promise<RequestCodeResponse> {
  const response = await api.post('/auth/request-login-code', { phone });
  return response.data;
}

async requestRegisterCode(phone: string, inviteCode: string): Promise<RequestCodeResponse> {
  const response = await api.post('/auth/request-register-code', {
    phone,
    inviteCode,
  });
  return response.data;
}
```

- [ ] **Step 2: Run the client frontend build to capture baseline**

Run: `cd /Users/shibo/Documents/Codex/nailBook/client-frontend && npm run build`

Expected: PASS before changes

- [ ] **Step 3: Update the client login page get-code handler to branch by mode**

```tsx
const handleSendCode = async () => {
  if (!phone || phone.length !== 11) {
    setError('请输入正确的手机号');
    return;
  }

  try {
    setError('');

    if (isInviteMode) {
      await authService.requestRegisterCode(phone, inviteCode!);
    } else if (isNewUser) {
      if (!inviteCodeInput.trim()) {
        setError('请输入美甲师邀请码');
        return;
      }
      await authService.requestRegisterCode(phone, inviteCodeInput.trim());
    } else {
      await authService.requestLoginCode(phone);
    }

    setCountdown(60);
  } catch (err: any) {
    setError(err.response?.data?.message || '获取验证码失败，请重试');
  }
};
```

- [ ] **Step 4: Tighten registration error copy and invite-code handling**

```tsx
if (!foundTechnician && !isInviteMode) {
  setError('该邀请码无效，请跟您的美甲师确认后再注册');
  setLoading(false);
  return;
}
```

```tsx
{isInviteMode
  ? '您正在接受美甲师的邀请，注册后即可享受服务'
  : isNewUser
  ? '请输入邀请码完成注册'
  : '登录后，继续预约你的美甲服务'}
```

Use the URL `invite_code` directly in invite mode and do not expose a second invite input there.

- [ ] **Step 5: Run the client frontend build**

Run: `cd /Users/shibo/Documents/Codex/nailBook/client-frontend && npm run build`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add client-frontend/src/services/auth.ts client-frontend/src/pages/Login.tsx client-frontend/src/contexts
git commit -m "feat: enforce client request-code eligibility flow"
```

### Task 5: End-to-end verification and admin surface cleanup

**Files:**
- Modify if needed: `/Users/shibo/Documents/Codex/nailBook/admin-frontend/src/pages/Technicians.tsx`
- Modify if needed: `/Users/shibo/Documents/Codex/nailBook/admin-frontend/src/services/technician.ts`

- [ ] **Step 1: Verify admin list/detail still exposes invitationCode clearly**

Ensure the existing columns and detail modal still render:

```tsx
{ title: '邀请码', dataIndex: 'invitationCode', key: 'invitationCode' }
```

If wording is ambiguous, update labels to “邀请码 / 邀请 ID” only if needed to match product copy.

- [ ] **Step 2: Run backend focused tests**

Run: `cd /Users/shibo/Documents/Codex/nailBook/backend && npm test -- --runInBand src/technician-auth/technician-auth.service.spec.ts src/technicians/technicians.service.spec.ts src/client-auth/client-auth.service.spec.ts`

Expected: PASS

- [ ] **Step 3: Run all three frontend builds**

Run: `cd /Users/shibo/Documents/Codex/nailBook/admin-frontend && npm run build`

Expected: PASS

Run: `cd /Users/shibo/Documents/Codex/nailBook/technician-frontend && npm run build`

Expected: PASS

Run: `cd /Users/shibo/Documents/Codex/nailBook/client-frontend && npm run build`

Expected: PASS

- [ ] **Step 4: Verify the real HTTP flows against the backend**

Run:

```bash
curl -s -X POST http://localhost:3000/api/technician/auth/request-code \
  -H 'Content-Type: application/json' \
  -d '{"phone":"13800138000"}'
```

Expected: `{"codeSent":true,"devCode":"123456"}`

Run:

```bash
curl -s -X POST http://localhost:3000/api/client/auth/request-login-code \
  -H 'Content-Type: application/json' \
  -d '{"phone":"13800138001"}'
```

Expected: `{"codeSent":true,"devCode":"123456"}`

Run:

```bash
curl -s -X POST http://localhost:3000/api/client/auth/request-register-code \
  -H 'Content-Type: application/json' \
  -d '{"phone":"13800138009","inviteCode":"BADCODE"}'
```

Expected: error containing `该邀请码无效，请跟您的美甲师确认后再注册`

- [ ] **Step 5: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add admin-frontend backend client-frontend technician-frontend
git commit -m "feat: complete invitation-driven account auth flow"
```

---

## Self-Review

- Spec coverage:
  - Technician creation and invitation code generation: Task 1
  - Technician request-code eligibility: Task 1
  - Client login/register request-code eligibility: Task 2 and Task 4
  - Invite-code-first registration: Task 2
  - Technician Me page invite display and share link: Task 3
  - Real verification and build checks: Task 5
- Placeholder scan:
  - No `TODO`, `TBD`, or “implement later” text remains.
- Type consistency:
  - New DTO names are fixed as `RequestTechnicianCodeDto`, `RequestClientLoginCodeDto`, and `RequestClientRegisterCodeDto`.
  - Response contract for code request is consistently `{ codeSent: true, devCode: '123456' }`.
