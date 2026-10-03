import SwiftUI

// MARK: - Client Orders (aligned with wxapp design)

struct ClientOrdersView: View {
    @State private var orders: [Order] = []
    @State private var isLoading = true
    @State private var selectedStatus: String?
    // 新建预约：选择美甲师 → 创建预约（对齐 wxapp create-order 场景）
    @State private var showTechPicker = false
    @State private var techs: [BoundTechnician] = []
    @State private var techPickerLoading = false
    @State private var pickedTechId: Int?
    @State private var pickedTechName = ""

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
                NBClientPageHeader(title: "我的预约", subtitle: "查看预约进度，安排每一次美甲")

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
            // onAppear：进入与从详情页返回时都刷新，保证美甲师端确认后状态同步
            .onAppear { Task { await loadOrders() } }
            .refreshable { await loadOrders() }
            // 新建预约入口
            .background(
                NavigationLink(
                    destination: Group {
                        if let id = pickedTechId {
                            CreateOrderView(techId: id, techName: pickedTechName)
                        }
                    },
                    isActive: Binding(
                        get: { pickedTechId != nil },
                        set: { if !$0 { pickedTechId = nil } }
                    )
                ) { EmptyView() }
                .hidden()
            )
            .sheet(isPresented: $showTechPicker) {
                techPickerSheet
                    .presentationDetents([.medium, .large])
                }
        }
    }

    // MARK: - Technician Picker (新建预约第一步)

    private var techPickerSheet: some View {
        NavigationStack {
            Group {
                if techPickerLoading {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if techs.isEmpty {
                    VStack(spacing: 12) {
                        Text("暂未绑定美甲师")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(NBColors.ink)
                        Text("请先在首页绑定美甲师后再发起预约")
                            .font(.system(size: 12))
                            .foregroundColor(NBColors.muted)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(spacing: 12) {
                            ForEach(techs) { tech in
                                Button {
                                    pickedTechName = tech.name ?? "美甲师"
                                    pickedTechId = tech.id
                                    showTechPicker = false
                                } label: {
                                    HStack(spacing: 12) {
                                        ZStack {
                                            Circle().fill(NBColors.page).frame(width: 40, height: 40)
                                            Text(String((tech.name ?? "美").prefix(1)))
                                                .font(.system(size: 14))
                                                .foregroundColor(NBColors.muted)
                                        }
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(tech.name ?? "美甲师")
                                                .font(.system(size: 14, weight: .semibold))
                                                .foregroundColor(NBColors.ink)
                                            if let shop = (tech.shopAddresses ?? []).first(where: { $0.enabled != false }) {
                                                Text(shop.name)
                                                    .font(.system(size: 11))
                                                    .foregroundColor(NBColors.muted)
                                            }
                                        }
                                        Spacer()
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 12))
                                            .foregroundColor(NBColors.muted)
                                    }
                                    .padding(12)
                                    .background(Color.white)
                                    .cornerRadius(12)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(16)
                    }
                    .background(NBColors.page)
                }
            }
            .navigationTitle("选择美甲师")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("取消") { showTechPicker = false }
                }
            }
        }
    }

    private func loadTechnicians() async {
        techPickerLoading = true
        defer { techPickerLoading = false }
        if let me: ClientUser = try? await APIClient.shared.request(.clientMe) {
            techs = me.technicians ?? []
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
                Task { await loadTechnicians() }
                showTechPicker = true
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

    /// 预约卡片，视觉与 wxapp pages/client/orders 预约卡片统一：
    /// 字号 font-xs=11 / font-sm=12 / font-md=14 / font-2xl=24（NBFont token），
    /// 圆角 24rpx=12pt、无阴影、footer 无背景，icon 与文字基线对齐。
    private func orderCard(_ order: Order) -> some View {
        VStack(spacing: 0) {
            // Body: date + details (wxapp order-card-body)
            HStack(alignment: .top, spacing: 10) {
                // Date box - wxapp order-date-box
                VStack(spacing: 2) {
                    Text(orderMonth(order.startTime))
                        .font(NBFont.captionMedium.weight(.medium))
                        .foregroundColor(NBColors.action)
                    Text(orderDay(order.startTime))
                        .font(NBFont.displaySmall.weight(.bold))
                        .foregroundColor(NBColors.action)
                        .lineLimit(1)
                    Text(orderWeekday(order.startTime))
                        .font(NBFont.captionMedium)
                        .foregroundColor(Color.black.opacity(0.72))
                        .padding(.top, 2)
                }
                .frame(width: 52)
                .frame(minHeight: 60)
                .background(NBColors.page)
                .cornerRadius(9)

                // Details - wxapp order-details
                VStack(alignment: .leading, spacing: 4) {
                    // Title row: time + status (wxapp order-title-row)
                    HStack(alignment: .top, spacing: 8) {
                        HStack(alignment: .firstTextBaseline, spacing: 5) {
                            Image(systemName: "clock")
                                .font(.system(size: 12))
                                .foregroundColor(NBColors.muted)
                            Text(orderTimeTitle(order.startTime, order.endTime))
                                .font(NBFont.bodyMedium.weight(.semibold))
                                .foregroundColor(NBColors.ink)
                                .lineLimit(1)
                        }

                        Spacer(minLength: 8)

                        statusBadge(order.status)
                    }

                    // Service type
                    infoRow(icon: isShopService(order) ? "storefront" : "house",
                           text: serviceModeText(order))

                    // Technician
                    if let tech = order.technician?.name {
                        infoRow(icon: "person", text: "美甲师 \(tech)")
                    }

                    // Address
                    infoRow(icon: "mappin.and.ellipse",
                           text: order.address ?? "地址待确认",
                           textColor: NBColors.muted,
                           lineLimit: 2)

                    // Payment
                    paymentRow(order)

                    // Deposit
                    depositRow(order)
                }
            }

            // Footer - wxapp order-footer
            HStack(alignment: .center) {
                HStack(alignment: .center, spacing: 6) {
                    Image(systemName: "clock")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(NBColors.muted)

                    // 状态仅由右上角徽章展示；此处只保留预约信息与说明文字
                    VStack(alignment: .leading, spacing: 1) {
                        if !order.isTerminal {
                            Text(countdownText(order))
                                .font(NBFont.captionLarge.weight(.semibold))
                                .foregroundColor(NBColors.secondary)
                        }
                        Text(nextStepText(order))
                            .font(NBFont.captionMedium)
                            .foregroundColor(NBColors.muted)
                    }
                }

                Spacer()

                HStack(spacing: 4) {
                    Text("查看详情")
                        .font(NBFont.captionLarge.weight(.semibold))
                        .foregroundColor(NBColors.link)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(NBColors.line)
                }
            }
            .padding(.top, 8)
            .frame(minHeight: 44)
        }
        .padding(12)
        .background(Color.white)
        .cornerRadius(12)
    }

    /// 信息行：icon 与首行文字基线对齐（wxapp info-row / info-icon 28rpx 顶部对齐）
    private func infoRow(icon: String,
                         text: String,
                         textColor: Color = NBColors.ink,
                         lineLimit: Int? = 1) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundColor(NBColors.muted)
            Text(text)
                .font(NBFont.captionMedium)
                .foregroundColor(textColor)
                .lineLimit(lineLimit)
        }
    }

    /// 支付行：有报价显示价格（wxapp nb-money 色），否则显示报价等待文案
    @ViewBuilder
    private func paymentRow(_ order: Order) -> some View {
        if let price = order.quotePrice {
            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Image(systemName: "wallet")
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.muted)
                Text("¥\(String(format: "%.0f", price))")
                    .font(NBFont.captionMedium.weight(.medium))
                    .foregroundColor(NBColors.money)
                    .monospacedDigit()
            }
        } else {
            infoRow(icon: "wallet",
                    text: order.status == "pending_quote" ? "等待美甲师报价" : "暂未提供报价",
                    textColor: NBColors.muted)
        }
    }

    /// 定金行：与其他信息行一致的 icon + 文字结构，展示定金金额与支付状态
    /// （depositAmount 单位为分，与 wxapp 一致按 /100 转为元展示）
    @ViewBuilder
    private func depositRow(_ order: Order) -> some View {
        if let deposit = order.depositAmount, deposit > 0 {
            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Image(systemName: "creditcard")
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.muted)
                (Text("定金 ")
                    + Text("¥\(String(format: "%.0f", deposit / 100))")
                        .foregroundColor(NBColors.money)
                    + Text(order.isDepositPaid == true ? " · 已支付" : " · 未支付"))
                    .font(NBFont.captionMedium)
                    .foregroundColor(NBColors.muted)
            }
        }
    }

    /// 服务方式判断与 wxapp 一致：serviceType 为中文枚举（到店美甲/上门美甲）
    private func isShopService(_ order: Order) -> Bool {
        order.serviceType == "到店美甲"
    }

    private func serviceModeText(_ order: Order) -> String {
        if order.serviceType == "到店美甲" { return "到店美甲" }
        if order.serviceType == "上门美甲" { return "上门美甲" }
        return "服务方式待确认"
    }

    // MARK: - Skeleton Card

    private var skeletonCard: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 9)
                    .fill(NBColors.page)
                    .frame(width: 52, height: 60)

                VStack(alignment: .leading, spacing: 8) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(NBColors.page)
                        .frame(height: 18)
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

            HStack {
                RoundedRectangle(cornerRadius: 4)
                    .fill(NBColors.page)
                    .frame(width: 100, height: 14)
                Spacer()
                RoundedRectangle(cornerRadius: 4)
                    .fill(NBColors.page)
                    .frame(width: 60, height: 14)
            }
            .padding(.top, 8)
            .frame(minHeight: 44)
        }
        .padding(12)
        .background(Color.white)
        .cornerRadius(12)
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

    /// 颜色映射对齐 wxapp STATUS_MAP：进行中/待报价/已报价/已确认为中性蓝灰，已完成为灰，已取消为红；
    /// 未知状态统一兜底为「状态待确认」，不向用户暴露底层代码状态
    private func statusBadge(_ status: String) -> some View {
        let (text, bg, fg): (String, Color, Color) = switch status {
        case "pending_quote": ("待报价", NBColors.softSurface, NBColors.link)
        case "quoted": ("已报价", NBColors.softSurface, NBColors.link)
        case "pending_agree": ("待确认", NBColors.softSurface, NBColors.link)
        case "pending_confirm": ("待确认", NBColors.softSurface, NBColors.link)
        case "pending_client_confirm": ("待客户确认", NBColors.softSurface, NBColors.link)
        case "confirmed": ("已确认", NBColors.softSurface, NBColors.link)
        case "pending_shop": ("待到店", NBColors.successSurface, NBColors.success)
        case "in_progress": ("进行中", NBColors.softSurface, NBColors.link)
        case "completed": ("已完成", NBColors.softSurface, NBColors.ink)
        case "cancelled": ("已取消", NBColors.dangerSurface, NBColors.danger)
        case "expired": ("已过期", NBColors.softSurface, NBColors.ink)
        case "rejected": ("已拒绝", NBColors.dangerSurface, NBColors.danger)
        default: ("状态待确认", NBColors.softSurface, NBColors.ink)
        }

        return Text(text)
            .font(NBFont.captionMedium.weight(.medium))
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
        guard let start = start else { return "预约时间待确认" }
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

    /// 倒计时文案，对齐 wxapp formatCountdown
    private func countdownText(_ order: Order) -> String {
        if order.status == "in_progress" { return "服务进行中" }
        guard let start = order.startTime, let date = parseDate(start) else { return "预约时间待确认" }

        let diff = date.timeIntervalSinceNow
        if diff <= 0 { return "预约即将开始" }

        let totalMinutes = Int(ceil(diff / 60))
        let days = totalMinutes / 1440
        let hours = (totalMinutes % 1440) / 60
        let minutes = totalMinutes % 60
        if days > 0 { return "距离预约还有 \(days)天\(hours > 0 ? "\(hours)小时" : "")" }
        if hours > 0 { return "距离预约还有 \(hours)小时\(minutes > 0 ? "\(minutes)分钟" : "")" }
        return "距离预约还有 \(max(minutes, 1))分钟"
    }

    /// 下一步文案，对齐 wxapp NEXT_STEP_MAP
    private func nextStepText(_ order: Order) -> String {
        switch order.status {
        case "pending_quote": return "美甲师报价后会通知你"
        case "quoted": return "请确认报价与预约时间"
        case "pending_confirm": return "美甲师正在确认最终排期"
        case "confirmed": return "预约已确认，请按时到达"
        case "pending_shop": return "请按预约时间前往门店"
        case "in_progress": return "服务正在进行，完成后可上传照片"
        case "completed": return "可以评价并加入你的美甲记录"
        case "expired": return "预约已过期，可重新发起预约"
        case "cancelled": return "该预约已取消，可重新预约"
        case "rejected": return "报价未达成，可重新预约"
        default: return "点击查看预约详情"
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
    /// 终态集合对齐 wxapp TERMINAL_STATUSES
    var isTerminal: Bool {
        ["completed", "expired", "cancelled", "rejected"].contains(status)
    }

    var statusText: String {
        switch status {
        case "pending_quote": return "待报价"
        case "quoted": return "已报价"
        case "pending_agree": return "待确认"
        case "pending_confirm": return "待确认"
        case "pending_client_confirm": return "待客户确认"
        case "confirmed": return "已确认"
        case "pending_shop": return "待到店"
        case "in_progress": return "进行中"
        case "completed": return "已完成"
        case "cancelled": return "已取消"
        case "rejected": return "已拒绝"
        case "expired": return "已过期"
        default: return "状态待确认"
        }
    }
}

// MARK: - Preview

#Preview {
    ClientOrdersView()
}
