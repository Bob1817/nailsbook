import SwiftUI

// MARK: - Technician Orders List (aligned with wxapp design)

struct TechOrdersListView: View {
    @State private var orders: [Order] = []
    @State private var isLoading = true
    @State private var selectedDate = Date()
    @State private var selectedTab = "trips" // trips or all
    @State private var dayAccepting = true
    @State private var daySaving = false

    private var todayOrders: [Order] {
        orders.filter { order in
            guard let date = OrderActionView.parse(order.startTime) else { return false }
            return Calendar.current.isDate(date, inSameDayAs: selectedDate) && !["cancelled", "expired"].contains(order.status)
        }.sorted { ($0.startTime ?? "") < ($1.startTime ?? "") }
    }

    private var tripOrders: [Order] {
        todayOrders.filter { ["confirmed", "in_progress"].contains($0.status) }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Date strip + Tabs
                headSection

                // Content
                if isLoading {
                    skeletonList
                } else if currentOrders.isEmpty {
                    emptyState
                } else {
                    orderList
                }
            }
            .background(NBColors.page)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("行程")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(NBColors.ink)
                }
            }
            .task { await loadOrders() }
            .refreshable { await loadOrders() }
        }
    }

    // MARK: - Head Section

    private var headSection: some View {
        VStack(spacing: 12) {
            // Date strip
            HStack(spacing: 6) {
                // Today button
                dateCell(date: Date(), label: "今天", isToday: true)

                // Future dates
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(1..<7, id: \.self) { day in
                            if let date = Calendar.current.date(byAdding: .day, value: day, to: Date()) {
                                dateCell(date: date, label: weekdayName(date), isToday: false)
                            }
                        }
                    }
                }

                // More button
                Button("更多") {
                    // Open calendar
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(NBColors.link)
                .frame(width: 48, height: 63)
                .background(NBColors.page)
                .cornerRadius(Radius.lg)
            }
            .padding(.horizontal, 16)

            // Tabs
            HStack(spacing: 0) {
                tabButton(title: "今日行程", tag: "trips")
                tabButton(title: "当日预约", tag: "all")

                Spacer()

                Menu {
                    Button("全部行程") { }
                    Button("全部预约") { }
                } label: {
                    HStack(spacing: 4) {
                        Text("更多")
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.link)
                        Image(systemName: "chevron.down")
                            .font(.system(size: 10))
                            .foregroundColor(NBColors.link)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.08))
                    .cornerRadius(Radius.md)
                }
            }
            .padding(.horizontal, 16)

            // Booking day control
            bookingDayControl
        }
        .padding(.bottom, 12)
        .background(Color.white)
        .shadow(color: Color.black.opacity(0.04), radius: 8, y: 2)
    }

    private func dateCell(date: Date, label: String, isToday: Bool) -> some View {
        let isSelected = Calendar.current.isDate(date, inSameDayAs: selectedDate)

        return Button {
            selectedDate = date
        } label: {
            VStack(spacing: 2) {
                Text(label)
                    .font(.system(size: 12))
                    .foregroundColor(isSelected ? .white : NBColors.muted)

                Text("\(Calendar.current.component(.day, from: date))")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(isSelected ? .white : NBColors.ink)
            }
            .frame(width: 48, height: 63)
            .background(isSelected ? NBColors.action : NBColors.page)
            .cornerRadius(Radius.lg)
        }
    }

    private func tabButton(title: String, tag: String) -> some View {
        Button {
            selectedTab = tag
        } label: {
            VStack(spacing: 4) {
                Text(title)
                    .font(.system(size: 15, weight: selectedTab == tag ? .semibold : .medium))
                    .foregroundColor(selectedTab == tag ? NBColors.ink : NBColors.muted)

                if selectedTab == tag {
                    Capsule()
                        .fill(NBColors.secondary)
                        .frame(width: 14, height: 1)
                }
            }
            .frame(minHeight: 44)
            .padding(.horizontal, 4)
        }
    }

    private var bookingDayControl: some View {
        HStack(spacing: 10) {
            // Icon
            ZStack {
                RoundedRectangle(cornerRadius: 9)
                    .fill(dayAccepting ? NBColors.softSurface : NBColors.surface)
                    .frame(width: 32, height: 32)

                Image(systemName: "calendar")
                    .font(.system(size: 15))
                    .foregroundColor(NBColors.ink)
            }

            // Text
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text("当日接单")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(NBColors.ink)

                    Text(dayAccepting ? "已开放" : "已关闭")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(dayAccepting ? NBColors.success : NBColors.muted)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 1)
                        .background(dayAccepting ? NBColors.successSurface : NBColors.surface)
                        .cornerRadius(999)
                }

                Text(daySaving ? "正在更新设置…" : (dayAccepting ? "\(formatSelectedDate())，客户可提交新的预约申请" : "\(formatSelectedDate())，暂停接收新的预约申请"))
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.muted)
                    .lineLimit(1)
            }

            Spacer()

            // Switch
            Toggle("", isOn: $dayAccepting)
                .labelsHidden()
                .tint(NBColors.success)
                .onChange(of: dayAccepting) { _ in
                    Task { await toggleBookingDay() }
                }
        }
        .padding(12)
        .background(dayAccepting ? Color.white : NBColors.softSurface)
        .cornerRadius(Radius.lg)
        .padding(.horizontal, 16)
    }

    // MARK: - Order List

    private var orderList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(currentOrders) { order in
                    NavigationLink(destination: TechOrderDetailView(orderId: order.id)) {
                        orderCard(order)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 100)
        }
    }

    private func orderCard(_ order: Order) -> some View {
        HStack(alignment: .top, spacing: 12) {
            // Date box
            VStack(spacing: 2) {
                Text(formatMonth(order.startTime))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(NBColors.action)
                Text(formatDay(order.startTime))
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(NBColors.action)
                Text(formatWeekday(order.startTime))
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
                    Text(formatTimeRange(order.startTime, order.endTime))
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(NBColors.ink)

                    Spacer()

                    statusBadge(order.status)
                }

                if let customer = order.customer?.name {
                    HStack(spacing: 4) {
                        Image(systemName: "person")
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.muted)
                        Text(customer)
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.ink)
                    }
                }

                if let address = order.address {
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

                if let price = order.quotePrice, price > 0 {
                    Text("¥\(String(format: "%.0f", price))")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(NBColors.action)
                }
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(Radius.md)
        .shadow(color: Color.black.opacity(0.05), radius: 8, y: 2)
    }

    // MARK: - Skeleton List

    private var skeletonList: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(0..<2, id: \.self) { _ in
                    HStack(alignment: .top, spacing: 12) {
                        RoundedRectangle(cornerRadius: Radius.lg)
                            .fill(NBColors.page)
                            .frame(width: 56, height: 64)

                        VStack(alignment: .leading, spacing: 8) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(NBColors.page)
                                .frame(height: 16)
                                .frame(maxWidth: .infinity)
                            RoundedRectangle(cornerRadius: 4)
                                .fill(NBColors.page)
                                .frame(width: 120, height: 14)
                            RoundedRectangle(cornerRadius: 4)
                                .fill(NBColors.page)
                                .frame(width: 80, height: 14)
                        }
                    }
                    .padding(16)
                    .background(Color.white)
                    .cornerRadius(Radius.md)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 12) {
            Spacer()

            Text(selectedTab == "trips" ? "当日暂无行程" : "当日暂无预约")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)

            Text(selectedTab == "trips" ? "已确认排期的预约会显示在这里" : "换个日期看看")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)

            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 30)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 10, y: 2)
        .padding(.horizontal, 16)
        .padding(.top, 12)
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
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(bg)
            .foregroundColor(fg)
            .cornerRadius(Radius.md)
    }

    // MARK: - Computed Properties

    private var currentOrders: [Order] {
        selectedTab == "trips" ? tripOrders : todayOrders
    }

    // MARK: - Helpers

    private func weekdayName(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
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

    private func formatSelectedDate() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "M月d日"
        return formatter.string(from: selectedDate)
    }

    // MARK: - API

    private func loadOrders() async {
        do {
            orders = try await APIClient.shared.request(.technicianOrders(status: nil, customerId: nil))
            isLoading = false
        } catch {
            isLoading = false
        }
    }

    private func toggleBookingDay() async {
        guard !daySaving else { return }
        daySaving = true
        // Simulate API call
        try? await Task.sleep(nanoseconds: 500_000_000)
        daySaving = false
    }
}

// MARK: - Preview

#Preview {
    TechOrdersListView()
}
