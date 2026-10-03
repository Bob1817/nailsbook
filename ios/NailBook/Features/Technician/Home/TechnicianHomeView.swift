import SwiftUI

// MARK: - Technician Home View (aligned with wxapp design)

struct TechnicianHomeView: View {
    @State private var orders: [Order] = []
    @State private var insights: TechnicianInsights?
    @State private var featuredWorks: [NailWork] = []
    @State private var loading = true
    @State private var worksLoading = true
    @State private var error: String?

    private var todayOrders: [Order] {
        orders.filter { order in
            guard let date = OrderActionView.parse(order.startTime) else { return false }
            return Calendar.current.isDateInToday(date) && !["cancelled", "expired"].contains(order.status)
        }.sorted { ($0.startTime ?? "") < ($1.startTime ?? "") }
    }

    private var pendingQuoteCount: Int {
        orders.filter { $0.status == "pending_quote" }.count
    }

    private var pendingConfirmCount: Int {
        orders.filter { $0.status == "quoted" }.count
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    // Business Hero - Monthly stats
                    businessHeroCard

                    // Next Order
                    nextOrderCard

                    // Todo Items
                    todoCard

                    // Featured Works
                    worksCard
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 100) // Tab bar space
            }
            .background(NBColors.page)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("首页")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(NBColors.ink)
                }
            }
            .task {
                await loadOrders()
                await loadInsights()
                await loadWorks()
            }
            .refreshable {
                await loadOrders()
                await loadInsights()
                await loadWorks()
            }
        }
    }

    // MARK: - Business Hero Card

    private var businessHeroCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("本月经营信息")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(NBColors.ink)
                    Text("数据更新至今日")
                        .font(.system(size: 12))
                        .foregroundColor(NBColors.muted)
                }

                Spacer()

                HStack(spacing: 2) {
                    Text("详情")
                        .font(.system(size: 14, weight: .semibold))
                    Text("›")
                        .font(.system(size: 16))
                }
                .foregroundColor(NBColors.link)
            }

            // Revenue
            VStack(spacing: 4) {
                Text(formatMoney(insights?.revenue?.monthConfirmed ?? 0))
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(NBColors.ink)

                Text("已完成确认收入")
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.muted)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)

            // Grid
            HStack(spacing: 0) {
                metricItem(value: formatMoney(insights?.revenue?.monthConfirmed ?? 0), label: "预计收入")
                metricItem(value: "\(insights?.bookings?.monthCompleted ?? 0)", label: "完成订单")
                metricItem(value: "\(insights?.bookings?.monthCompleted ?? 0)", label: "本月预约")
                metricItem(value: "\(insights?.customers?.newThisMonth ?? 0)", label: "本月新增")
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 10, y: 2)
    }

    private func metricItem(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(NBColors.ink)
                .lineLimit(1)

            Text(label)
                .font(.system(size: 12))
                .foregroundColor(NBColors.muted)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Next Order Card

    private var nextOrderCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let nextOrder = todayOrders.first {
                // Has next order
                HStack(alignment: .top, spacing: 12) {
                    // Date box
                    VStack(spacing: 2) {
                        Text(formatMonth(nextOrder.startTime))
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(NBColors.action)
                        Text(formatDay(nextOrder.startTime))
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(NBColors.action)
                        Text(formatWeekday(nextOrder.startTime))
                            .font(.system(size: 12))
                            .foregroundColor(Color.black.opacity(0.72))
                    }
                    .frame(width: 56)
                    .frame(minHeight: 64)
                    .background(NBColors.page)
                    .cornerRadius(Radius.lg)

                    // Details
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(formatTimeRange(nextOrder.startTime, nextOrder.endTime))
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(NBColors.ink)

                            Spacer()

                            Text(OrderStatus(rawValue: nextOrder.status)?.displayName ?? nextOrder.status)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(NBColors.success)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(NBColors.successSurface)
                                .cornerRadius(Radius.md)
                        }

                        if let customer = nextOrder.customer?.name {
                            HStack(spacing: 4) {
                                Image(systemName: "person")
                                    .font(.system(size: 14))
                                    .foregroundColor(NBColors.muted)
                                Text(customer)
                                    .font(.system(size: 14))
                                    .foregroundColor(NBColors.ink)
                            }
                        }

                        if let address = nextOrder.address {
                            HStack(spacing: 4) {
                                Image(systemName: "mappin")
                                    .font(.system(size: 14))
                                    .foregroundColor(NBColors.muted)
                                Text(address)
                                    .font(.system(size: 13))
                                    .foregroundColor(NBColors.muted)
                                    .lineLimit(1)
                            }
                        }
                    }
                }

                // Actions
                HStack(spacing: 6) {
                    Button {
                        // Navigate
                    } label: {
                        HStack(spacing: 3) {
                            Image(systemName: "navigation")
                                .font(.system(size: 14))
                            Text("导航")
                        }
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(NBColors.ink)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(NBColors.softSurface)
                        .cornerRadius(Radius.button)
                    }

                    Button {
                        // Message
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

                    NavigationLink(destination: TechOrderDetailView(orderId: nextOrder.id)) {
                        Text("查看详情")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .background(NBColors.action)
                            .cornerRadius(Radius.button)
                    }
                }
                .padding(.top, 12)
            } else {
                // No next order
                VStack(alignment: .leading, spacing: 4) {
                    Text("暂无行程安排")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(NBColors.ink)
                    Text("当前没有待上门、待到店或服务中的预约。")
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.muted)
                            .lineSpacing(1.4)
                }
                .padding(.vertical, 8)
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 10, y: 2)
    }

    // MARK: - Todo Card

    private var todoCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("待处理事项")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(NBColors.ink)
                    Text("高优先级工作提醒")
                        .font(.system(size: 12))
                        .foregroundColor(NBColors.muted)
                }

                Spacer()

                if pendingQuoteCount + pendingConfirmCount > 0 {
                    Text("\(pendingQuoteCount + pendingConfirmCount)")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .frame(minWidth: 24, minHeight: 24)
                        .background(NBColors.action)
                        .cornerRadius(12)
                }
            }

            // Todo items
            if pendingQuoteCount > 0 {
                todoRow(count: pendingQuoteCount, label: "待报价", tone: .pink)
            }

            if pendingConfirmCount > 0 {
                todoRow(count: pendingConfirmCount, label: "待确认", tone: .blue)
            }

            if pendingQuoteCount == 0 && pendingConfirmCount == 0 {
                Text("今日待办已清空，可以专心服务客户。")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.muted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(NBColors.page)
                    .cornerRadius(Radius.lg)
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 10, y: 2)
    }

    private func todoRow(count: Int, label: String, tone: TodoTone) -> some View {
        HStack {
            HStack(spacing: 4) {
                Text("\(count)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(tone.color)
                    .frame(minWidth: 24, minHeight: 22)
                    .background(tone.bgColor)
                    .cornerRadius(11)

                Text(label)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(NBColors.ink)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)
        }
        .padding(12)
        .background(NBColors.page)
        .cornerRadius(Radius.lg)
    }

    enum TodoTone {
        case pink, blue

        var color: Color {
            switch self {
            case .pink: return NBColors.link
            case .blue: return NBColors.link
            }
        }

        var bgColor: Color {
            switch self {
            case .pink: return NBColors.softSurface
            case .blue: return NBColors.softSurface
            }
        }
    }

    // MARK: - Works Card

    private var worksCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("今日热门")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(NBColors.ink)
                    Text("最近受欢迎的款式和客户收藏")
                        .font(.system(size: 12))
                        .foregroundColor(NBColors.muted)
                }

                Spacer()

                Button("更多") {
                    // Navigate to works
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(NBColors.link)
            }

            // Works grid
            if !featuredWorks.isEmpty {
                HStack(alignment: .top, spacing: 8) {
                    // Left column
                    VStack(spacing: 8) {
                        ForEach(Array(featuredWorks.enumerated().filter { $0.offset % 2 == 0 }.map { $0.element })) { work in
                            workCardItem(work)
                        }
                    }

                    // Right column
                    VStack(spacing: 8) {
                        ForEach(Array(featuredWorks.enumerated().filter { $0.offset % 2 == 1 }.map { $0.element })) { work in
                            workCardItem(work)
                        }
                    }
                }
            } else if worksLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
            } else {
                Text("还没有上传作品，先补几张好看的款式吧。")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.muted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                    .background(NBColors.page)
                    .cornerRadius(Radius.lg)
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 10, y: 2)
    }

    private func workCardItem(_ work: NailWork) -> some View {
        NavigationLink(destination: TechWorkDetailView(work: work)) {
            VStack(alignment: .leading, spacing: 6) {
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
                .frame(maxWidth: .infinity)
                .clipped()
                .cornerRadius(Radius.sm)

                // Info
                VStack(alignment: .leading, spacing: 2) {
                    Text(work.title ?? "美甲作品")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(NBColors.ink)
                        .lineLimit(1)

                    HStack(spacing: 4) {
                        Image(systemName: "heart")
                            .font(.system(size: 10))
                        Text("\(work.likeCount ?? 0)")
                            .font(.system(size: 12))
                    }
                    .foregroundColor(NBColors.muted)
                }
                .padding(.horizontal, 4)
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: - Helpers

    private func formatMoney(_ amount: Double) -> String {
        if amount >= 10000 {
            return String(format: "¥%.1f万", amount / 10000)
        } else {
            return String(format: "¥%.0f", amount)
        }
    }

    private func formatMonth(_ iso: String?) -> String {
        guard let iso, let date = OrderActionView.parse(iso) else { return "" }
        let f = DateFormatter(); f.dateFormat = "M月"; return f.string(from: date)
    }

    private func formatDay(_ iso: String?) -> String {
        guard let iso, let date = OrderActionView.parse(iso) else { return "" }
        let f = DateFormatter(); f.dateFormat = "d"; return f.string(from: date)
    }

    private func formatWeekday(_ iso: String?) -> String {
        guard let iso, let date = OrderActionView.parse(iso) else { return "" }
        let f = DateFormatter(); f.locale = Locale(identifier: "zh_CN"); f.dateFormat = "EEE"; return f.string(from: date)
    }

    private func formatTimeRange(_ start: String?, _ end: String?) -> String {
        guard let start = start else { return "预约" }
        let startTime = formatTime(start)
        let endTime = end.map { formatTime($0) } ?? ""
        return endTime.isEmpty ? startTime : "\(startTime) - \(endTime)"
    }

    private func formatTime(_ iso: String) -> String {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = f.date(from: iso) else { return iso }
        let df = DateFormatter(); df.dateFormat = "HH:mm"; return df.string(from: date)
    }

    // MARK: - Data Loading

    private func loadOrders() async {
        do {
            orders = try await APIClient.shared.request(.technicianOrders(status: nil, customerId: nil))
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }

    private func loadInsights() async {
        do {
            let month = currentDateInChina().prefix(7).description
            insights = try await APIClient.shared.request(.technicianInsights(month: month))
        } catch {}
    }

    private func loadWorks() async {
        do {
            featuredWorks = try await APIClient.shared.request(.techWorks)
        } catch {}
        worksLoading = false
    }

    private func currentDateInChina() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "Asia/Shanghai")
        return formatter.string(from: Date())
    }
}

// MARK: - Preview

#Preview {
    TechnicianHomeView()
}
