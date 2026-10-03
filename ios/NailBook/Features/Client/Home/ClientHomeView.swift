import SwiftUI

// MARK: - Client Home View (aligned with wxapp design)

struct ClientHomeView: View {
    @State private var home: ClientHomeData?
    @State private var featuredWorks: [NailWork] = []
    @State private var loading = true
    @State private var worksLoading = true
    @State private var error: String?
    @State private var worksError: String?
    @State private var swiperIndex = 0
    @State private var navigateToOrders = false
    @State private var navigateToWorks = false
    @State private var navigateToOrderDetail: Int?
    @State private var navigateToWorkDetail: Int?
    @State private var navigateToBooking = false
    @State private var navigateToMessages = false
    @State private var navigateToShopGuidance = false
    // 从公开接口异步补齐的店铺信息（线上 latestOrder 暂无 shopName/technician/serviceType）
    @State private var orderShopName: String?
    @State private var orderShopGuidance = false

    // Timer for auto-play
    let timer = Timer.publish(every: 4, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                NBClientPageHeader(title: "OnlyNail", subtitle: "发现喜欢的款式，安排下一次美甲")
                ScrollView {
                    VStack(spacing: 0) {
                        // Hero Section - Works Swiper
                        if let error {
                            VStack(spacing: Spacing.md) {
                                Text("首页加载失败")
                                Text(error).foregroundColor(NBColors.muted)
                                Button("重试") { Task { await loadHome(); await loadWorks() } }
                                    .frame(minHeight: 44)
                            }
                            .padding()
                        } else if loading {
                            ProgressView().frame(maxWidth: .infinity, minHeight: 310)
                        } else {
                            heroSection
                        }

                        // Booking Section
                        bookingSection

                        // Featured Works
                        featuredWorksSection
                    }
                    .padding(.bottom, 100) // Tab bar space
                }
            }
            .background(NBColors.page)
            .navigationBarTitleDisplayMode(.inline)
            // onAppear：进入/切回首页与从次级页返回时刷新，同步最新预约状态
            .onAppear {
                Task {
                    await loadHome()
                    await loadWorks()
                }
            }
            .refreshable {
                await loadHome()
                await loadWorks()
            }
        }
    }

    // MARK: - Hero Section (Swiper)

    private var heroSection: some View {
        VStack(spacing: 0) {
            if featuredWorks.isEmpty && !worksLoading {
                // Placeholder when no works
                VStack(spacing: Spacing.md) {
                    Circle()
                        .fill(Color.black.opacity(0.12))
                        .frame(width: 36, height: 36)
                        .overlay(
                            Circle()
                                .fill(Color.black.opacity(0.3))
                                .frame(width: 16, height: 16)
                        )

                    Text(home?.technician != nil ? "美甲师暂未设置首页推荐" : "绑定美甲师后查看首页推荐")
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.muted)

                    Button("浏览作品") {
                        navigateToWorks = true
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(NBColors.link)
                }
                .frame(height: 310)
                .frame(maxWidth: .infinity)
                .background(NBColors.page)
                .cornerRadius(Radius.md)
                .padding(.horizontal, 20)
            } else {
                // Swiper
                ZStack(alignment: .top) {
                    TabView(selection: $swiperIndex) {
                        ForEach(Array(featuredWorks.prefix(5).enumerated()), id: \.element.id) { index, work in
                            heroWorkCard(work)
                                .tag(index)
                        }
                    }
                    .tabViewStyle(.page(indexDisplayMode: .never))
                    .frame(height: 310)
                    .onReceive(timer) { _ in
                        guard featuredWorks.count > 1 else { return }
                        withAnimation {
                            swiperIndex = (swiperIndex + 1) % min(featuredWorks.count, 5)
                        }
                    }

                    // Dots
                    if featuredWorks.count > 1 {
                        HStack(spacing: 6) {
                            ForEach(0..<min(featuredWorks.count, 5), id: \.self) { index in
                                Capsule()
                                    .fill(index == swiperIndex ? Color.white : Color.white.opacity(0.58))
                                    .frame(width: index == swiperIndex ? 12 : 3, height: 3)
                            }
                        }
                        .padding(.top, 11)
                    }
                }
                .cornerRadius(Radius.md)
                .padding(.horizontal, 20)
            }

            if worksLoading {
                ProgressView()
                    .frame(height: 310)
            }
        }
    }

    private func heroWorkCard(_ work: NailWork) -> some View {
        ZStack {
            // Image
            AsyncImage(url: URL(string: work.coverUrl ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .fill(NBColors.page)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 310)
            .clipped()

            // Overlay gradient
            VStack {
                Spacer()
                LinearGradient(
                    stops: [
                        .init(color: Color.black.opacity(0.02), location: 0),
                        .init(color: Color.black.opacity(0.40), location: 0.55),
                        .init(color: Color.black.opacity(0.76), location: 1.0)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                // 蒙版高度贴合信息区：内容 44pt + 上下各 16pt，保证信息上下间隔一致
                .frame(height: 76)
                // 说明区域贴卡片底部，对齐 wxapp hero-overlay（flex-end + padding 32rpx）
                .overlay(alignment: .bottom) {
                    HStack(alignment: .bottom) {
                        VStack(alignment: .leading, spacing: 5) {
                            Text(work.title ?? "美甲作品")
                                .font(.system(size: 16, weight: .bold))  // wxapp font-lg
                                .foregroundColor(.white)
                                .lineLimit(1)

                            if let name = work.technicianName {
                                Text(name)
                                    .font(NBFont.captionLarge)  // wxapp font-sm
                                    .foregroundColor(Color.white.opacity(0.88))
                            }
                        }

                        Spacer()

                        // CTA Button
                        Button {
                            navigateToWorkDetail = work.id
                        } label: {
                            HStack(spacing: 2) {
                                Text("查看详情")
                                    .font(NBFont.captionLarge.weight(.semibold))  // wxapp font-sm semibold
                                Text("›")
                                    .font(.system(size: 16))  // wxapp font-lg
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .frame(minHeight: 44)  // wxapp touch-min
                            .background(Color.black.opacity(0.34))
                            .cornerRadius(18)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
                }
            }
        }
        // 整卡点击跳转，与 wxapp swiper-item bindtap 行为一致
        .onTapGesture {
            navigateToWorkDetail = work.id
        }
        .cornerRadius(Radius.md)
    }

    // MARK: - Booking Section

    private var bookingSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                Text("我的预约")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(NBColors.ink)
                Spacer()
                if home?.latestOrder != nil {
                    Button("查看全部 ›") {
                        navigateToOrders = true
                    }
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(NBColors.link)
                    .padding(.vertical, 8)
                    .contentShape(Rectangle())
                }
            }

            Text(home?.latestOrder != nil ? "距离最近的一次预约" : "快速发起你的下一次美甲")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)
                .padding(.top, 3)
                .padding(.bottom, 12)

            if let order = home?.latestOrder {
                // Has order
                orderCard(order)
            } else {
                // No order
                noOrderCard
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
        .background {
            NavigationLink(destination: ClientOrdersView().toolbar(.hidden, for: .tabBar), isActive: $navigateToOrders) { EmptyView() }.hidden()
            NavigationLink(destination: WorksListView().toolbar(.hidden, for: .tabBar), isActive: $navigateToWorks) { EmptyView() }.hidden()
            NavigationLink(destination: ConversationsView(role: .client).toolbar(.hidden, for: .tabBar), isActive: $navigateToMessages) { EmptyView() }.hidden()
            if let orderId = navigateToOrderDetail {
                NavigationLink(destination: ClientOrderDetailView(orderId: orderId), isActive: .constant(true)) { EmptyView() }.hidden()
            }
            if let workId = navigateToWorkDetail {
                // 返回时自动重置，避免重复点击同一作品无法再次跳转
                NavigationLink(
                    destination: WorkDetailView(workId: workId),
                    isActive: Binding(
                        get: { navigateToWorkDetail != nil },
                        set: { if !$0 { navigateToWorkDetail = nil } }
                    )
                ) { EmptyView() }.hidden()
            }
            if let tech = home?.technician {
                NavigationLink(destination: CreateOrderView(techId: tech.id, techName: tech.name ?? ""), isActive: $navigateToBooking) { EmptyView() }.hidden()
            }
            if let order = home?.latestOrder, let techId = home?.technician?.id ?? order.technician?.id {
                NavigationLink(destination: ShopGuidanceView(techId: techId, shopName: order.shopName ?? orderShopName ?? "", address: order.address ?? ""), isActive: $navigateToShopGuidance) { EmptyView() }.hidden()
            }
        }
    }

    private func orderCard(_ order: Order) -> some View {
        let daysUntil = daysUntilOrder(order)
        let dateInfo = orderDateInfo(order)

        return VStack(spacing: 0) {
            // Top: status + countdown
            HStack {
                Text(OrderStatus(rawValue: order.status)?.displayName ?? order.status)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(NBColors.success)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(NBColors.successSurface)
                    .cornerRadius(Radius.md)

                Spacer()

                if daysUntil >= 0 {
                    HStack(spacing: 0) {
                        Text("还有 ")
                            .font(.system(size: 12))
                        Text("\(daysUntil)天")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(NBColors.action)
                }
            }
            .padding(.bottom, 16)

            // Body: date + details
            HStack(alignment: .top, spacing: 16) {
                // Date box
                VStack(spacing: 2) {
                    Text(dateInfo.month)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(NBColors.muted)
                    Text(dateInfo.day)
                        .font(.system(size: 26, weight: .bold))
                        .foregroundColor(NBColors.action)
                    Text(dateInfo.weekday)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(NBColors.muted)
                }
                .frame(width: 60, height: 68)
                .background(NBColors.page)
                .cornerRadius(16)

                // Details
                VStack(alignment: .leading, spacing: 4) {
                    Text(dateInfo.timeRange)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(NBColors.ink)

                    if let shopName = order.shopName ?? orderShopName, !shopName.isEmpty {
                        Text(shopName)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(NBColors.ink)
                    }

                    let techName = order.technician?.name ?? home?.technician?.name
                    if let techName, !techName.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: "person")
                                .font(.system(size: 12))
                            Text(techName)
                                .font(.system(size: 14))
                        }
                        .foregroundColor(NBColors.ink)
                    }

                    if let addr = order.address, !addr.isEmpty {
                        HStack(alignment: .top, spacing: 4) {
                            Image(systemName: "mappin.and.ellipse")
                                .font(.system(size: 12))
                                .padding(.top, 2)
                            // 地址与「导航」拼接为同一段文字流，导航紧跟地址文字后方
                            Text(addressWithNavigationLink(addr))
                                .lineLimit(2)
                                .environment(\.openURL, OpenURLAction { _ in
                                    openMapNavigation(name: order.shopName ?? orderShopName ?? "店铺位置", address: addr)
                                    return .handled
                                })
                        }
                    }

                    if order.serviceType == "到店美甲" || orderShopGuidance {
                        Button {
                            navigateToShopGuidance = true
                        } label: {
                            HStack(spacing: 2) {
                                Text("查看到店指引")
                                    .font(.system(size: 13, weight: .medium))
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 10))
                            }
                            .foregroundColor(NBColors.link)
                            .padding(.top, 2)
                        }
                        .padding(.leading, 16)  // 与地址文字左对齐（icon 12pt + spacing 4pt）
                    }
                }

                Spacer()
            }
            .padding(.bottom, 12)

            // Actions
            HStack(spacing: 6) {
                actionButton(icon: "bubble.left", title: "发消息") {
                    navigateToMessages = true
                }

                actionButton(icon: "phone", title: "打电话") {
                    if let phone = order.technician?.phone, let url = URL(string: "tel://\(phone)") {
                        UIApplication.shared.open(url)
                    }
                }
                .disabled(order.technician?.phone == nil)

                actionButton(title: "查看详情", isPrimary: true) {
                    navigateToOrderDetail = order.id
                }
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(Radius.xl)
        .shadow(color: Color.black.opacity(0.07), radius: 15, y: 5)
    }

    private var noOrderCard: some View {
        Button {
            navigateToBooking = true
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("当前暂无预约")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(NBColors.ink)
                    Text("挑选喜欢的款式，快速预约美甲师")
                        .font(.system(size: 12))
                        .foregroundColor(NBColors.muted)
                }

                Spacer()

                HStack(spacing: 4) {
                    Text("去预约")
                        .font(.system(size: 14, weight: .semibold))
                    Text("›")
                        .font(.system(size: 18))
                }
                .foregroundColor(NBColors.action)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(NBColors.page)
                .cornerRadius(Radius.xl)
            }
            .padding(16)
            .background(Color.white)
            .cornerRadius(Radius.lg)
            .shadow(color: Color.black.opacity(0.05), radius: 10, y: 2)
        }
    }

    // MARK: - Featured Works Section

    private var featuredWorksSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("精选作品")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(NBColors.ink)
                Spacer()
                Button("查看全部 ›") {
                    navigateToWorks = true
                }
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(NBColors.link)
                .padding(.vertical, 8)
                .contentShape(Rectangle())
            }

            Text("设计能力、审美理念与适合你的场景")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)
                .padding(.top, 3)
                .padding(.bottom, 12)

            if !featuredWorks.isEmpty {
                // Waterfall layout
                HStack(alignment: .top, spacing: 8) {
                    // Left column
                    VStack(spacing: 8) {
                        ForEach(Array(featuredWorks.enumerated().filter { $0.offset % 2 == 0 }.map { $0.element })) { work in
                            workCard(work)
                        }
                    }

                    // Right column
                    VStack(spacing: 8) {
                        ForEach(Array(featuredWorks.enumerated().filter { $0.offset % 2 == 1 }.map { $0.element })) { work in
                            workCard(work)
                        }
                    }
                }
            } else if let worksError {
                Text(worksError)
                    .foregroundColor(NBColors.muted)
                    .padding(.vertical, 20)
                Button("重新加载作品") { Task { await loadWorks() } }
                    .frame(minHeight: 44)
            } else if worksLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
            } else {
                // Empty state
                VStack(spacing: Spacing.md) {
                    Circle()
                        .fill(NBColors.page)
                        .frame(width: 64, height: 64)
                        .overlay(
                            Image(systemName: "photo")
                                .font(.system(size: 24))
                                .foregroundColor(NBColors.muted)
                        )

                    Text("暂无作品展示")
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.muted)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
                .background(Color.white)
                .cornerRadius(Radius.md)
                .shadow(color: Color.black.opacity(0.05), radius: 10, y: 2)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
    }

    private func workCard(_ work: NailWork) -> some View {
        WorkCardView(work: work)
    }

    /// 预约卡片底部操作按钮：视觉高度 40pt，外扩透明热区保证 44pt 触控标准
    private func actionButton(icon: String? = nil, title: String, isPrimary: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Group {
                if let icon {
                    HStack(spacing: 3) {
                        Image(systemName: icon)
                            .font(.system(size: 12))
                        Text(title)
                            .font(NBFont.captionLarge.weight(.medium))
                    }
                } else {
                    Text(title)
                        .font(NBFont.captionLarge.weight(.semibold))
                }
            }
            .foregroundColor(isPrimary ? .white : NBColors.ink)
            .frame(maxWidth: .infinity)
            .frame(height: 40)
            .background(isPrimary ? NBColors.action : NBColors.softSurface)
            .cornerRadius(Radius.button)
            .contentShape(Rectangle())
            .padding(.vertical, 2)  // 视觉 40pt，热区外扩至 44pt
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    /// 地址 + 「导航」内联链接拼接为同一段文字流，导航紧跟地址文字末尾展示
    private func addressWithNavigationLink(_ addr: String) -> AttributedString {
        var address = AttributedString(addr)
        address.foregroundColor = NBColors.muted
        address.font = .system(size: 13)

        var nav = AttributedString(" 导航")
        nav.foregroundColor = NBColors.link
        nav.font = .system(size: 12, weight: .medium)
        nav.link = URL(string: "nailbook://open-map")
        address.append(nav)
        return address
    }

    // MARK: - Date Helpers

    private func openMapNavigation(name: String, address: String) {
        let encodedAddr = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? address
        let encodedName = name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? name
        if let url = URL(string: "https://maps.apple.com/?q=\(encodedName)&address=\(encodedAddr)") {
            UIApplication.shared.open(url)
        }
    }

    private func daysUntilOrder(_ order: Order) -> Int {
        guard let start = order.startTime else { return -1 }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: start) else { return -1 }
        let days = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: Date()), to: Calendar.current.startOfDay(for: date)).day ?? 0
        return max(days, 0)
    }

    private func orderDateInfo(_ order: Order) -> (month: String, day: String, weekday: String, timeRange: String) {
        guard let start = order.startTime else {
            return ("--", "--", "--", "待确认")
        }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: start) else {
            return ("--", "--", "--", "待确认")
        }
        let monthF = DateFormatter(); monthF.dateFormat = "M月"; monthF.locale = Locale(identifier: "zh_CN")
        let dayF = DateFormatter(); dayF.dateFormat = "d"
        let weekdayF = DateFormatter(); weekdayF.locale = Locale(identifier: "zh_CN"); weekdayF.dateFormat = "EEE"
        let timeF = DateFormatter(); timeF.dateFormat = "HH:mm"

        let startStr = timeF.string(from: date)
        var timeRange = startStr
        if let end = order.endTime, let endDate = formatter.date(from: end) {
            timeRange = "\(startStr) - \(timeF.string(from: endDate))"
        }
        return (monthF.string(from: date), dayF.string(from: date), weekdayF.string(from: date), timeRange)
    }

    // MARK: - Data Loading

    private func loadHome() async {
        do {
            home = try await APIClient.shared.request(.clientHome)
            error = nil
            // 异步补齐店铺信息（与小程序逻辑一致）
            await loadOrderShopInfo()
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }

    /// 从公开接口匹配店铺名称和到店指引（线上 latestOrder 暂无这些字段）
    private func loadOrderShopInfo() async {
        guard let order = home?.latestOrder,
              let techId = home?.technician?.id ?? order.technician?.id else { return }
        do {
            let response: PublicArtistResponse = try await APIClient.shared.request(.publicArtistProfile(id: techId))
            let shops = (response.artist?.shopAddresses ?? []).filter { $0.enabled != false }
            // 按地址匹配店铺，匹配不到取第一个
            let normAddr = (order.address ?? "").replacingOccurrences(of: " ", with: "")
            var matched: ShopAddress?
            if !normAddr.isEmpty {
                matched = shops.first { shop in
                    let full = shop.address.replacingOccurrences(of: " ", with: "")
                    return full == normAddr || normAddr.contains(shop.detailAddress.replacingOccurrences(of: " ", with: ""))
                }
            }
            if matched == nil { matched = shops.first }
            orderShopName = matched?.name ?? response.artist?.shopName
            orderShopGuidance = matched?.guidance?.enabled == true
        } catch {
            // 静默失败，不影响首页展示
        }
    }

    private func loadWorks() async {
        do {
            let response: [NailWork] = try await APIClient.shared.request(.featuredWorks(page: 1, limit: 10))
            featuredWorks = response
            worksError = nil
        } catch {
            worksError = error.localizedDescription
        }
        worksLoading = false
    }
}

// MARK: - Work Card 已抽取为共享组件 WorkCardView（Features/Client/Works/WorkCardView.swift）

// MARK: - Preview

#Preview {
    ClientHomeView()
}
