import SwiftUI

// MARK: - Client Home View (aligned with wxapp design)

struct ClientHomeView: View {
    @State private var home: ClientHomeData?
    @State private var featuredWorks: [NailWork] = []
    @State private var loading = true
    @State private var worksLoading = true
    @State private var error: String?
    @State private var swiperIndex = 0

    // Timer for auto-play
    let timer = Timer.publish(every: 4, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Hero Section - Works Swiper
                    heroSection

                    // Booking Section
                    bookingSection

                    // Popular Styles
                    styleSection

                    // Featured Works
                    featuredWorksSection
                }
                .padding(.bottom, 100) // Tab bar space
            }
            .background(NBColors.page)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("NailBook")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(NBColors.ink)
                }
            }
            .task {
                await loadHome()
                await loadWorks()
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
                        // Navigate to works
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(NBColors.link)
                }
                .frame(height: 310)
                .frame(maxWidth: .infinity)
                .background(NBColors.page)
                .cornerRadius(Radius.md)
                .padding(.horizontal, 20)
                .padding(.top, 16)
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
                .padding(.top, 16)
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
            .frame(height: 310)
            .clipped()

            // Overlay gradient
            VStack {
                Spacer()
                LinearGradient(
                    colors: [Color.black.opacity(0.24), Color.black.opacity(0.02), Color.black.opacity(0.08), Color.black.opacity(0.76)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 120)
                .overlay(
                    HStack(alignment: .bottom) {
                        VStack(alignment: .leading, spacing: 5) {
                            Text(work.title ?? "美甲作品")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.white)
                                .lineLimit(1)

                            if let name = work.technicianName {
                                Text(name)
                                    .font(.system(size: 14))
                                    .foregroundColor(Color.white.opacity(0.88))
                            }
                        }

                        Spacer()

                        // CTA Button
                        HStack(spacing: 2) {
                            Text("查看详情")
                                .font(.system(size: 14, weight: .medium))
                            Text("›")
                                .font(.system(size: 18))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.black.opacity(0.34))
                        .cornerRadius(18)
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
                )
            }
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
                        // Navigate to orders
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(NBColors.link)
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
    }

    private func orderCard(_ order: Order) -> some View {
        VStack(spacing: 0) {
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

                HStack(spacing: 0) {
                    Text("还有 ")
                        .font(.system(size: 12))
                    Text("3天")
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundColor(NBColors.action)
            }
            .padding(.bottom, 16)

            // Body: date + details
            HStack(alignment: .top, spacing: 16) {
                // Date box
                VStack(spacing: 2) {
                    Text("9月")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(NBColors.muted)
                    Text("17")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundColor(NBColors.action)
                    Text("周三")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(NBColors.muted)
                }
                .frame(width: 60, height: 68)
                .background(NBColors.page)
                .cornerRadius(16)

                // Details
                VStack(alignment: .leading, spacing: 4) {
                    Text("14:00 - 16:00")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(NBColors.ink)

                    if let tech = order.technician {
                        HStack(spacing: 4) {
                            Image(systemName: "person")
                                .font(.system(size: 12))
                            Text(tech.name ?? "")
                                .font(.system(size: 14))
                        }
                        .foregroundColor(NBColors.ink)
                    }
                }

                Spacer()
            }
            .padding(.bottom, 12)

            // Actions
            HStack(spacing: 6) {
                Button {
                    // Send message
                } label: {
                    HStack(spacing: 3) {
                        Image(systemName: "bubble.left")
                            .font(.system(size: 14))
                        Text("发消息")
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(NBColors.ink)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(NBColors.softSurface)
                    .cornerRadius(Radius.button)
                }

                Button {
                    // Call
                } label: {
                    HStack(spacing: 3) {
                        Image(systemName: "phone")
                            .font(.system(size: 14))
                        Text("打电话")
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(NBColors.ink)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(NBColors.softSurface)
                    .cornerRadius(Radius.button)
                }

                Button {
                    // View detail
                } label: {
                    Text("查看详情")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(NBColors.action)
                        .cornerRadius(Radius.button)
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
            // Navigate to booking
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

    // MARK: - Style Section

    private var styleSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("热门风格")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(NBColors.ink)
                Spacer()
                Button("查看全部 ›") {
                    // Navigate to works
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(NBColors.link)
            }

            Text("按你的场景，快速找到下一款灵感")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)
                .padding(.top, 3)
                .padding(.bottom, 12)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 7) {
                    ForEach(["韩系温柔风", "轻奢法式", "简约日式", "高级手绘", "氛围感晕染"], id: \.self) { style in
                        Text(style)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(NBColors.ink)
                            .padding(.horizontal, 16)
                            .frame(minHeight: 44)
                            .background(Color.white)
                            .cornerRadius(Radius.xl)
                            .shadow(color: Color.black.opacity(0.05), radius: 5, y: 1)
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
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
                    // Navigate to works
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(NBColors.link)
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
        NavigationLink(destination: WorkDetailView(workId: work.id)) {
            VStack(alignment: .leading, spacing: 8) {
                // Image
                AsyncImage(url: URL(string: work.coverUrl ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(NBColors.page)
                        .overlay(
                            Image(systemName: "photo")
                                .foregroundColor(NBColors.muted)
                        )
                }
                .aspectRatio(0.75, contentMode: .fit)
                .clipped()
                .cornerRadius(Radius.sm)

                // Info
                VStack(alignment: .leading, spacing: 2) {
                    Text(work.title ?? "美甲作品")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(NBColors.ink)
                        .lineLimit(1)

                    HStack(spacing: 4) {
                        if let name = work.technicianName {
                            Text(name)
                                .font(.system(size: 12))
                                .foregroundColor(NBColors.muted)
                        }

                        Spacer()

                        HStack(spacing: 2) {
                            Image(systemName: "heart")
                                .font(.system(size: 10))
                            Text("\(work.likeCount ?? 0)")
                                .font(.system(size: 12))
                        }
                        .foregroundColor(NBColors.muted)
                    }
                }
                .padding(.horizontal, 4)
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: - Data Loading

    private func loadHome() async {
        do {
            home = try await APIClient.shared.request(.clientHome)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }

    private func loadWorks() async {
        do {
            let response: [NailWork] = try await APIClient.shared.request(.featuredWorks(page: 1, limit: 10))
            featuredWorks = response
        } catch {}
        worksLoading = false
    }
}

// MARK: - Preview

#Preview {
    ClientHomeView()
}
