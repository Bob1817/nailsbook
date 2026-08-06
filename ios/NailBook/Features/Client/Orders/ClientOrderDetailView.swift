import SwiftUI

// MARK: - Client Order Detail

struct ClientOrderDetailView: View {
    let orderId: Int
    @State private var order: Order?
    @State private var isLoading = true
    @State private var showQuoteReject = false
    @State private var rejectReason = ""

    var body: some View {
        ScrollView {
            if let order = order {
                VStack(spacing: Spacing.lg) {
                    // Status header
                    statusHeader(order)

                    // Order info card
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            infoRow(label: "订单号", value: order.orderNo)

                            if let title = order.customTitle {
                                infoRow(label: "服务项目", value: title)
                            }
                            if let type = order.serviceType {
                                infoRow(label: "服务类型", value: type == "home" ? "上门服务" : "到店服务")
                            }
                            if let start = order.startTime {
                                infoRow(label: "预约时间", value: formatDateTime(start))
                            }
                            if let address = order.address {
                                infoRow(label: "服务地址", value: address)
                            }
                            if let remark = order.remark, !remark.isEmpty {
                                infoRow(label: "备注", value: remark)
                            }
                        }
                    }

                    // Technician info
                    if let tech = order.technician {
                        NBCard {
                            HStack(spacing: Spacing.md) {
                                Circle()
                                    .fill(Color.nbPrimarySoft)
                                    .frame(width: 44, height: 44)
                                    .overlay(
                                        Text(String(tech.name?.first ?? "?"))
                                            .font(NBFont.titleMedium)
                                            .foregroundColor(.nbPrimary)
                                    )
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(tech.name ?? "")
                                        .font(NBFont.bodyLarge)
                                        .foregroundColor(.nbTextPrimary)
                                    if let phone = tech.phone {
                                        Text(phone)
                                            .font(NBFont.captionLarge)
                                            .foregroundColor(.nbTextSecondary)
                                    }
                                }
                                Spacer()
                            }
                        }
                    }

                    // Price info
                    if let price = order.quotePrice, price > 0 {
                        NBCard {
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                Text("报价信息")
                                    .font(NBFont.titleSmall)
                                    .foregroundColor(.nbTextPrimary)
                                HStack {
                                    Text("报价金额")
                                        .font(NBFont.bodyMedium)
                                        .foregroundColor(.nbTextSecondary)
                                    Spacer()
                                    Text("¥\(String(format: "%.0f", price))")
                                        .font(NBFont.titleMedium)
                                        .foregroundColor(.nbPrimary)
                                }
                                if let remark = order.quoteRemark, !remark.isEmpty {
                                    Text(remark)
                                        .font(NBFont.bodySmall)
                                        .foregroundColor(.nbTextTertiary)
                                }
                                if let deposit = order.depositAmount, deposit > 0 {
                                    HStack {
                                        Text("定金")
                                            .font(NBFont.bodyMedium)
                                            .foregroundColor(.nbTextSecondary)
                                        Spacer()
                                        Text("¥\(String(format: "%.0f", deposit))")
                                            .font(NBFont.bodyMedium)
                                            .foregroundColor(.nbTextPrimary)
                                        if order.isDepositPaid == true {
                                            Text("已付")
                                                .font(NBFont.captionSmall)
                                                .foregroundColor(.nbSuccess)
                                                .padding(.leading, 4)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Custom images
                    if let images = order.customImages, !images.isEmpty {
                        NBCard {
                            VStack(alignment: .leading, spacing: Spacing.md) {
                                Text("参考图片")
                                    .font(NBFont.titleSmall)
                                    .foregroundColor(.nbTextPrimary)
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: Spacing.sm) {
                                        ForEach(images, id: \.self) { url in
                                            AsyncImage(url: URL(string: url)) { image in
                                                image.resizable()
                                                    .aspectRatio(contentMode: .fill)
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

                    // Action buttons based on status
                    actionButtons(for: order)
                }
                .padding(Spacing.lg)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle("订单详情")
        .background(Color.nbBg)
        .task { await loadOrder() }
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
            case .quoted:
                NBButton(title: "接受报价", style: .primary) {
                    Task { await agreeOrder() }
                }
                NBButton(title: "拒绝报价", style: .outline) {
                    showQuoteReject = true
                }
            case .pendingHome, .pendingShop, .inProgress:
                EmptyView()
            case .completed:
                EmptyView()
            default:
                EmptyView()
            }
        }
        .alert("拒绝报价", isPresented: $showQuoteReject) {
            TextField("拒绝原因（可选）", text: $rejectReason)
            Button("取消", role: .cancel) {}
            Button("确认拒绝", role: .destructive) {
                Task { await rejectQuote() }
            }
        }
    }

    // MARK: - Info Row

    private func infoRow(label: String, value: String) -> some View {
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
        case .pendingConfirm, .pendingHome, .pendingShop: return .nbInfo
        case .inProgress: return .nbSuccess
        case .completed: return .nbSuccessDark
        case .cancelled, .expired: return .nbTextTertiary
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
            order = try await APIClient.shared.request(.clientOrderDetail(id: orderId))
            isLoading = false
        } catch {
            isLoading = false
        }
    }

    private func agreeOrder() async {
        do {
            _ = try await APIClient.shared.requestVoid(.agreeOrder(id: orderId, amount: nil))
            await loadOrder()
        } catch {}
    }

    private func rejectQuote() async {
        do {
            _ = try await APIClient.shared.requestVoid(.rejectQuote(id: orderId, reason: rejectReason.isEmpty ? nil : rejectReason))
            await loadOrder()
        } catch {}
    }
}
