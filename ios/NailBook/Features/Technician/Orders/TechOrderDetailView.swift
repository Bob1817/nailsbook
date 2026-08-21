import SwiftUI

// MARK: - Technician Order Detail

struct TechOrderDetailView: View {
    let orderId: Int
    @State private var order: Order?
    @State private var isLoading = true
    @State private var showQuoteSheet = false
    @State private var quotePrice = ""
    @State private var quoteRemark = ""
    @State private var showCancelAlert = false
    @State private var cancelReason = ""

    var body: some View {
        ScrollView {
            if let order = order {
                VStack(spacing: Spacing.lg) {
                    // Status header
                    statusHeader(order)

                    // Order info
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            infoRow("订单号", order.orderNo)
                            if let title = order.customTitle {
                                infoRow("服务项目", title)
                            }
                            if let type = order.serviceType {
                                infoRow("服务类型", type == "home" ? "上门服务" : "到店服务")
                            }
                            if let start = order.startTime {
                                infoRow("预约时间", formatDateTime(start))
                            }
                            if let end = order.endTime {
                                infoRow("预计结束", formatDateTime(end))
                            }
                            if let addr = order.address {
                                infoRow("服务地址", addr)
                            }
                            if let remark = order.remark, !remark.isEmpty {
                                infoRow("客户备注", remark)
                            }
                        }
                    }

                    // Customer info
                    if let customer = order.customer {
                        NBCard {
                            HStack(spacing: Spacing.md) {
                                Circle()
                                    .fill(Color.nbSecondarySoft)
                                    .frame(width: 44, height: 44)
                                    .overlay(
                                        Text(String(customer.name?.first ?? "?"))
                                            .font(NBFont.titleMedium)
                                            .foregroundColor(.nbTextSecondary)
                                    )
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(customer.name ?? "客户")
                                        .font(NBFont.bodyLarge)
                                        .foregroundColor(.nbTextPrimary)
                                    if let phone = customer.phone {
                                        Text(phone)
                                            .font(NBFont.captionLarge)
                                            .foregroundColor(.nbTextSecondary)
                                    }
                                }
                                Spacer()
                            }
                        }
                    }

                    // Quote info (if quoted)
                    if let price = order.quotePrice, price > 0 {
                        NBCard {
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                Text("报价信息")
                                    .font(NBFont.titleSmall)
                                HStack {
                                    Text("报价金额")
                                        .foregroundColor(.nbTextSecondary)
                                    Spacer()
                                    Text("¥\(String(format: "%.0f", price))")
                                        .foregroundColor(.nbPrimary)
                                        .font(NBFont.titleMedium)
                                }
                                .font(NBFont.bodyMedium)

                                if let remark = order.quoteRemark {
                                    Text(remark)
                                        .font(NBFont.bodySmall)
                                        .foregroundColor(.nbTextTertiary)
                                }

                                if let deposit = order.depositAmount, deposit > 0 {
                                    HStack {
                                        Text("定金")
                                            .foregroundColor(.nbTextSecondary)
                                        Spacer()
                                        Text("¥\(String(format: "%.0f", deposit))")
                                            .foregroundColor(.nbTextPrimary)
                                        if order.isDepositPaid == true {
                                            Text("已付")
                                                .font(NBFont.captionSmall)
                                                .foregroundColor(.nbSuccess)
                                        } else {
                                            Text("未付")
                                                .font(NBFont.captionSmall)
                                                .foregroundColor(.nbWarning)
                                        }
                                    }
                                    .font(NBFont.bodyMedium)
                                }
                            }
                        }
                    }

                    // Custom images
                    if let images = order.customImages, !images.isEmpty {
                        NBCard {
                            VStack(alignment: .leading, spacing: Spacing.md) {
                                Text("客户参考图")
                                    .font(NBFont.titleSmall)
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: Spacing.sm) {
                                        ForEach(images, id: \.self) { url in
                                            AsyncImage(url: URL(string: url)) { img in
                                                img.resizable().aspectRatio(contentMode: .fill)
                                            } placeholder: {
                                                Rectangle().fill(Color.nbSecondarySoft)
                                            }
                                            .frame(width: 80, height: 80)
                                            .cornerRadius(Radius.sm)
                                            .clipped()
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Action buttons
                    actionButtons(for: order)
                }
                .padding(Spacing.lg)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle("订单详情")
        .background(Color.nbBg)
        .task { await loadOrder() }
        .sheet(isPresented: $showQuoteSheet) { quoteSheet }
        .alert("取消订单", isPresented: $showCancelAlert) {
            TextField("取消原因", text: $cancelReason)
            Button("取消", role: .cancel) {}
            Button("确认取消", role: .destructive) {
                Task { await cancelOrder() }
            }
        }
    }

    // MARK: - Quote Sheet

    private var quoteSheet: some View {
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                NBCard {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("报价金额")
                            .font(NBFont.titleSmall)
                        NBTextField(placeholder: "输入报价金额", text: $quotePrice, keyboardType: .decimalPad)
                    }
                }
                NBCard {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("报价备注")
                            .font(NBFont.titleSmall)
                        TextEditor(text: $quoteRemark)
                            .font(NBFont.bodyMedium)
                            .frame(height: 80)
                            .padding(Spacing.sm)
                            .background(Color.nbSurfaceAlt)
                            .cornerRadius(Radius.sm)
                    }
                }
                NBButton(title: "提交报价", style: .primary) {
                    Task { await submitQuote() }
                }
                Spacer()
            }
            .padding(Spacing.lg)
            .navigationTitle("报价")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color.nbBg)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { showQuoteSheet = false }
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - Status Header

    @ViewBuilder
    private func statusHeader(_ order: Order) -> some View {
        let status = OrderStatus(rawValue: order.status) ?? .pendingQuote
        VStack(spacing: Spacing.sm) {
            Image(systemName: statusIcon(status))
                .font(.system(size: 36))
                .foregroundColor(statusColor(status))
            Text(status.displayName)
                .font(NBFont.titleLarge)
                .foregroundColor(statusColor(status))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxl)
        .background(statusColor(status).opacity(0.08))
        .cornerRadius(Radius.lg)
    }

    // MARK: - Action Buttons

    @ViewBuilder
    private func actionButtons(for order: Order) -> some View {
        let status = OrderStatus(rawValue: order.status)
        VStack(spacing: Spacing.md) {
            switch status {
            case .pendingQuote:
                NBButton(title: "报价", style: .primary) {
                    quotePrice = ""
                    quoteRemark = ""
                    showQuoteSheet = true
                }
            case .quoted:
                NBButton(title: "确认订单", style: .primary) {
                    Task { await confirmOrder() }
                }
                NBButton(title: "修改报价", style: .outline) {
                    quotePrice = "\(order.quotePrice ?? 0)"
                    quoteRemark = order.quoteRemark ?? ""
                    showQuoteSheet = true
                }
            case .pendingConfirm, .pendingHome, .pendingShop:
                NBButton(title: "开始服务", style: .primary) {
                    Task { await startService() }
                }
                NBButton(title: "取消订单", style: .outline) {
                    showCancelAlert = true
                }
            case .inProgress:
                NBButton(title: "完成服务", style: .primary) {
                    Task { await completeOrder() }
                }
            default:
                EmptyView()
            }
        }
    }

    private func infoRow(_ label: String, _ value: String) -> some View {
        HStack(alignment: .top) {
            Text(label)
                .font(NBFont.bodyMedium)
                .foregroundColor(.nbTextSecondary)
                .frame(width: 72, alignment: .leading)
            Text(value)
                .font(NBFont.bodyMedium)
                .foregroundColor(.nbTextPrimary)
            Spacer()
        }
    }

    // MARK: - Helpers

    private func statusIcon(_ status: OrderStatus) -> String {
        switch status {
        case .pendingQuote: return "clock"
        case .quoted: return "dollarsign.circle"
        case .pendingConfirm, .pendingHome, .pendingShop: return "checkmark.circle"
        case .inProgress: return "play.circle"
        case .completed: return "checkmark.seal.fill"
        case .cancelled, .expired: return "xmark.circle"
        }
    }

    private func statusColor(_ status: OrderStatus) -> Color {
        switch status {
        case .pendingQuote: return .nbWarning
        case .quoted: return .nbInfo
        case .inProgress: return .nbSuccess
        case .completed: return .nbSuccessDark
        case .cancelled, .expired: return .nbTextTertiary
        default: return .nbPrimary
        }
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
            order = try await APIClient.shared.request(.techOrderDetail(id: orderId))
            isLoading = false
        } catch { isLoading = false }
    }

    private func submitQuote() async {
        guard let price = Double(quotePrice), price > 0 else { return }
        do {
            _ = try await APIClient.shared.requestVoid(
                .quoteOrder(id: orderId, price: price, remark: quoteRemark.isEmpty ? nil : quoteRemark)
            )
            showQuoteSheet = false
            await loadOrder()
        } catch {}
    }

    private func confirmOrder() async {
        do {
            _ = try await APIClient.shared.requestVoid(.confirmOrder(id: orderId, depositConfirmed: nil))
            await loadOrder()
        } catch {}
    }

    private func startService() async {
        do {
            _ = try await APIClient.shared.requestVoid(.updateOrderStatus(id: orderId, status: "in_progress"))
            await loadOrder()
        } catch {}
    }

    private func completeOrder() async {
        do {
            _ = try await APIClient.shared.requestVoid(.completeOrder(id: orderId))
            await loadOrder()
        } catch {}
    }

    private func cancelOrder() async {
        do {
            _ = try await APIClient.shared.requestVoid(
                .cancelOrder(id: orderId, reason: cancelReason.isEmpty ? nil : cancelReason)
            )
            await loadOrder()
        } catch {}
    }
}
