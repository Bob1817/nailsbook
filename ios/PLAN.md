# NailBook iOS 原生应用开发计划

## 项目概述

将 NailBook 美甲师预约管理系统的客户端和美甲师端功能整合为一个 iOS 原生应用（SwiftUI, iOS 16+），用户登录后根据角色自动切换界面。

---

## 一、技术栈决策

| 项目 | 选型 | 理由 |
|------|------|------|
| UI 框架 | SwiftUI | 现代声明式 UI，开发效率高 |
| 最低版本 | iOS 16 | 覆盖 ~95% 设备，可用 NavigationStack/Observable 等特性 |
| 网络层 | URLSession + async/await | 原生方案，无第三方依赖 |
| 实时通信 | Socket.IO-Client-Swift | 与后端 Socket.IO 网关对接 |
| 状态管理 | @Observable (iOS 17 回退 @ObservableObject) | 轻量，适合 Feature-first 架构 |
| 本地存储 | Keychain (token) + UserDefaults (偏好) | Token 安全存储，少量配置本地化 |
| 图片缓存 | 自实现 AsyncImage + NSCache | 轻量，满足需求 |
| 推送 | APNs + FirebaseMessaging | 与现有 FCM 后端对接 |

---

## 二、项目结构

```
NailBook/
├── NailBook.xcodeproj
├── NailBook/
│   ├── App/
│   │   ├── NailBookApp.swift          # @main 入口
│   │   ├── AppState.swift             # 全局状态（角色、认证）
│   │   └── RootView.swift             # 路由根视图
│   ├── Core/
│   │   ├── Network/
│   │   │   ├── APIClient.swift        # 统一 HTTP 客户端
│   │   │   ├── APIError.swift         # 错误类型
│   │   │   ├── Endpoint.swift         # 接口定义枚举
│   │   │   └── TokenManager.swift     # JWT 存储与刷新
│   │   ├── Socket/
│   │   │   └── ChatSocketManager.swift # Socket.IO 管理
│   │   ├── DesignSystem/
│   │   │   ├── Colors.swift           # DT/ET 色彩系统
│   │   │   ├── Typography.swift       # 字体规范
│   │   │   ├── Spacing.swift          # 间距系统
│   │   │   ├── Components.swift       # 通用组件
│   │   │   └── Extensions.swift       # View 扩展
│   │   └── Utils/
│   │       ├── ImagePicker.swift      # 图片选择
│   │       ├── OSSImageProcessor.swift # OSS 图片 URL 处理
│   │       └── RegionData.swift       # 省市区数据
│   ├── Features/
│   │   ├── Auth/
│   │   │   ├── LoginView.swift
│   │   │   ├── RegisterView.swift
│   │   │   ├── ForgotPasswordView.swift
│   │   │   └── AuthViewModel.swift
│   │   ├── Client/
│   │   │   ├── Home/
│   │   │   │   ├── ClientHomeView.swift
│   │   │   │   └── ClientHomeViewModel.swift
│   │   │   ├── Works/
│   │   │   │   ├── WorksListView.swift
│   │   │   │   ├── WorkDetailView.swift
│   │   │   │   ├── WorksViewModel.swift
│   │   │   │   ├── LikesView.swift
│   │   │   │   └── FavoritesView.swift
│   │   │   ├── Designs/
│   │   │   │   ├── DesignsListView.swift
│   │   │   │   ├── DesignDetailView.swift
│   │   │   │   ├── CreateDesignView.swift
│   │   │   │   └── DesignsViewModel.swift
│   │   │   ├── Orders/
│   │   │   │   ├── OrdersListView.swift
│   │   │   │   ├── OrderDetailView.swift
│   │   │   │   ├── CreateOrderView.swift
│   │   │   │   └── OrdersViewModel.swift
│   │   │   ├── Addresses/
│   │   │   │   ├── AddressesListView.swift
│   │   │   │   ├── EditAddressView.swift
│   │   │   │   └── AddressesViewModel.swift
│   │   │   └── Profile/
│   │   │       ├── ClientProfileView.swift
│   │   │       ├── EditProfileView.swift
│   │   │       ├── SettingsView.swift
│   │   │       └── ProfileViewModel.swift
│   │   ├── Technician/
│   │   │   ├── Home/
│   │   │   │   ├── TechnicianHomeView.swift
│   │   │   │   └── TechnicianHomeViewModel.swift
│   │   │   ├── Schedule/
│   │   │   │   ├── ScheduleView.swift
│   │   │   │   ├── ServiceTimeView.swift
│   │   │   │   └── ScheduleViewModel.swift
│   │   │   ├── Customers/
│   │   │   │   ├── CustomersListView.swift
│   │   │   │   ├── CustomerDetailView.swift
│   │   │   │   ├── TagManagementView.swift
│   │   │   │   └── CustomersViewModel.swift
│   │   │   ├── Orders/
│   │   │   │   ├── TechOrdersListView.swift
│   │   │   │   ├── TechOrderDetailView.swift
│   │   │   │   └── TechOrdersViewModel.swift
│   │   │   ├── Works/
│   │   │   │   ├── TechWorksView.swift
│   │   │   │   ├── TechWorkDetailView.swift
│   │   │   │   ├── TechWorkEditView.swift
│   │   │   │   └── TechWorksViewModel.swift
│   │   │   ├── Services/
│   │   │   │   ├── ServicesListView.swift
│   │   │   │   ├── EditServiceView.swift
│   │   │   │   └── ServicesViewModel.swift
│   │   │   └── Profile/
│   │   │       ├── TechnicianProfileView.swift
│   │   │       ├── ShopManagementView.swift
│   │   │       ├── HomeServiceSettingsView.swift
│   │   │       └── TechProfileViewModel.swift
│   │   ├── Shared/
│   │   │   ├── Chat/
│   │   │   │   ├── ConversationsView.swift
│   │   │   │   ├── ChatView.swift
│   │   │   │   ├── ChatViewModel.swift
│   │   │   │   └── MessageBubble.swift
│   │   │   └── Booking/
│   │   │       ├── BookingAvailability.swift
│   │   │       └── TimeSlotPicker.swift
│   │   └── TabBar/
│   │       ├── ClientTabView.swift
│   │       └── TechnicianTabView.swift
│   ├── Models/
│   │   ├── User.swift
│   │   ├── Order.swift
│   │   ├── NailWork.swift
│   │   ├── Design.swift
│   │   ├── Address.swift
│   │   ├── Customer.swift
│   │   ├── Conversation.swift
│   │   ├── Message.swift
│   │   ├── Service.swift
│   │   └── Subscription.swift
│   └── Resources/
│       ├── Assets.xcassets
│       └── Info.plist
```

---

## 三、实施阶段

### Phase 1: 基础框架 (Foundation)
**目标**: 可编译运行的骨架应用，包含认证和导航

1. **Xcode 项目初始化** → verify: 项目可编译
2. **Design System (色彩/字体/间距)** → verify: 预览组件正确渲染
3. **网络层 (APIClient + TokenManager)** → verify: 单元测试通过
4. **认证模块 (登录/注册/忘记密码)** → verify: 可登录获取 Token
5. **全局状态 + 路由** → verify: 登录/登出状态切换正确
6. **Tab Bar 框架** → verify: 客户/美甲师 Tab 切换

### Phase 2: 客户端核心功能 (Client Core)
**目标**: 客户端可完成浏览作品、预约、聊天

7. **首页 (美甲师卡片 + 精品作品)** → verify: 数据正确展示
8. **作品列表 + 详情 (瀑布流 + 点赞/收藏/评论)** → verify: 交互正常
9. **订单列表 + 创建 + 详情** → verify: 可创建和管理预约
10. **聊天 (会话列表 + 消息页面 + WebSocket)** → verify: 实时收发消息
11. **设计需求模块** → verify: 可创建和查看设计需求
12. **地址管理** → verify: CRUD + 设默认

### Phase 3: 美甲师端核心功能 (Technician Core)
**目标**: 美甲师端可管理订单、客户、作品

13. **美甲师首页 (行程摘要 + 待处理)** → verify: 数据正确
14. **行程管理 (周视图 + 日时间轴)** → verify: 日历交互正确
15. **订单管理 (报价/确认/完成/取消)** → verify: 状态流转正确
16. **客户管理 (列表/详情/标签/跟进)** → verify: CRUD 正常
17. **作品管理 (CRUD + 可见性/置顶/精品)** → verify: 管理操作正确
18. **服务项目管理** → verify: CRUD + 启用/停用

### Phase 4: 完善功能 (Polish)
**目标**: 覆盖次要功能，提升体验

19. **个人中心 (双角色各自的设置页)**
20. **消息页合并通知 + 聊天**
21. **推送通知 (APNs)**
22. **Deep Link 处理 (邀请链接/作品分享)**
23. **门店管理 + 上门服务设置**
24. **订阅管理展示**
25. **反馈/帮助/关于页面**

---

## 四、关键设计决策

### 4.1 双角色合一策略

- 登录后根据 `userType` (client/technician) 显示不同 TabView
- 一个账号可同时是客户和美甲师（后端支持），用 `AuthSession.role` 切换
- 切换角色不需重新登录，仅刷新 Token 和界面

### 4.2 网络层设计

```swift
// 核心 API 客户端
class APIClient {
    private let baseURL = "https://api.lunails.cn/api"
    private var accessToken: String?
    private var refreshToken: String?
    
    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T
    func upload(data: Data, filename: String, mimeType: String) async throws -> UploadResponse
    func refreshAccessToken() async throws
}
```

- 自动 Token 刷新：401 时用 refreshToken 换新 token
- 单次刷新保护：防止并发请求同时刷新
- 角色感知：根据当前角色自动切换 `/api/client` 或 `/api/technician` 前缀

### 4.3 设计系统迁移

从 Flutter DT/ET token 系统 1:1 映射到 SwiftUI：

```swift
// 色彩 (对应 Flutter DT.primary 等)
extension Color {
    static let nbPrimary = Color(hex: "FF6B8A")
    static let nbPrimaryDark = Color(hex: "E00B41")
    static let nbTextPrimary = Color(hex: "1F2230")
    static let nbBg = Color(hex: "F8F9FC")
    // ...
}

// 间距 (对应 Flutter DT.space4 等)
enum Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
}
```

### 4.4 WebSocket 聊天

使用 `Socket.IO-Client-Swift` 保持与后端一致：

```swift
// 事件对应关系
// message:send → socket.emit("message:send", data)
// message:new → socket.on("message:new") { ... }
// typing:start/stop → socket.emit("typing:start/stop")
// presence:online/offline → socket.on("presence:online/offline")
```

---

## 五、数据模型映射 (关键模型)

### ClientUser
```swift
struct ClientUser: Codable, Identifiable {
    let id: Int
    var nickname: String?
    let phone: String
    var avatarUrl: String?
    var city: String?
    var bio: String?
    let status: String
}
```

### Technician
```swift
struct Technician: Codable, Identifiable {
    let id: Int
    var name: String
    let phone: String
    var avatarUrl: String?
    var city: String?
    var serviceArea: String?
    var homeService: Bool
    var shopService: Bool
    // ...
}
```

### Order
```swift
struct Order: Codable, Identifiable {
    let id: Int
    let orderNo: String
    var status: OrderStatus
    var quotePrice: Double?
    var startTime: String
    var endTime: String
    var serviceType: String
    var isDepositPaid: Bool
    var depositAmount: Double?
    // ...
}

enum OrderStatus: String, Codable {
    case pendingQuote = "pending_quote"
    case quoted, confirmed, completed, cancelled
    case pendingHome = "pending_home"
    case pendingShop = "pending_shop"
    case inProgress = "in_progress"
}
```

---

## 六、验证标准

每个 Phase 完成后验证：

| Phase | 验证方式 |
|-------|---------|
| Phase 1 | 可登录，Token 刷新正常，角色切换正确 |
| Phase 2 | 客户可浏览作品、创建预约、收发消息 |
| Phase 3 | 美甲师可报价/确认/完成订单、管理作品和客户 |
| Phase 4 | 推送收到、Deep Link 跳转正确、所有设置页正常 |

---

## 七、依赖管理 (SPM)

| 包 | 用途 |
|----|------|
| Socket.IO-Client-Swift | WebSocket 实时通信 |
| KeychainAccess | 安全存储 Token |

仅引入必要依赖，最大化使用原生 API。

---

## 八、与现有 Flutter 应动的对齐

- API 接口完全复用后端，不新增接口
- 状态机逻辑（订单状态流）与 Flutter 一致
- 设计系统 token 值 1:1 映射
- 聊天消息类型（text/image/voice/order_card/system）完全对齐
- OSS 图片处理参数一致（resize + WebP）
