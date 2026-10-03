import SwiftUI

// MARK: - Schedule Management View (booking day toggles + settings)

struct ScheduleManagementView: View {
    @State private var bookingDays: [BookingDay] = []
    @State private var settings: BookingSettings?
    @State private var isLoading = true
    @State private var savingDate: String?
    @State private var savingSettings = false
    @State private var error: String?

    // Generate next 14 days
    private var dates: [Date] {
        (0..<14).compactMap { Calendar.current.date(byAdding: .day, value: $0, to: Date()) }
    }

    var body: some View {
        ZStack {
            NBColors.page.ignoresSafeArea()

            if isLoading {
                loadingView
            } else {
                contentView
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle("排班管理")
        .task { await loadBookingDays() }
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView().scaleEffect(1.2)
            Text("加载中...").font(.system(size: 14)).foregroundColor(NBColors.muted)
        }
    }

    // MARK: - Content

    private var contentView: some View {
        ScrollView {
            VStack(spacing: 14) {
                // Quick booking settings
                quickBookingCard

                // Info text
                Text("开关当日接单状态，客户将根据以下设置决定是否可以提交预约")
                    .font(.system(size: 13))
                    .foregroundColor(NBColors.muted)
                    .padding(.horizontal, 20)

                // Day list
                VStack(spacing: 0) {
                    ForEach(Array(dates.enumerated()), id: \.offset) { _, date in
                        dayRow(date)
                        if dates.last != date {
                            Divider().padding(.leading, 60)
                        }
                    }
                }
                .background(Color.white)
                .cornerRadius(Radius.lg)
                .shadow(color: Color.black.opacity(0.04), radius: 8, y: 2)
                .padding(.horizontal, 16)

                Spacer().frame(height: 30)
            }
            .padding(.top, 12)
        }
        .refreshable { await loadBookingDays() }
    }

    // MARK: - Quick Booking Card

    private var quickBookingCard: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(settings?.quickBookingEnabled == true ? NBColors.success.opacity(0.12) : NBColors.page)
                    .frame(width: 40, height: 40)
                Image(systemName: "bolt.fill")
                    .font(.system(size: 18))
                    .foregroundColor(settings?.quickBookingEnabled == true ? NBColors.success : NBColors.muted)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("快速预约")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(NBColors.ink)
                Text(settings?.quickBookingEnabled == true ? "已开启，客户可通过分享链接快速预约" : "未开启，客户需要先绑定再预约")
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.muted)
                    .lineLimit(1)
            }

            Spacer()

            Toggle("", isOn: Binding(
                get: { settings?.quickBookingEnabled ?? false },
                set: { newValue in
                    Task { await updateQuickBooking(newValue) }
                }
            ))
            .labelsHidden()
            .tint(NBColors.success)
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(Radius.lg)
        .shadow(color: Color.black.opacity(0.04), radius: 8, y: 2)
        .padding(.horizontal, 16)
    }

    // MARK: - Day Row

    private func dayRow(_ date: Date) -> some View {
        let dateStr = formatDate(date)
        let day = bookingDays.first(where: { $0.serviceDate == dateStr })
        let accepting = day?.accepting ?? true
        let isSaving = savingDate == dateStr
        let isToday = Calendar.current.isDateInToday(date)

        return HStack(spacing: 12) {
            // Date label
            VStack(spacing: 2) {
                Text(weekdayName(date))
                    .font(.system(size: 12, weight: isToday ? .bold : .regular))
                    .foregroundColor(isToday ? NBColors.action : NBColors.muted)
                Text("\(Calendar.current.component(.day, from: date))")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(isToday ? NBColors.action : NBColors.ink)
            }
            .frame(width: 44)

            // Status
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(isToday ? "今天" : dateStr)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(NBColors.ink)

                    if isToday {
                        Text("·")
                            .foregroundColor(NBColors.muted)
                        Text(accepting ? "接单中" : "已休息")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(accepting ? NBColors.success : NBColors.muted)
                    }
                }

                Text(accepting ? "客户可提交预约" : "暂停接收新预约")
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.muted)
            }

            Spacer()

            // Toggle or spinner
            if isSaving {
                ProgressView().scaleEffect(0.8)
            } else {
                Toggle("", isOn: Binding(
                    get: { accepting },
                    set: { newValue in
                        Task { await toggleDay(dateStr, accepting: newValue, version: day?.version ?? 0) }
                    }
                ))
                .labelsHidden()
                .tint(NBColors.success)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    // MARK: - Actions

    private func loadBookingDays() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: BookingDaysResponse = try await APIClient.shared.request(.bookingDaysList)
            bookingDays = response.days ?? []
            settings = response.settings
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func toggleDay(_ dateStr: String, accepting: Bool, version: Int) async {
        guard savingDate == nil else { return }
        savingDate = dateStr
        defer { savingDate = nil }

        do {
            try await APIClient.shared.requestVoid(.bookingDayUpdate(date: dateStr, accepting: accepting, version: version))
            // Reload to get updated version
            await loadBookingDays()
        } catch {
            self.error = "更新失败：\(error.localizedDescription)"
        }
    }

    private func updateQuickBooking(_ enabled: Bool) async {
        guard !savingSettings else { return }
        savingSettings = true
        defer { savingSettings = false }

        do {
            try await APIClient.shared.requestVoid(.bookingDaysSettingsUpdate(params: ["quickBookingEnabled": enabled]))
            settings?.quickBookingEnabled = enabled
        } catch {
            self.error = "更新失败"
        }
    }

    // MARK: - Helpers

    private func formatDate(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "Asia/Shanghai")
        return f.string(from: date)
    }

    private func weekdayName(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "zh_CN")
        f.dateFormat = "EEE"
        return f.string(from: date)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack { ScheduleManagementView() }
}