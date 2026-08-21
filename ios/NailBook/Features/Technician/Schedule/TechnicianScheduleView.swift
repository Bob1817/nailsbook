import SwiftUI

// MARK: - Technician Schedule (Week View + Day Timeline)

struct TechnicianScheduleView: View {
    @State private var selectedDate = Date()
    @State private var orders: [Order] = []
    @State private var isLoading = true
    @State private var weekDates: [Date] = []

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Week calendar
                weekCalendar

                Divider()

                // Day orders timeline
                if isLoading {
                    NBLoadingView()
                } else if dayOrders.isEmpty {
                    NBEmptyState(icon: "calendar", title: "当日无预约")
                } else {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(dayOrders) { order in
                                NavigationLink(destination: TechOrderDetailView(orderId: order.id)) {
                                    timelineRow(order)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, Spacing.lg)
                    }
                }
            }
            .navigationTitle("行程")
            .background(Color.nbBg)
            .task {
                buildWeekDates()
                await loadOrders()
            }
            .refreshable { await loadOrders() }
        }
    }

    // MARK: - Week Calendar

    private var weekCalendar: some View {
        VStack(spacing: Spacing.sm) {
            // Month header
            HStack {
                Text(monthTitle)
                    .font(NBFont.titleMedium)
                    .foregroundColor(.nbTextPrimary)
                Spacer()
            }
            .padding(.horizontal, Spacing.lg)

            // Day cells
            HStack(spacing: 0) {
                ForEach(weekDates, id: \.self) { date in
                    Button {
                        selectedDate = date
                        Task { await loadOrders() }
                    } label: {
                        VStack(spacing: Spacing.xs) {
                            Text(weekdaySymbol(date))
                                .font(NBFont.captionMedium)
                                .foregroundColor(.nbTextTertiary)
                            Text(dayNumber(date))
                                .font(NBFont.titleMedium)
                                .foregroundColor(Calendar.current.isDate(date, inSameDayAs: selectedDate) ? .white : .nbTextPrimary)
                                .frame(width: 36, height: 36)
                                .background(Calendar.current.isDate(date, inSameDayAs: selectedDate) ? Color.nbPrimary : Color.clear)
                                .cornerRadius(Radius.full)
                            // Order count dot
                            let count = orderCount(for: date)
                            if count > 0 {
                                Text("\(count)")
                                    .font(NBFont.captionSmall)
                                    .foregroundColor(.nbPrimary)
                            } else {
                                Circle()
                                    .fill(Color.clear)
                                    .frame(width: 6, height: 6)
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
            .padding(.horizontal, Spacing.sm)
        }
        .padding(.vertical, Spacing.md)
        .background(Color.nbSurface)
    }

    // MARK: - Timeline Row

    private func timelineRow(_ order: Order) -> some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            // Time column
            VStack(alignment: .trailing, spacing: 2) {
                Text(formatTime(order.startTime))
                    .font(NBFont.titleSmall)
                    .foregroundColor(.nbTextPrimary)
                Text(formatTime(order.endTime))
                    .font(NBFont.captionLarge)
                    .foregroundColor(.nbTextTertiary)
            }
            .frame(width: 50)

            // Timeline dot + line
            VStack(spacing: 0) {
                Circle()
                    .fill(statusColor(order.status))
                    .frame(width: 12, height: 12)
                Rectangle()
                    .fill(Color.nbDivider)
                    .frame(width: 1)
                    .frame(minHeight: 40)
            }

            // Order card
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Text(order.customTitle ?? order.serviceType ?? "预约")
                        .font(NBFont.bodyLarge)
                        .foregroundColor(.nbTextPrimary)
                    Spacer()
                    NBChip(title: OrderStatus(rawValue: order.status)?.displayName ?? order.status)
                }

                if let customer = order.customer {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "person")
                            .font(.system(size: 12))
                        Text(customer.name ?? "")
                    }
                    .font(NBFont.captionLarge)
                    .foregroundColor(.nbTextSecondary)
                }

                if let address = order.address {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "location")
                            .font(.system(size: 12))
                        Text(address)
                    }
                    .font(NBFont.captionLarge)
                    .foregroundColor(.nbTextTertiary)
                    .lineLimit(1)
                }

                if let price = order.quotePrice, price > 0 {
                    Text("¥\(String(format: "%.0f", price))")
                        .font(NBFont.titleSmall)
                        .foregroundColor(.nbPrimary)
                }
            }
            .padding(Spacing.md)
            .background(Color.nbSurface)
            .cornerRadius(Radius.md)
            .shadow(color: .black.opacity(0.04), radius: 4, y: 1)
        }
        .padding(.vertical, Spacing.sm)
    }

    // MARK: - Helpers

    private var dayOrders: [Order] {
        orders.filter { order in
            guard let start = order.startTime else { return false }
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            guard let orderDate = formatter.date(from: start) else { return false }
            return Calendar.current.isDate(orderDate, inSameDayAs: selectedDate)
        }
    }

    private func orderCount(for date: Date) -> Int {
        orders.filter { order in
            guard let start = order.startTime else { return false }
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            guard let orderDate = formatter.date(from: start) else { return false }
            return Calendar.current.isDate(orderDate, inSameDayAs: date)
        }.count
    }

    private func buildWeekDates() {
        let calendar = Calendar.current
        let today = Date()
        let weekday = calendar.component(.weekday, from: today)
        let startOfWeek = calendar.date(byAdding: .day, value: -(weekday - 1), to: today)!
        weekDates = (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: startOfWeek) }
    }

    private var monthTitle: String {
        let f = DateFormatter()
        f.dateFormat = "yyyy年M月"
        return f.string(from: selectedDate)
    }

    private func weekdaySymbol(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "zh_CN")
        f.dateFormat = "EEE"
        return f.string(from: date)
    }

    private func dayNumber(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "d"
        return f.string(from: date)
    }

    private func formatTime(_ isoString: String?) -> String {
        guard let isoString else { return "--:--" }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return "--:--" }
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        return f.string(from: date)
    }

    private func statusColor(_ status: String) -> Color {
        switch OrderStatus(rawValue: status) {
        case .pendingQuote: return .nbWarning
        case .quoted: return .nbInfo
        case .inProgress: return .nbSuccess
        case .completed: return .nbSuccessDark
        case .cancelled, .expired: return .nbTextTertiary
        default: return .nbPrimary
        }
    }

    private func loadOrders() async {
        do {
            orders = try await APIClient.shared.request(.technicianOrders(status: nil, customerId: nil))
            isLoading = false
        } catch { isLoading = false }
    }
}
