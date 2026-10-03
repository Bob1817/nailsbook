import SwiftUI

// MARK: - Client Order Detail (aligned with wxapp design)

struct ClientOrderDetailView: View {
    let orderId: Int
    @State private var order: Order?
    @State private var isLoading = true
    @State private var showRejectSheet = false
    @State private var rejectReason = ""
    @State private var cancelling = false
    @State private var reviewing = false
    @State private var busy = false
    @State private var error: String?
    @State private var navigateToChat = false

    var body: some View {
        ZStack {
            NBColors.page.ignoresSafeArea()

            if isLoading {
                loadingView
            } else if let order = order {
                orderContent(order)
            } else {
                errorView
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle("预约详情")
        .toolbar(.hidden, for: .tabBar)
        .task {
            await loadOrder()
            // 前台轮询：及时同步美甲师端的确认/报价等状态变化（15 秒一次，视图销毁自动停止）
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 15_000_000_000)
                guard !Task.isCancelled else { break }
                await loadOrder()
            }
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("加载中...")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)
        }
    }

    // MARK: - Error View

    private var errorView: some View {
        VStack(spacing: 16) {
            Spacer()

            ZStack {
                Circle()
                    .fill(NBColors.page)
                    .frame(width: 44, height: 44)
                Text("!")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(NBColors.ink)
            }

            Text("加载失败")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(NBColors.ink)

            Text("请检查网络后重试")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)

            Button("重新加载") {
                Task { await loadOrder() }
            }
            .font(.system(size: 15, weight: .medium))
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .frame(minHeight: 44)
            .background(NBColors.action)
            .cornerRadius(Radius.xl)

            Spacer()
        }
    }

    // MARK: - Order Content

    private func orderContent(_ order: Order) -> some View {
        ScrollView {
            VStack(spacing: 0) {
                // Status header
                statusHeader(order)

                // Technician card
                if let tech = order.technician {
                    technicianCard(tech)
                        .offset(y: -14)
                }

                VStack(spacing: 12) {
                    // 来源作品（预约同款）
                    if let work = order.sourceWork {
                        sourceWorkCard(work)
                    }

                    // Service info
                    serviceInfoCard(order)

                    // Price info
                    if order.quotePrice != nil && order.quotePrice! > 0 {
                        priceCard(order)
                    }

                    // Remark
                    if let remark = order.remark, !remark.isEmpty {
                        remarkCard(remark)
                    }

                    // Review section (for completed)
                    if order.status == "completed" {
                        reviewCard(order)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 100)
            }
        }
        .overlay(alignment: .bottom) {
            // Bottom actions
            if hasActions(order) {
                bottomActions(order)
            }
        }
        .sheet(isPresented: $showRejectSheet) {
            rejectSheet
        }
        .sheet(isPresented: $reviewing) {
            ServiceReviewView(orderId: orderId)
        }
        .alert("确认取消预约？", isPresented: $cancelling) {
            Button("返回", role: .cancel) {}
            Button("取消预约", role: .destructive) {
                Task { await mutate(.updateOrderStatus(id: orderId, status: "cancelled")) }
            }
        }
    }

    // MARK: - Status Header（对齐 wxapp status-hero：tone 染色 + 预约号 + 状态说明）

    /// 状态 → 主色（对齐 wxapp statusTone）
    private func statusTone(_ order: Order) -> Color {
        switch order.status {
        case "pending_quote", "quoted", "pending_agree", "pending_confirm", "pending_client_confirm":
            return NBColors.link
        case "pending_home", "pending_shop", "in_progress":
            return NBColors.success
        case "completed":
            return NBColors.secondary
        case "cancelled", "expired", "rejected":
            return NBColors.danger
        default:
            return NBColors.ink
        }
    }

    /// 状态文案（与预约列表同口径，不暴露底层状态码）
    private func statusLabel(_ order: Order) -> String {
        switch order.status {
        case "pending_quote": return "待报价"
        case "quoted": return "已报价"
        case "pending_agree": return "待确认"
        case "pending_confirm": return "待确认"
        case "pending_client_confirm": return "待客户确认"
        case "pending_home": return "待上门"
        case "pending_shop": return "待到店"
        case "in_progress": return "进行中"
        case "completed": return "已完成"
        case "cancelled": return "已取消"
        case "expired": return "已过期"
        case "rejected": return "已拒绝"
        default: return "状态待确认"
        }
    }

    private func statusDesc(_ order: Order) -> String? {
        switch order.status {
        case "pending_quote": return "等待美甲师确认并报价"
        case "quoted": return "美甲师已报价，请确认是否接受"
        case "pending_agree": return "美甲师已提交调整方案，请确认后进入排期"
        case "pending_confirm", "pending_client_confirm": return "等待双方确认排期"
        case "pending_home": return "美甲师将按预约时间上门服务"
        case "pending_shop": return "请按预约时间到店"
        case "in_progress": return "服务正在进行中"
        case "completed": return "服务已完成"
        case "cancelled": return "预约已取消"
        case "expired": return "预约已过期"
        case "rejected": return "预约被拒绝"
        default: return nil
        }
    }

    private func statusHeader(_ order: Order) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(statusLabel(order))
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(statusTone(order))

                Spacer()

                Text(order.serviceType == "shop" || order.serviceType == "到店美甲" ? "到店服务" : "上门服务")
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.secondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
                    .background(Color.black.opacity(0.04))
                    .cornerRadius(999)
            }

            Text("预约号 \(order.orderNo)")
                .font(.system(size: 12))
                .foregroundColor(NBColors.muted)

            if let desc = statusDesc(order) {
                Text(desc)
                    .font(.system(size: 13))
                    .foregroundColor(NBColors.secondary)
                    .lineSpacing(1.4)
                    .padding(.top, 2)
            }
        }
        .padding(20)
        .background(NBColors.page)
    }

    // MARK: - Source Work Card（对齐 wxapp source-work-card）

    @State private var navigateToSourceWork = false

    private func sourceWorkCard(_ work: OrderSourceWork) -> some View {
        Button {
            navigateToSourceWork = true
        } label: {
            HStack(spacing: 12) {
                if let cover = work.coverUrl, let url = URL(string: cover) {
                    AsyncImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle().fill(NBColors.page)
                    }
                    .frame(width: 64, height: 64)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("预约同款来源")
                        .font(.system(size: 11))
                        .foregroundColor(NBColors.muted)
                    Text(work.title ?? "美甲作品")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(NBColors.ink)
                        .lineLimit(1)
                    if let price = work.displayPriceText {
                        Text(price)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(NBColors.money)
                    }
                }
                Spacer()
                Text("›")
                    .font(.system(size: 16))
                    .foregroundColor(NBColors.muted)
            }
        }
        .buttonStyle(.plain)
        .padding(16)
        .background(Color.white)
        .cornerRadius(Radius.md)
        .background {
            NavigationLink(destination: WorkDetailView(workId: work.id).toolbar(.hidden, for: .tabBar), isActive: $navigateToSourceWork) { EmptyView() }.hidden()
        }
    }

    // MARK: - Technician Card

    private func technicianCard(_ tech: OrderTechnician) -> some View {
        HStack(spacing: 12) {
            // Avatar
            if let avatarUrl = tech.avatarUrl, let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(NBColors.page)
                }
                .frame(width: 44, height: 44)
                .clipShape(Circle())
            } else {
                ZStack {
                    Circle()
                        .fill(NBColors.page)
                        .frame(width: 44, height: 44)
                    Text(String(tech.name?.first ?? "?"))
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(NBColors.action)
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(tech.name ?? "")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(NBColors.ink)
                Text("服务美甲师")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.muted)
            }

            Spacer()

            // Actions
            HStack(spacing: 8) {
                if let phone = tech.phone, !phone.isEmpty {
                    Button {
                        if let url = URL(string: "tel://\(phone)") {
                            UIApplication.shared.open(url)
                        }
                    } label: {
                        Image(systemName: "phone")
                            .font(.system(size: 18))
                            .foregroundColor(NBColors.link)
                            .frame(width: 44, height: 44)
                            .background(NBColors.page)
                            .clipShape(Circle())
                    }
                }

                Button {
                    navigateToChat = true
                } label: {
                    Image(systemName: "bubble.left")
                        .font(.system(size: 18))
                        .foregroundColor(NBColors.link)
                        .frame(width: 44, height: 44)
                        .background(NBColors.page)
                        .clipShape(Circle())
                }
                .background {
                    NavigationLink(destination: ConversationsView(role: .client).toolbar(.hidden, for: .tabBar), isActive: $navigateToChat) { EmptyView() }.hidden()
                }
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(Radius.md)
        .shadow(color: Color.black.opacity(0.05), radius: 8, y: 2)
        .padding(.horizontal, 16)
    }

    // MARK: - Service Info Card

    /// 服务项目名：服务线名称拼接 / 自定义标题 / 快捷预约默认
    private var serviceNameText: String {
        if let lines = order?.serviceLines, !lines.isEmpty {
            return lines.map(\.name).joined(separator: "、")
        }
        if let title = order?.customTitle, !title.isEmpty { return title }
        return "快捷预约"
    }

    /// 时间展示：申请阶段显示期望时间，确认后显示预约时间区间
    private var timeLabelText: String? {
        guard let order = order else { return nil }
        if order.bookingPhase == "application" {
            // 申请阶段：期望日期 + 时段
            if let expected = order.expectedDate, !expected.isEmpty {
                var text = formatDateOnly(expected)
                if let slot = order.expectedTimeSlot, !slot.isEmpty { text += " \(slot)" }
                return text
            }
        }
        guard let start = order.startTime else { return nil }
        var text = formatDateTime(start)
        if let end = order.endTime { text += " ~ \(formatTimeOnly(end))" }
        return text
    }

    private func serviceInfoCard(_ order: Order) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("服务信息")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)
                .padding(.bottom, 12)

            infoRow(label: "服务方式", value: order.serviceType == "shop" || order.serviceType == "到店美甲" ? "到店服务" : "上门服务")

            if let time = timeLabelText {
                infoRow(label: order.bookingPhase == "application" ? "期望时间" : "预约时间", value: time)
            }

            if let address = order.address, !address.isEmpty {
                HStack(alignment: .top, spacing: 12) {
                    Text(order.serviceType == "shop" || order.serviceType == "到店美甲" ? "到店地址" : "上门地址")
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.muted)
                        .frame(width: 70, alignment: .leading)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(address)
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.ink)
                            .lineSpacing(1.4)

                        HStack(spacing: 4) {
                            Button("导航") {
                                if let encoded = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
                                   let url = URL(string: "https://maps.apple.com/?q=\(encoded)") {
                                    UIApplication.shared.open(url)
                                }
                            }
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(NBColors.link)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(NBColors.page)
                            .cornerRadius(999)

                            Spacer()
                        }
                    }
                }
                .padding(.vertical, 8)
            }

            infoRow(label: "服务项目", value: serviceNameText)

            // 预计时长（对齐 wxapp durationPending/durationMinutes）
            if let minutes = order.totalDurationMinutes, minutes > 0 {
                infoRow(label: "预计时长", value: "\(minutes)分钟")
            } else if order.totalDurationMinutes == nil {
                infoRow(label: "预计时长", value: "待美甲师确认")
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(Radius.md)
    }

    private func infoRow(label: String, value: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(label)
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)
                .frame(width: 70, alignment: .leading)

            Text(value)
                .font(.system(size: 14))
                .foregroundColor(NBColors.ink)
                .lineSpacing(1.4)

            Spacer()
        }
        .padding(.vertical, 8)
    }

    // MARK: - Price Card

    private func priceCard(_ order: Order) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(order.status == "quoted" || order.status == "pending_agree" ? "美甲师报价" : "费用信息")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)
                .padding(.bottom, 12)

            // 服务线明细（对齐 wxapp price-lines）
            if let lines = order.serviceLines, !lines.isEmpty {
                VStack(spacing: 8) {
                    ForEach(lines) { line in
                        let qty = line.quantity ?? 1
                        HStack(alignment: .firstTextBaseline) {
                            Text(qty > 1 ? "\(line.name) × \(qty)" : line.name)
                                .font(.system(size: 13))
                                .foregroundColor(NBColors.secondary)
                            Spacer()
                            Text("¥\(fenToYuan(Double(line.subtotalFen ?? 0)))")
                                .font(.system(size: 13))
                                .foregroundColor(NBColors.money)
                        }
                    }
                }
                .padding(12)
                .background(NBColors.page)
                .cornerRadius(10)
                .padding(.bottom, 8)
            }

            HStack(alignment: .firstTextBaseline) {
                Text("报价金额")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.muted)

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("¥\(String(format: "%.0f", order.quotePrice ?? 0))")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(NBColors.ink)

                    // 定金状态（对齐 wxapp：已支付定金 / 待收定金 / 无需定金）
                    Text(depositNote(order))
                        .font(.system(size: 11))
                        .foregroundColor(NBColors.muted)
                }
            }
            .padding(.vertical, 8)

            Text("实际付款由客户与门店线下完成，小程序不提供代收款服务。")
                .font(.system(size: 11))
                .foregroundColor(NBColors.muted)
                .lineSpacing(1.4)
                .padding(.top, 8)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(Radius.md)
    }

    /// 定金说明（depositAmount 为分，对齐 wxapp deposit-note）
    private func depositNote(_ order: Order) -> String {
        let depositFen = order.depositAmount ?? 0
        if order.isDepositPaid == true && depositFen > 0 {
            return "已支付定金 ¥\(fenToYuan(depositFen))"
        }
        if depositFen > 0 {
            return "待收定金 ¥\(fenToYuan(depositFen))"
        }
        return "无需定金"
    }

    private func fenToYuan(_ fen: Double) -> String {
        let yuan = fen / 100
        return yuan == yuan.rounded() ? String(format: "%.0f", yuan) : String(format: "%.1f", yuan)
    }

    // MARK: - Remark Card

    private func remarkCard(_ remark: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("备注")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)
                .padding(.bottom, 12)

            Text(remark)
                .font(.system(size: 14))
                .foregroundColor(NBColors.ink)
                .lineSpacing(1.6)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(NBColors.page)
                .cornerRadius(Radius.sm)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(Radius.md)
    }

    // MARK: - Review Card

    private func reviewCard(_ order: Order) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("评价这次服务")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)

            Text("你的反馈只用于改善服务；照片默认不会被公开使用。")
                .font(.system(size: 12))
                .foregroundColor(NBColors.secondary)
                .lineSpacing(1.4)

            Button("去评价") {
                reviewing = true
            }
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(NBColors.action)
            .cornerRadius(Radius.button)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(Radius.md)
    }

    // MARK: - Bottom Actions

    private func bottomActions(_ order: Order) -> some View {
        HStack(spacing: 8) {
            if canCancel(order) {
                Button("取消预约") {
                    cancelling = true
                }
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.danger)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(NBColors.dangerSurface)
                .cornerRadius(Radius.button)
            }

            if order.status == "quoted" || order.status == "pending_agree" {
                Button("拒绝报价") {
                    showRejectSheet = true
                }
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(NBColors.page)
                .cornerRadius(Radius.button)

                Button("接受报价") {
                    Task { await agreeOrder() }
                }
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(NBColors.action)
                .cornerRadius(Radius.button)
            }
        }
        .disabled(busy)
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.92))
        .shadow(color: Color.black.opacity(0.06), radius: 8, y: -2)
    }

    // MARK: - Reject Sheet

    private var rejectSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("拒绝原因（选填）")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.ink)

                TextEditor(text: $rejectReason)
                    .font(.system(size: 15))
                    .frame(minHeight: 100)
                    .padding(8)
                    .background(NBColors.page)
                    .cornerRadius(Radius.sm)

                // Quick reasons
                HStack(spacing: 8) {
                    ForEach(["价格太高", "时间不合适", "其他"], id: \.self) { reason in
                        Button(reason) {
                            rejectReason = reason
                        }
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.action)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(NBColors.page)
                        .cornerRadius(999)
                    }
                }

                Spacer()
            }
            .padding(16)
            .navigationTitle("拒绝报价")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { showRejectSheet = false }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("确认拒绝") {
                        Task { await rejectQuote() }
                    }
                    .foregroundColor(NBColors.danger)
                }
            }
        }
    }

    // MARK: - Helpers

    private func hasActions(_ order: Order) -> Bool {
        canCancel(order) || order.status == "quoted" || order.status == "pending_agree"
    }

    private func canCancel(_ order: Order) -> Bool {
        ["pending_quote", "quoted", "pending_confirm", "pending_shop"].contains(order.status)
    }

    private func formatDateTime(_ isoString: String) -> String {
        guard let date = parseISO(isoString) else { return isoString }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd HH:mm"
        return f.string(from: date)
    }

    private func formatTimeOnly(_ isoString: String) -> String {
        guard let date = parseISO(isoString) else { return isoString }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "HH:mm"
        return f.string(from: date)
    }

    /// expectedDate 可能是 "yyyy-MM-dd" 纯日期，也可能是 ISO 时间
    private func formatDateOnly(_ value: String) -> String {
        if value.count == 10 { return value }
        guard let date = parseISO(value) else { return value }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    private func parseISO(_ isoString: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) { return date }
        let alt = ISO8601DateFormatter()
        return alt.date(from: isoString)
    }

    // MARK: - API Actions

    private func loadOrder() async {
        do {
            order = try await APIClient.shared.request(.clientOrderDetail(id: orderId))
            isLoading = false
        } catch {
            isLoading = false
        }
    }

    private func agreeOrder() async {
        await mutate(.agreeOrder(id: orderId, amount: nil))
    }

    private func rejectQuote() async {
        showRejectSheet = false
        await mutate(.rejectQuote(id: orderId, reason: rejectReason))
    }

    private func mutate(_ endpoint: Endpoint) async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            try await APIClient.shared.requestVoid(endpoint)
            await loadOrder()
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        ClientOrderDetailView(orderId: 1)
    }
}
