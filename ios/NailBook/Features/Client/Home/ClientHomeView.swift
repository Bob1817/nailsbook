import SwiftUI

// MARK: - Client Home (synced with wxapp client/home)

struct ClientHomeView: View {
    @EnvironmentObject var appState: AppState
    @State private var homeData: ClientHomeData?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var heroIndex = 0

    var body: some View {
        NavigationStack {
            ZStack {
                Color.nbBg.ignoresSafeArea()

                if isLoading {
                    NBLoadingView()
                } else if let data = homeData {
                    ScrollView {
                        VStack(spacing: 0) {
                            // Hero Section - Featured Works Swiper (wxapp: 620rpx, border-radius 24rpx)
                            if let works = data.featuredWorks, !works.isEmpty {
                                heroSwiper(works)
                            } else {
                                heroPlaceholder
                            }

                            VStack(spacing: Spacing.sectionGap) {
                                // Booking Section - Order Card
                                if let order = data.latestOrder {
                                    bookingSection(order)
                                } else {
                                    noOrderCard
                                }

                                // Asset Section - 美甲记录
                                assetSection

                                // Featured Works Grid
                                if let works = data.featuredWorks, !works.isEmpty {
                                    sectionHeader("精选作品")
                                    waterfallGrid(works)
                                }
                            }
                            .padding(.horizontal, Spacing.page)
                            .padding(.top, Spacing.xxl)
                            .padding(.bottom, 100)
                        }
                    }
                } else if let error = errorMessage {
                    NBEmptyState(icon: "wifi.slash", title: "加载失败", message: error)
                }
            }
            .navigationTitle("首页")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable { await loadHome() }
            .task { await loadHome() }
        }
    }

    // MARK: - Hero Swiper (wxapp: swiper 620rpx)

    private func heroSwiper(_ works: [NailWork]) -> some View {
        VStack(spacing: Spacing.sm) {
            TabView(selection: $heroIndex) {
                ForEach(works.indices, id: \.self) { index in
                    let work = works[index]
                    ZStack(alignment: .bottomLeading) {
                        // Image
                        if let url = work.coverUrl, let imageURL = URL(string: url) {
                            AsyncImage(url: imageURL) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Rectangle().fill(Color.nbSecondarySoft)
                            }
                        } else {
                            Rectangle()
                                .fill(Color.nbSecondarySoft)
                                .overlay(Image(systemName: "photo").foregroundColor(.nbTextTertiary))
                        }

                        // Gradient overlay (wxapp: rgba(7,10,20,0.24) -> transparent -> rgba(7,10,20,0.76))
                        NBGradient.workOverlay

                        // Bottom info
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text(work.title ?? "")
                                .font(NBFont.titleLarge)
                                .foregroundColor(.white)
                                .lineLimit(1)
                            if let tech = work.technician?.name {
                                Text(tech)
                                    .font(NBFont.captionLarge)
                                    .foregroundColor(.white.opacity(0.8))
                            }
                        }
                        .padding(Spacing.lg)
                    }
                    .frame(height: 310)
                    .cornerRadius(Radius.lg)
                    .clipped()
                    .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .automatic))
            .frame(height: 310)
            .padding(.horizontal, Spacing.page)
        }
    }

    private var heroPlaceholder: some View {
        VStack(spacing: Spacing.lg) {
            ZStack {
                Circle()
                    .fill(NBGradient.emptyIcon)
                    .frame(width: 80, height: 80)
                Image(systemName: "photo")
                    .font(.system(size: 32))
                    .foregroundColor(.nbPrimary.opacity(0.6))
            }
            Text("绑定美甲师后查看最新作品")
                .font(NBFont.bodyMedium)
                .foregroundColor(.nbTextSecondary)
        }
        .frame(height: 200)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Booking Section (wxapp: gradient order card #FF6B8A -> #FF8FA3)

    private func bookingSection(_ order: Order) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            sectionHeader("我的预约")

            NavigationLink(destination: ClientOrderDetailView(orderId: order.id)) {
                VStack(spacing: 0) {
                    // Status badge + countdown
                    HStack {
                        NBStatusBadge(
                            text: OrderStatus(rawValue: order.status)?.displayName ?? order.status,
                            bgColor: .white.opacity(0.25),
                            textColor: .white
                        )
                        Spacer()
                        if let start = order.startTime {
                            Text(countdownText(start))
                                .font(NBFont.captionLarge)
                                .foregroundColor(.white.opacity(0.8))
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.top, Spacing.lg)

                    // Order body
                    HStack(spacing: Spacing.lg) {
                        // Date box (wxapp: 160rpx, border-radius 32rpx, rgba(255,255,255,0.20))
                        VStack(spacing: 2) {
                            Text(orderMonth(order.startTime))
                                .font(NBFont.captionLarge)
                                .foregroundColor(.white.opacity(0.7))
                            Text(orderDay(order.startTime))
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.white)
                            Text(orderWeekday(order.startTime))
                                .font(NBFont.captionMedium)
                                .foregroundColor(.white.opacity(0.7))
                        }
                        .frame(width: 72, height: 72)
                        .background(Color.white.opacity(0.2))
                        .cornerRadius(Radius.xl)

                        // Details
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text(order.customTitle ?? order.serviceType ?? "预约")
                                .font(NBFont.bodyLarge)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                                .lineLimit(1)
                            if let tech = order.technician?.name {
                                Text(tech)
                                    .font(NBFont.captionLarge)
                                    .foregroundColor(.white.opacity(0.8))
                            }
                            if let addr = order.address {
                                Text(addr)
                                    .font(NBFont.captionMedium)
                                    .foregroundColor(.white.opacity(0.6))
                                    .lineLimit(1)
                            }
                        }
                        Spacer()
                    }
                    .padding(Spacing.lg)

                    // Actions
                    HStack(spacing: Spacing.md) {
                        orderActionButton(icon: "bubble.left.fill", title: "发消息")
                        orderActionButton(icon: "phone.fill", title: "打电话")
                        orderActionButton(icon: "chevron.right", title: "查看详情")
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.bottom, Spacing.lg)
                }
                .background(NBGradient.orderCard)
                .cornerRadius(Radius.hero)
                .shadow(color: Color.nbPrimary.opacity(0.24), radius: 16, y: 6)
            }
            .buttonStyle(.plain)
        }
    }

    private func orderActionButton(icon: String, title: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 12))
            Text(title)
                .font(NBFont.captionMedium)
        }
        .foregroundColor(.white)
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(Color.white.opacity(0.2))
        .cornerRadius(Radius.pill)
    }

    private var noOrderCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            sectionHeader("我的预约")
            VStack(spacing: Spacing.md) {
                Image(systemName: "calendar")
                    .font(.system(size: 32))
                    .foregroundColor(.nbTextTertiary)
                Text("当前暂无预约")
                    .font(NBFont.bodyMedium)
                    .foregroundColor(.nbTextSecondary)
                Text("去预约")
                    .font(NBFont.bodyMedium)
                    .fontWeight(.semibold)
                    .foregroundColor(.nbPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.xxl)
            .background(Color.nbSurfaceGlass)
            .cornerRadius(Radius.card)
        }
    }

    // MARK: - Asset Section (wxapp: archive card + ai card)

    private var assetSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            sectionHeader("我的美甲记录")
            HStack(spacing: Spacing.md) {
                // Archive card (wxapp: gradient #3c2732 -> #6f4357)
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Image(systemName: "folder.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.white)
                    Text("美甲档案")
                        .font(NBFont.bodyLarge)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                    Text("查看历史记录")
                        .font(NBFont.captionLarge)
                        .foregroundColor(.white.opacity(0.7))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Spacing.cardPadding)
                .background(NBGradient.archiveCard)
                .cornerRadius(Radius.xl)
                .frame(height: 135)

                // AI card (wxapp: gradient #fff1f7 -> #eee8ff)
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 24))
                        .foregroundColor(.nbPrimary)
                    Text("AI 试甲")
                        .font(NBFont.bodyLarge)
                        .fontWeight(.semibold)
                        .foregroundColor(.nbTextPrimary)
                    Text("智能推荐")
                        .font(NBFont.captionLarge)
                        .foregroundColor(.nbTextSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Spacing.cardPadding)
                .background(NBGradient.aiCard)
                .cornerRadius(Radius.xl)
                .frame(height: 135)
            }
        }
    }

    // MARK: - Waterfall Grid

    private func waterfallGrid(_ works: [NailWork]) -> some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            LazyVStack(spacing: Spacing.md) {
                ForEach(works.enumerated().filter { $0.offset % 2 == 0 }.map(\.element)) { work in
                    NavigationLink(destination: WorkDetailView(workId: work.id)) {
                        WorkCardWX(work: work, tall: true)
                    }
                    .buttonStyle(.plain)
                }
            }
            LazyVStack(spacing: Spacing.md) {
                ForEach(works.enumerated().filter { $0.offset % 2 == 1 }.map(\.element)) { work in
                    NavigationLink(destination: WorkDetailView(workId: work.id)) {
                        WorkCardWX(work: work, tall: false)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Section Header

    private func sectionHeader(_ title: String) -> some View {
        HStack {
            Text(title)
                .font(NBFont.titleMedium)
                .fontWeight(.bold)
                .foregroundColor(.nbTextPrimary)
            Spacer()
        }
    }

    // MARK: - Helpers

    private func orderMonth(_ iso: String?) -> String {
        guard let iso, let date = parseDate(iso) else { return "" }
        let f = DateFormatter(); f.dateFormat = "M月"; return f.string(from: date)
    }

    private func orderDay(_ iso: String?) -> String {
        guard let iso, let date = parseDate(iso) else { return "" }
        let f = DateFormatter(); f.dateFormat = "d"; return f.string(from: date)
    }

    private func orderWeekday(_ iso: String?) -> String {
        guard let iso, let date = parseDate(iso) else { return "" }
        let f = DateFormatter(); f.locale = Locale(identifier: "zh_CN"); f.dateFormat = "EEE"; return f.string(from: date)
    }

    private func countdownText(_ iso: String) -> String {
        guard let date = parseDate(iso) else { return "" }
        let interval = date.timeIntervalSinceNow
        if interval < 0 { return "已过期" }
        let hours = Int(interval) / 3600
        let days = hours / 24
        if days > 0 { return "还有\(days)天" }
        if hours > 0 { return "还有\(hours)小时" }
        return "即将开始"
    }

    private func parseDate(_ iso: String) -> Date? {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: iso)
    }

    private func loadHome() async {
        do {
            homeData = try await APIClient.shared.request(.clientHome)
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }
}

// MARK: - Work Card (wxapp style with gradient overlay)

struct WorkCardWX: View {
    let work: NailWork
    var tall: Bool = false

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Image
            GeometryReader { geo in
                if let url = work.coverUrl, let imageURL = URL(string: url) {
                    AsyncImage(url: imageURL) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle().fill(Color.nbSecondarySoft)
                    }
                    .frame(width: geo.size.width, height: tall ? geo.size.width * 1.33 : geo.size.width * 1.25)
                    .clipped()
                } else {
                    Rectangle()
                        .fill(NBGradient.emptyIcon)
                        .frame(width: geo.size.width, height: tall ? geo.size.width * 1.33 : geo.size.width * 1.25)
                        .overlay(Image(systemName: "photo").foregroundColor(.nbTextTertiary))
                }
            }
            .frame(height: tall ? 200 : 180)

            // Gradient overlay
            NBGradient.workOverlay

            // Top pills
            VStack {
                HStack(spacing: Spacing.xs) {
                    // Tech pill
                    if let tech = work.technician {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(Color.white.opacity(0.3))
                                .frame(width: 18, height: 18)
                                .overlay(
                                    Text(String(tech.name?.first ?? "?"))
                                        .font(.system(size: 9))
                                        .foregroundColor(.white)
                                )
                            Text(tech.name ?? "")
                                .font(.system(size: 10))
                                .fontWeight(.medium)
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.black.opacity(0.32))
                        .cornerRadius(Radius.pill)
                    }
                    Spacer()
                    // Like pill
                    HStack(spacing: 3) {
                        Image(systemName: "heart.fill")
                            .font(.system(size: 10))
                            .foregroundColor(.white)
                        Text("\(work.likeCount ?? 0)")
                            .font(.system(size: 10))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.black.opacity(0.32))
                    .cornerRadius(Radius.pill)
                }
                Spacer()
            }
            .padding(8)

            // Bottom info
            VStack(alignment: .leading, spacing: 3) {
                Text(work.title ?? "")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                if let tags = work.tags, !tags.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(tags.prefix(2), id: \.self) { tag in
                            Text("#\(tag)")
                                .font(.system(size: 9))
                                .foregroundColor(.white.opacity(0.9))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.white.opacity(0.16))
                                .cornerRadius(8)
                        }
                    }
                }
                HStack {
                    if let date = work.createdAt {
                        Text(formatShortDate(date))
                            .font(.system(size: 9))
                            .foregroundColor(.white.opacity(0.52))
                    }
                    Spacer()
                    Text("查看详情")
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.78))
                }
            }
            .padding(8)
        }
        .cornerRadius(Radius.md)
        .clipped()
        .shadow(color: NBColors.ink.opacity(0.08), radius: 8, y: 2)
    }

    private func formatShortDate(_ iso: String) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = f.date(from: iso) else { return "" }
        let df = DateFormatter()
        df.dateFormat = "MM/dd"
        return df.string(from: date)
    }
}
