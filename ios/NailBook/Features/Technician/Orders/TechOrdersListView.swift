import SwiftUI

// MARK: - Technician Orders List

struct TechOrdersListView: View {
    @State private var orders: [Order] = []
    @State private var isLoading = true
    @State private var selectedStatus: String?

    private let statusFilters: [(String?, String)] = [
        (nil, "全部"),
        ("pending_quote", "待报价"),
        ("quoted", "已报价"),
        ("confirmed", "已确认"),
        ("in_progress", "服务中"),
        ("completed", "已完成"),
        ("cancelled", "已取消")
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Status filter
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.sm) {
                        ForEach(statusFilters, id: \.0) { filter in
                            NBChip(title: filter.1, isSelected: selectedStatus == filter.0)
                                .onTapGesture { selectedStatus = filter.0 }
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, Spacing.md)
                }

                if isLoading {
                    NBLoadingView()
                } else if filteredOrders.isEmpty {
                    NBEmptyState(icon: "doc.text", title: "暂无订单")
                } else {
                    List(filteredOrders) { order in
                        NavigationLink(destination: TechOrderDetailView(orderId: order.id)) {
                            TechOrderRow(order: order)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("订单管理")
            .background(Color.nbBg)
            .task { await loadOrders() }
            .refreshable { await loadOrders() }
            .onChange(of: selectedStatus) { _ in
                Task { await loadOrders() }
            }
        }
    }

    private var filteredOrders: [Order] {
        if let status = selectedStatus {
            return orders.filter { $0.status == status }
        }
        return orders
    }

    private func loadOrders() async {
        do {
            orders = try await APIClient.shared.request(.technicianOrders(status: selectedStatus, customerId: nil))
            isLoading = false
        } catch { isLoading = false }
    }
}

struct TechOrderRow: View {
    let order: Order

    var body: some View {
        NBCard {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Text(order.orderNo)
                        .font(NBFont.captionLarge)
                        .foregroundColor(.nbTextSecondary)
                    Spacer()
                    NBChip(title: OrderStatus(rawValue: order.status)?.displayName ?? order.status)
                }

                Text(order.customTitle ?? order.serviceType ?? "预约")
                    .font(NBFont.titleSmall)
                    .foregroundColor(.nbTextPrimary)

                if let customer = order.customer {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "person.circle")
                            .foregroundColor(.nbTextTertiary)
                        Text(customer.name ?? "")
                            .font(NBFont.bodySmall)
                            .foregroundColor(.nbTextSecondary)
                    }
                }

                HStack {
                    if let start = order.startTime {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "clock")
                            Text(formatDateTime(start))
                        }
                        .font(NBFont.captionLarge)
                        .foregroundColor(.nbTextTertiary)
                    }
                    Spacer()
                    if let price = order.quotePrice, price > 0 {
                        Text("¥\(String(format: "%.0f", price))")
                            .font(NBFont.titleSmall)
                            .foregroundColor(.nbPrimary)
                    }
                }
            }
        }
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.lg, bottom: Spacing.sm, trailing: Spacing.lg))
        .listRowBackground(Color.nbBg)
    }

    private func formatDateTime(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return isoString }
        let f = DateFormatter()
        f.dateFormat = "MM/dd HH:mm"
        return f.string(from: date)
    }
}
