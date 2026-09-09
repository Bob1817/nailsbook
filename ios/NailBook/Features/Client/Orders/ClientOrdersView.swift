import SwiftUI

// MARK: - Client Orders (synced with wxapp client/orders)

struct ClientOrdersView: View {
    @State private var orders: [Order] = []
    @State private var isLoading = true
    @State private var selectedStatus: String?

    private let statusFilters: [(String?, String)] = [
        (nil, "全部"),
        ("pending_quote", "待报价"),
        ("quoted", "待确认"),
        ("confirmed", "已确认"),
        ("completed", "已完成"),
        ("cancelled", "已取消")
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                // wxapp: linear-gradient(180deg, #fff8fa 0%, #f8f9fc 24%, #f5f6f8 100%)
                LinearGradient(
                    colors: [NBColors.page, NBColors.page, NBColors.page],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Filter bar (wxapp: sticky, rgba(255,255,255,0.94))
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: Spacing.sm) {
                            ForEach(statusFilters, id: \.0) { filter in
                                filterPill(filter.1, isSelected: selectedStatus == filter.0)
                                    .onTapGesture { selectedStatus = filter.0 }
                            }
                        }
                        .padding(.horizontal, Spacing.page)
                        .padding(.vertical, Spacing.md)
                    }
                    .background(Color.white.opacity(0.94))

                    if isLoading {
                        NBLoadingView()
                    } else if filteredOrders.isEmpty {
                        emptyState
                    } else {
                        ScrollView {
                            LazyVStack(spacing: Spacing.md) {
                                ForEach(filteredOrders) { order in
                                    NavigationLink(destination: ClientOrderDetailView(orderId: order.id)) {
                                        orderCard(order)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, Spacing.page)
                            .padding(.vertical, Spacing.md)
                            .padding(.bottom, 100)
                        }
                    }
                }
            }
            .navigationTitle("预约")
            .navigationBarTitleDisplayMode(.inline)
            .task { await loadOrders() }
            .refreshable { await loadOrders() }
            .onChange(of: selectedStatus) { _ in
                Task { await loadOrders() }
            }
        }
    }

    // MARK: - Filter Pill (wxapp: 88rpx, border-radius 32rpx)

    private func filterPill(_ title: String, isSelected: Bool) -> some View {
        Text(title)
            .font(NBFont.captionLarge)
            .fontWeight(isSelected ? .semibold : .regular)
            .foregroundColor(isSelected ? .white : NBColors.action)
            .padding(.horizontal, Spacing.md)
            .frame(height: 44)
            .background(isSelected ? Color.nbPrimary : NBColors.page)
            .cornerRadius(Radius.pill)
    }

    // MARK: - Order Card (wxapp: border-radius 56rpx, white bg, shadow)

    private func orderCard(_ order: Order) -> some View {
        HStack(spacing: Spacing.md) {
            // Date box (wxapp: 128rpx, min-height 168rpx, gradient #fff5f7 -> #ffe8ee)
            VStack(spacing: 2) {
                Text(orderMonth(order.startTime))
                    .font(NBFont.captionMedium)
                    .foregroundColor(.nbPrimary.opacity(0.7))
                Text(orderDay(order.startTime))
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.nbPrimary)
                Text(orderWeekday(order.startTime))
                    .font(NBFont.captionMedium)
                    .foregroundColor(.nbPrimary.opacity(0.7))
            }
            .frame(width: 64)
            .frame(minHeight: 84)
            .background(
                LinearGradient(colors: [NBColors.page, NBColors.page], startPoint: .top, endPoint: .bottom)
            )
            .cornerRadius(Radius.xl)

            // Details
            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack {
                    Text(order.customTitle ?? order.serviceType ?? "预约")
                        .font(NBFont.bodyLarge)
                        .fontWeight(.medium)
                        .foregroundColor(.nbTextPrimary)
                        .lineLimit(1)
                    Spacer()
                    statusBadge(order.status)
                }

                if let price = order.quotePrice, price > 0 {
                    Text("¥\(String(format: "%.0f", price))")
                        .font(NBFont.bodyMedium)
                        .fontWeight(.semibold)
                        .foregroundColor(.nbPrimary)
                }

                if let tech = order.technician?.name {
                    HStack(spacing: 4) {
                        Image(systemName: "person")
                            .font(.system(size: 10))
                        Text(tech)
                    }
                    .font(NBFont.captionLarge)
                    .foregroundColor(.nbTextSecondary)
                }

                if let time = order.startTime {
                    HStack(spacing: 4) {
                        Image(systemName: "clock")
                            .font(.system(size: 10))
                        Text(formatDateTime(time))
                    }
                    .font(NBFont.captionLarge)
                    .foregroundColor(.nbTextTertiary)
                }
            }

            // Chevron
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.nbTextQuaternary)
        }
        .padding(Spacing.cardPadding)
        .background(Color.white)
        .cornerRadius(Radius.hero)
        .shadow(color: NBColors.ink.opacity(0.06), radius: 12, y: 2)
    }

    // MARK: - Status Badge

    private func statusBadge(_ status: String) -> some View {
        let (text, bg, fg): (String, Color, Color) = switch status {
        case "pending_quote": ("待报价", .nbStatusAmberBg, .nbStatusAmber)
        case "quoted": ("已报价", .nbStatusBlueBg, .nbStatusBlue)
        case "confirmed": ("已确认", .nbStatusPurpleBg, .nbStatusPurple)
        case "in_progress": ("进行中", .nbStatusGreenBg, .nbStatusGreen)
        case "completed": ("已完成", .nbStatusGreenBg, .nbStatusGreen)
        case "cancelled": ("已取消", .nbStatusGrayBg, .nbStatusGray)
        default: (status, .nbStatusGrayBg, .nbStatusGray)
        }
        return NBStatusBadge(text: text, bgColor: bg, textColor: fg)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: Spacing.lg) {
            ZStack {
                Circle()
                    .fill(NBGradient.emptyIcon)
                    .frame(width: 80, height: 80)
                Image(systemName: "calendar")
                    .font(.system(size: 32))
                    .foregroundColor(.nbPrimary)
            }
            Text("暂无预约")
                .font(NBFont.bodyLarge)
                .foregroundColor(.nbTextSecondary)
            Text("立即预约")
                .font(NBFont.bodyMedium)
                .fontWeight(.semibold)
                .foregroundColor(.white)
                .padding(.horizontal, Spacing.xxl)
                .frame(height: 44)
                .background(NBGradient.button)
                .cornerRadius(Radius.pill)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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

    private func formatDateTime(_ iso: String) -> String {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = f.date(from: iso) else { return iso }
        let df = DateFormatter(); df.dateFormat = "MM/dd HH:mm"; return df.string(from: date)
    }

    private func parseDate(_ iso: String) -> Date? {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: iso)
    }

    private func loadOrders() async {
        do {
            orders = try await APIClient.shared.request(.clientOrders)
            isLoading = false
        } catch { isLoading = false }
    }
}
