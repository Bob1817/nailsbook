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
        .task { await loadOrder() }
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

    // MARK: - Status Header

    private func statusHeader(_ order: Order) -> some View {
        let status = OrderStatus(rawValue: order.status) ?? .pendingQuote
        let statusInfo = getStatusInfo(status)

        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(statusInfo.label)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(NBColors.ink)

                Spacer()

                Text(order.serviceType == "shop" ? "到店服务" : "上门服务")
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.ink)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
                    .background(Color.black.opacity(0.04))
                    .cornerRadius(999)
            }

            Text("预约号 \(order.orderNo)")
                .font(.system(size: 12))
                .foregroundColor(NBColors.muted)

            if let desc = statusInfo.description {
                Text(desc)
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.ink)
                    .lineSpacing(1.4)
                    .padding(.top, 4)
            }
        }
        .padding(20)
        .background(NBColors.page)
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
                        // Call
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
                    // Chat
                } label: {
                    Image(systemName: "bubble.left")
                        .font(.system(size: 18))
                        .foregroundColor(NBColors.link)
                        .frame(width: 44, height: 44)
                        .background(NBColors.page)
                        .clipShape(Circle())
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

    private func serviceInfoCard(_ order: Order) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("服务信息")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)
                .padding(.bottom, 12)

            infoRow(label: "服务方式", value: order.serviceType == "shop" ? "到店服务" : "上门服务")

            if let start = order.startTime {
                infoRow(label: "预约时间", value: formatDateTime(start))
            }

            if let address = order.address, !address.isEmpty {
                HStack(alignment: .top, spacing: 12) {
                    Text(order.serviceType == "shop" ? "到店地址" : "上门地址")
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
                                // Navigate
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

            if let title = order.customTitle {
                infoRow(label: "服务项目", value: title)
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

            HStack {
                Text("报价金额")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.muted)

                Spacer()

                Text("¥\(String(format: "%.0f", order.quotePrice ?? 0))")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(NBColors.ink)
            }
            .padding(.vertical, 8)

            if let deposit = order.depositAmount, deposit > 0 {
                HStack {
                    Text("定金")
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.muted)

                    Spacer()

                    Text("¥\(String(format: "%.0f", deposit))")
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.ink)

                    if order.isDepositPaid == true {
                        Text("已付")
                            .font(.system(size: 12))
                            .foregroundColor(NBColors.success)
                            .padding(.leading, 4)
                    }
                }
                .padding(.vertical, 8)
            }

            Text("实际付款由客户与门店线下完成，小程序不提供代收款服务。")
                .font(.system(size: 12))
                .foregroundColor(NBColors.muted)
                .lineSpacing(1.4)
                .padding(.top, 8)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(Radius.md)
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

    private func getStatusInfo(_ status: OrderStatus) -> (label: String, description: String?) {
        switch status {
        case .pendingQuote:
            return ("待报价", "等待美甲师确认并报价")
        case .quoted:
            return ("已报价", "美甲师已报价，请确认是否接受")
        case .inProgress:
            return ("进行中", "服务正在进行中")
        case .completed:
            return ("已完成", "服务已完成")
        case .cancelled:
            return ("已取消", "预约已取消")
        default:
            return ("待处理", nil)
        }
    }

    private func hasActions(_ order: Order) -> Bool {
        canCancel(order) || order.status == "quoted" || order.status == "pending_agree"
    }

    private func canCancel(_ order: Order) -> Bool {
        ["pending_quote", "quoted", "pending_confirm", "pending_shop"].contains(order.status)
    }

    private func formatDateTime(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return isoString }
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd HH:mm"
        return f.string(from: date)
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
