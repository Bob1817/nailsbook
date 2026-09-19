import SwiftUI

// MARK: - Client Orders (aligned with wxapp design)

struct ClientOrdersView: View {
    @State private var orders: [Order] = []
    @State private var isLoading = true
    @State private var selectedStatus: String?

    private let statusFilters: [(String?, String)] = [
        (nil, "全部"),
        ("pending_quote", "待报价"),
        ("quoted", "待确认"),
        ("confirmed", "已确认"),
        ("in_progress", "进行中"),
        ("completed", "已完成"),
        ("cancelled", "已取消")
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter bar - wxapp style
                filterBar

                // Content
                if isLoading {
                    // Skeleton loading
                    ScrollView {
                        VStack(spacing: 16) {
                            ForEach(0..<3, id: \.self) { _ in
                                skeletonCard
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 16)
                    }
                } else if filteredOrders.isEmpty {
                    // Empty state
                    emptyState
                } else {
                    // Order list
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(filteredOrders) { order in
                                NavigationLink(destination: ClientOrderDetailView(orderId: order.id)) {
                                    orderCard(order)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 16)
                        .padding(.bottom, 100)
                    }
                }
            }
            .background(NBColors.page)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("预约")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(NBColors.ink)
                }
            }
            .task { await loadOrders() }
            .refreshable { await loadOrders() }
        }
    }

    // MARK: - Filter Bar

    private var filterBar: some View {
        HStack(spacing: 12) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(statusFilters, id: \.0) { filter in
                        filterTab(filter.1, isSelected: selectedStatus == filter.0)
                            .onTapGesture { selectedStatus = filter.0 }
                    }
                }
            }

            // Create button - wxapp style
            Button {
                // Navigate to create order
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(NBColors.ink)
                    .frame(width: 36, height: 36)
                    .background(NBColors.page)
                    .cornerRadius(10)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.94))
    }

    private func filterTab(_ title: String, isSelected: Bool) -> some View {
        Text(title)
            .font(.system(size: 14))
            .fontWeight(isSelected ? .semibold : .regular)
            .foregroundColor(isSelected ? .white : NBColors.muted)
            .padding(.horizontal, 12)
            .frame(minHeight: 44)
            .background(isSelected ? NBColors.action : NBColors.page)
            .cornerRadius(Radius.lg)
    }

    // MARK: - Order Card

    private func orderCard(_ order: Order) -> some View {
        VStack(spacing: 0) {
            // Card content
            VStack(spacing: 12) {
                // Body: date + details
                HStack(alignment: .top, spacing: 12) {
                    // Date box - wxapp style
                    VStack(spacing: 2) {
                        Text(orderMonth(order.startTime))
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(NBColors.action)
                        Text(orderDay(order.startTime))
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(NBColors.action)
                            .lineLimit(1)
                        Text(orderWeekday(order.startTime))
                            .font(.system(size: 12))
                            .foregroundColor(Color.black.opacity(0.72))
                    }
                    .frame(width: 56)
                    .frame(minHeight: 64)
                    .background(NBColors.page)
                    .cornerRadius(Radius.lg)

                    // Details
                    VStack(alignment: .leading, spacing: 4) {
                        // Time + status
                        HStack(alignment: .top) {
                            HStack(spacing: 4) {
                                Image(systemName: "clock")
                                    .font(.system(size: 14))
                                    .foregroundColor(NBColors.muted)
                                Text(orderTimeTitle(order.startTime, order.endTime))
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(NBColors.ink)
                            }

                            Spacer()

                            statusBadge(order.status)
                        }

                        // Service type
                        HStack(spacing: 4) {
                            Image(systemName: order.serviceType == "shop" ? "storefront" : "house")
                                .font(.system(size: 14))
                                .foregroundColor(NBColors.muted)
                            Text(order.serviceType == "shop" ? "到店服务" : "上门服务")
                                .font(.system(size: 14))
                                .foregroundColor(NBColors.ink)
                        }

                        // Technician
                        if let tech = order.technician?.name {
                            HStack(spacing: 4) {
                                Image(systemName: "person")
                                    .font(.system(size: 14))
                                    .foregroundColor(NBColors.muted)
                                Text("美甲师 \(tech)")
                                    .font(.system(size: 14))
                                    .foregroundColor(NBColors.ink)
                            }
                        }

                        // Address
                        if let address = order.address {
                            HStack(spacing: 4) {
                                Image(systemName: "mappin")
                                    .font(.system(size: 14))
                                    .foregroundColor(NBColors.muted)
                                Text(address)
                                    .font(.system(size: 13))
                                    .foregroundColor(NBColors.muted)
                                    .lineLimit(2)
                            }
                        }

                        // Payment
                        if let price = order.quotePrice, price > 0 {
                            HStack(spacing: 4) {
                                Image(systemName: "wallet")
                                    .font(.system(size: 14))
                                    .foregroundColor(NBColors.muted)
                                Text("¥\(String(format: "%.0f", price))")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(NBColors.action)
                            }
                        }
                    }
                }
            }
            .padding(16)

            // Footer - wxapp style
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "clock")
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.muted)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(order.isTerminal ? order.statusText : countdownText(order))
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(NBColors.secondary)
                        Text(order.isTerminal ? "" : nextStepText(order))
                            .font(.system(size: 12))
                            .foregroundColor(NBColors.muted)
                    }
                }

                Spacer()

                HStack(spacing: 4) {
                    Text("查看详情")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(NBColors.link)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                        .foregroundColor(NBColors.link)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(NBColors.page.opacity(0.5))
        }
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 10, y: 2)
    }

    // MARK: - Skeleton Card

    private var skeletonCard: some View {
        VStack(spacing: 16) {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 10)
                    .fill(NBColors.page)
                    .frame(width: 56, height: 64)

                VStack(alignment: .leading, spacing: 8) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(NBColors.page)
                        .frame(height: 16)
                        .frame(maxWidth: .infinity)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(NBColors.page)
                        .frame(height: 14)
                        .frame(width: 120)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(NBColors.page)
                        .frame(height: 14)
                        .frame(width: 80)
                }
            }
            .padding(16)

            HStack {
                RoundedRectangle(cornerRadius: 4)
                    .fill(NBColors.page)
                    .frame(width: 100, height: 14)
                Spacer()
                RoundedRectangle(cornerRadius: 4)
                    .fill(NBColors.page)
                    .frame(width: 60, height: 14)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(Color.white)
        .cornerRadius(16)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 24) {
            Spacer()

            VStack(spacing: 16) {
                // Art - wxapp style
                ZStack {
                    Circle()
                        .fill(NBColors.page)
                        .frame(width: 80, height: 80)

                    RoundedRectangle(cornerRadius: 7)
                        .stroke(NBColors.line, lineWidth: 2)
                        .frame(width: 32, height: 32)
                }

                Text("暂无预约")
                    .font(.system(size: 15))
                    .foregroundColor(NBColors.muted)

                Text("快速发起你的下一次美甲")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.muted)
                    .lineSpacing(1.4)
            }

            Button {
                // Navigate to create order
            } label: {
                Text("立即预约")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .frame(minHeight: 44)
                    .background(NBColors.action)
                    .cornerRadius(Radius.xl)
            }

            Spacer()
        }
        .padding(.horizontal, 24)
        .background(Color.white)
        .cornerRadius(28)
        .shadow(color: Color.black.opacity(0.06), radius: 16, y: 4)
        .padding(.horizontal, 20)
        .padding(.top, 16)
    }

    // MARK: - Status Badge

    private func statusBadge(_ status: String) -> some View {
        let (text, bg, fg): (String, Color, Color) = switch status {
        case "pending_quote": ("待报价", NBColors.softSurface, NBColors.link)
        case "quoted": ("已报价", NBColors.softSurface, NBColors.link)
        case "confirmed": ("已确认", NBColors.softSurface, NBColors.link)
        case "in_progress": ("进行中", NBColors.successSurface, NBColors.success)
        case "completed": ("已完成", NBColors.successSurface, NBColors.success)
        case "cancelled": ("已取消", NBColors.page, NBColors.ink)
        default: (status, NBColors.page, NBColors.ink)
        }

        return Text(text)
            .font(.system(size: 12, weight: .medium))
            .padding(.horizontal, 11)
            .padding(.vertical, 4)
            .background(bg)
            .foregroundColor(fg)
            .cornerRadius(11)
    }

    // MARK: - Helpers

    private var filteredOrders: [Order] {
        if let status = selectedStatus {
            return orders.filter { $0.status == status }
        }
        return orders
    }

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

    private func orderTimeTitle(_ start: String?, _ end: String?) -> String {
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

    private func parseDate(_ iso: String) -> Date? {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: iso)
    }

    private func countdownText(_ order: Order) -> String {
        // Simplified countdown
        return "查看详情"
    }

    private func nextStepText(_ order: Order) -> String {
        switch order.status {
        case "pending_quote": return "等待美甲师报价"
        case "quoted": return "请确认报价"
        case "confirmed": return "等待服务开始"
        case "in_progress": return "服务进行中"
        default: return ""
        }
    }

    private func loadOrders() async {
        do {
            orders = try await APIClient.shared.request(.clientOrders)
            isLoading = false
        } catch { isLoading = false }
    }
}

// MARK: - Order Extension

extension Order {
    var isTerminal: Bool {
        ["completed", "cancelled"].contains(status)
    }

    var statusText: String {
        switch status {
        case "pending_quote": return "待报价"
        case "quoted": return "已报价"
        case "confirmed": return "已确认"
        case "in_progress": return "进行中"
        case "completed": return "已完成"
        case "cancelled": return "已取消"
        default: return status
        }
    }
}

// MARK: - Preview

#Preview {
    ClientOrdersView()
}
