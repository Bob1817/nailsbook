import SwiftUI

// MARK: - Business Data View (technician analytics dashboard)

struct BusinessDataView: View {
    @State private var insights: TechnicianInsights?
    @State private var isLoading = true
    @State private var selectedMonth = Date()
    @State private var error: String?

    var body: some View {
        ZStack {
            NBColors.page.ignoresSafeArea()

            if isLoading {
                loadingView
            } else if let insights = insights {
                contentView(insights)
            } else {
                errorRetryView
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle("经营数据")
        .task { await loadInsights() }
    }

    // MARK: - Loading / Error

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView().scaleEffect(1.2)
            Text("加载中...").font(.system(size: 14)).foregroundColor(NBColors.muted)
        }
    }

    private var errorRetryView: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "chart.bar.xaxis")
                .font(.system(size: 40)).foregroundColor(NBColors.muted)
            Text("暂无数据").font(.system(size: 18, weight: .semibold)).foregroundColor(NBColors.ink)
            Button("重新加载") { Task { await loadInsights() } }
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.white).padding(.horizontal, 24).frame(minHeight: 44)
                .background(NBColors.action).cornerRadius(Radius.xl)
            Spacer()
        }
    }

    // MARK: - Content

    private func contentView(_ data: TechnicianInsights) -> some View {
        ScrollView {
            VStack(spacing: 14) {
                // Month picker
                monthPicker
                    .padding(.horizontal, 16)

                // Summary hero
                summaryHero(data)

                // Core metrics
                coreMetrics(data)

                // Revenue trends
                if let trends = data.trends {
                    trendsSection(trends)
                }

                // Performance
                if let perf = data.performance {
                    performanceSection(perf)
                }

                // Referrals
                if let ref = data.referrals {
                    referralsSection(ref)
                }

                // Reminders
                if let reminders = data.reminders, !reminders.isEmpty {
                    remindersSection(reminders)
                }

                Spacer().frame(height: 30)
            }
            .padding(.top, 8)
        }
        .refreshable { await loadInsights() }
    }

    // MARK: - Month Picker

    private var monthPicker: some View {
        HStack {
            DatePicker("选择月份", selection: $selectedMonth, displayedComponents: .date)
                .labelsHidden()
                .datePickerStyle(.compact)
                .onChange(of: selectedMonth) { _ in
                    Task { await loadInsights() }
                }

            Spacer()

            Text(monthString)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(NBColors.muted)
        }
        .padding(12)
        .background(Color.white)
        .cornerRadius(Radius.md)
    }

    // MARK: - Summary Hero

    private func summaryHero(_ data: TechnicianInsights) -> some View {
        VStack(spacing: 0) {
            // Revenue
            VStack(spacing: 4) {
                Text("本月确认收入")
                    .font(.system(size: 13))
                    .foregroundColor(.white.opacity(0.8))
                Text(formatMoney(data.revenue?.monthConfirmed ?? 0))
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)

            // 3 stat boxes
            HStack(spacing: 0) {
                heroStatBox("完成订单", value: "\(data.bookings?.monthCompleted ?? 0)")
                heroStatBox("新增客户", value: "\(data.customers?.newThisMonth ?? 0)")
                heroStatBox("复购率", value: String(format: "%.1f%%", (data.customers?.repeatRate ?? 0) * 100))
            }
        }
        .background(NBColors.action)
        .cornerRadius(Radius.lg)
        .padding(.horizontal, 16)
    }

    private func heroStatBox(_ label: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.8))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.white.opacity(0.12))
    }

    // MARK: - Core Metrics

    private func coreMetrics(_ data: TechnicianInsights) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                metricCard("客单价", value: "¥\(Int(data.revenue?.averageTicket ?? 0))", note: "月均")
                Divider().frame(height: 50)
                metricCard("客户总数", value: "\(data.customers?.total ?? 0)", note: "累计")
            }
            Divider()
            HStack(spacing: 0) {
                metricCard("月评分", value: String(format: "%.1f", data.rating?.average ?? 0), note: "\(data.rating?.count ?? 0) 条评价")
                Divider().frame(height: 50)
                metricCard("本月作品", value: "\(data.works?.total ?? 0)", note: "已发布")
            }
        }
        .background(Color.white)
        .cornerRadius(Radius.lg)
        .shadow(color: Color.black.opacity(0.04), radius: 8, y: 2)
        .padding(.horizontal, 16)
    }

    private func metricCard(_ label: String, value: String, note: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(NBColors.ink)
            Text(label)
                .font(.system(size: 13))
                .foregroundColor(NBColors.muted)
            Text(note)
                .font(.system(size: 11))
                .foregroundColor(NBColors.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
    }

    // MARK: - Trends Section

    private func trendsSection(_ trends: InsightsTrends) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("收入趋势")

            if let daily = trends.daily, !daily.isEmpty {
                VStack(spacing: 0) {
                    // Header
                    trendRow(date: "日期", orders: "订单", revenue: "收入", isHeader: true)
                    Divider()
                    ForEach(daily.prefix(10), id: \.period) { item in
                        trendRow(date: formatTrendDate(item.period), orders: "\(item.bookings ?? 0)", revenue: formatMoney(item.revenue ?? 0), isHeader: false)
                        Divider()
                    }
                }
                .background(Color.white)
                .cornerRadius(Radius.md)
            } else {
                emptyCard("暂无趋势数据")
            }
        }
        .padding(.horizontal, 16)
    }

    private func trendRow(date: String, orders: String, revenue: String, isHeader: Bool) -> some View {
        HStack {
            Text(date)
                .font(.system(size: isHeader ? 12 : 13, weight: isHeader ? .semibold : .regular))
                .foregroundColor(isHeader ? NBColors.muted : NBColors.ink)
                .frame(width: 80, alignment: .leading)

            Text(orders)
                .font(.system(size: isHeader ? 12 : 13, weight: isHeader ? .semibold : .regular))
                .foregroundColor(isHeader ? NBColors.muted : NBColors.ink)
                .frame(width: 60)

            Spacer()

            Text(revenue)
                .font(.system(size: isHeader ? 12 : 13, weight: isHeader ? .semibold : .medium))
                .foregroundColor(isHeader ? NBColors.muted : NBColors.action)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }

    // MARK: - Performance Section

    private func performanceSection(_ perf: InsightsPerformance) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("服务与时段")

            if let services = perf.topServices, !services.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("热门服务 TOP 3")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(NBColors.muted)

                    ForEach(Array(services.prefix(3).enumerated()), id: \.offset) { idx, svc in
                        HStack {
                            Text("\(idx + 1)")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(NBColors.action)
                                .frame(width: 24)
                            Text(svc.name ?? "")
                                .font(.system(size: 14))
                                .foregroundColor(NBColors.ink)
                            Spacer()
                            Text("\(svc.orders ?? 0) 单")
                                .font(.system(size: 13))
                                .foregroundColor(NBColors.muted)
                            Text(formatMoney(svc.revenue ?? 0))
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(NBColors.ink)
                        }
                        .padding(.vertical, 4)
                    }
                }
                .padding(14)
                .background(Color.white)
                .cornerRadius(Radius.md)
            }

            if let slots = perf.topTimeSlots, !slots.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("热门时段 TOP 3")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(NBColors.muted)

                    ForEach(Array(slots.prefix(3).enumerated()), id: \.offset) { idx, slot in
                        HStack {
                            Text("\(idx + 1)")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(NBColors.link)
                                .frame(width: 24)
                            Text(slot.slot ?? "")
                                .font(.system(size: 14))
                                .foregroundColor(NBColors.ink)
                            Spacer()
                            Text("\(slot.orders ?? 0) 单")
                                .font(.system(size: 13))
                                .foregroundColor(NBColors.muted)
                        }
                        .padding(.vertical, 4)
                    }
                }
                .padding(14)
                .background(Color.white)
                .cornerRadius(Radius.md)
            }

            if perf.sufficientData == false {
                Text("数据样本不足（至少需要 \(perf.minimumSampleSize ?? 5) 单）")
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.muted)
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Referrals Section

    private func referralsSection(_ ref: InsightsReferrals) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("推荐活动")

            HStack(spacing: 0) {
                metricCard("总推荐", value: "\(ref.total ?? 0)", note: "人次")
                Divider().frame(height: 50)
                metricCard("达标推荐", value: "\(ref.qualified ?? 0)", note: "人次")
                Divider().frame(height: 50)
                metricCard("转化率", value: String(format: "%.1f%%", (ref.conversionRate ?? 0) * 100), note: "")
            }
            .background(Color.white)
            .cornerRadius(Radius.md)
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Reminders Section

    private func remindersSection(_ reminders: [InsightsReminder]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("经营提醒")

            VStack(spacing: 0) {
                ForEach(reminders) { reminder in
                    HStack(spacing: 10) {
                        Image(systemName: reminderIcon(reminder.type))
                            .font(.system(size: 16))
                            .foregroundColor(reminderColor(reminder.type))
                            .frame(width: 28)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(reminder.customerName ?? "")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(NBColors.ink)
                            Text(reminder.reason ?? "")
                                .font(.system(size: 12))
                                .foregroundColor(NBColors.muted)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.system(size: 12))
                            .foregroundColor(NBColors.control)
                    }
                    .padding(.vertical, 10)
                    Divider()
                }
            }
            .padding(14)
            .background(Color.white)
            .cornerRadius(Radius.md)
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Helpers

    private func sectionHeader(_ title: String) -> some View {
        HStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 2).fill(NBColors.action).frame(width: 3, height: 16)
            Text(title).font(.system(size: 17, weight: .bold)).foregroundColor(NBColors.ink)
        }
    }

    private func emptyCard(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 14))
            .foregroundColor(NBColors.muted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
            .background(Color.white)
            .cornerRadius(Radius.md)
    }

    private var monthString: String {
        let f = DateFormatter()
        f.dateFormat = "yyyy年M月"
        return f.string(from: selectedMonth)
    }

    private func formatMoney(_ amount: Double) -> String {
        if amount >= 10000 {
            return String(format: "¥%.1f万", amount / 10000)
        }
        return "¥\(Int(amount))"
    }

    private func formatTrendDate(_ iso: String?) -> String {
        guard let iso = iso else { return "" }
        // If it's a date string like "2024-09-15", extract day
        if iso.count >= 10 {
            return String(iso.suffix(5))
        }
        return iso
    }

    private func reminderIcon(_ type: String?) -> String {
        switch type {
        case "due": return "clock.arrow.circlepath"
        case "dormant": return "moon.zzz"
        case "high_value": return "star.fill"
        default: return "bell"
        }
    }

    private func reminderColor(_ type: String?) -> Color {
        switch type {
        case "due": return NBColors.warning
        case "dormant": return NBColors.muted
        case "high_value": return NBColors.action
        default: return NBColors.muted
        }
    }

    // MARK: - Data Loading

    private func loadInsights() async {
        isLoading = true
        defer { isLoading = false }

        let f = DateFormatter()
        f.dateFormat = "yyyy-MM"
        f.timeZone = TimeZone(identifier: "Asia/Shanghai")
        let month = f.string(from: selectedMonth)

        do {
            insights = try await APIClient.shared.request(.technicianInsights(month: month))
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack { BusinessDataView() }
}