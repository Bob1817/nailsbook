import SwiftUI

// MARK: - Technician Order Detail (aligned with wxapp design)

struct TechOrderDetailView: View {
    let orderId: Int
    @State private var order: Order?
    @State private var isLoading = true
    @State private var error: String?
    @State private var busy = false
    @State private var showQuoteSheet = false
    @State private var showCancelSheet = false
    @State private var cancelReason = ""
    @State private var quotePriceText = ""
    @State private var quoteDepositText = ""

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

                // Customer card
                if let customer = order.customer {
                    customerCard(customer)
                        .offset(y: -14)
                }

                VStack(spacing: 12) {
                    // Service info
                    serviceInfoCard(order)

                    // Price info
                    if order.quotePrice != nil && order.quotePrice! > 0 {
                        priceCard(order)
                    }

                    // Review
                    if order.status == "completed" {
                        reviewCard(order)
                    }

                    // Remark
                    if let remark = order.remark, !remark.isEmpty {
                        remarkCard(remark)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 100)
            }
        }
        .overlay(alignment: .bottom) {
            bottomActions(order)
        }
        .sheet(isPresented: $showQuoteSheet) {
            quoteSheet(order)
        }
        .sheet(isPresented: $showCancelSheet) {
            cancelSheet
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
                    .foregroundColor(.white)

                Spacer()

                Text(order.serviceType == "shop" ? "到店服务" : "上门服务")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.9))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
                    .background(Color.white.opacity(0.16))
                    .cornerRadius(999)
            }

            Text("预约号 \(order.orderNo)")
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.78))

            if let desc = statusInfo.description {
                Text(desc)
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.92))
                    .lineSpacing(1.4)
                    .padding(.top, 4)
            }
        }
        .padding(20)
        .background(NBColors.action)
    }

    // MARK: - Customer Card

    private func customerCard(_ customer: OrderCustomer) -> some View {
        HStack(spacing: 12) {
            // Avatar
            ZStack {
                Circle()
                    .fill(NBColors.page)
                    .frame(width: 44, height: 44)
                Text(String(customer.name?.first ?? "?"))
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(NBColors.action)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(customer.name ?? "客户")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(NBColors.ink)
                if let phone = customer.phone {
                    Text(maskPhone(phone))
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.muted)
                }
            }

            Spacer()

            // Actions
            if let phone = customer.phone, !phone.isEmpty {
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
                HStack(alignment: .top, spacing: 12) {
                    Text("预约时间")
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.muted)
                        .frame(width: 70, alignment: .leading)

                    Text(formatDateTime(start))
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.ink)

                    Spacer()

                    Button("编辑") {
                        // Edit time
                    }
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(NBColors.link)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.black.opacity(0.08))
                    .cornerRadius(999)
                }
                .padding(.vertical, 8)
            }

            if let address = order.address, !address.isEmpty {
                HStack(alignment: .top, spacing: 12) {
                    Text("服务地址")
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
            Text(order.status == "pending_quote" || order.status == "quoted" ? "报价信息" : "价格信息")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)
                .padding(.bottom, 12)

            HStack {
                Text(order.customTitle ?? "预约服务")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.secondary)

                Spacer()

                Text("¥\(String(format: "%.0f", order.quotePrice ?? 0))")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.ink)
            }
            .padding(.vertical, 8)

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
                        Text("已收款")
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

    // MARK: - Review Card

    private func reviewCard(_ order: Order) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("客户评价")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)

            HStack(spacing: 12) {
                Text("5 / 5 分")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(NBColors.ink)
                Text("非常满意")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.secondary)
            }

            Text("客户未填写文字评价")
                .font(.system(size: 14))
                .foregroundColor(NBColors.ink)
                .lineSpacing(1.6)
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

    // MARK: - Bottom Actions

    private func bottomActions(_ order: Order) -> some View {
        HStack(spacing: 8) {
            switch OrderStatus(rawValue: order.status) {
            case .pendingQuote:
                Button("取消") {
                    showCancelSheet = true
                }
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.danger)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(NBColors.dangerSurface)
                .cornerRadius(Radius.button)

                Button("报价") {
                    showQuoteSheet = true
                }
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(NBColors.action)
                .cornerRadius(Radius.button)

            case .quoted:
                Button("取消") {
                    showCancelSheet = true
                }
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.danger)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(NBColors.dangerSurface)
                .cornerRadius(Radius.button)

                Button("修改报价") {
                    showQuoteSheet = true
                }
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(NBColors.action)
                .cornerRadius(Radius.button)

            case .inProgress:
                NavigationLink(destination: CompleteServiceView(orderId: orderId)) {
                    Text("完成服务")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(NBColors.action)
                        .cornerRadius(Radius.button)
                }

            case .completed:
                Button("创建关联作品") {
                    Task { await createWork() }
                }
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(NBColors.action)
                .cornerRadius(Radius.button)

            default:
                EmptyView()
            }
        }
        .disabled(busy)
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.92))
        .shadow(color: Color.black.opacity(0.06), radius: 8, y: -2)
    }

    // MARK: - Quote Sheet

    private func quoteSheet(_ order: Order) -> some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("报价金额（元）")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.ink)

                TextField("请输入报价金额", text: $quotePriceText)
                    .font(.system(size: 15))
                    .keyboardType(.decimalPad)
                    .padding(12)
                    .background(NBColors.page)
                    .cornerRadius(Radius.sm)

                if let currentPrice = order.quotePrice, currentPrice > 0 {
                    Text("当前报价 ¥\(String(format: "%.0f", currentPrice))")
                        .font(.system(size: 12))
                        .foregroundColor(NBColors.muted)
                }

                Text("定金金额（元）")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.ink)

                TextField("0（选填）", text: $quoteDepositText)
                    .font(.system(size: 15))
                    .keyboardType(.decimalPad)
                    .padding(12)
                    .background(NBColors.page)
                    .cornerRadius(Radius.sm)

                Spacer()
            }
            .padding(16)
            .navigationTitle("发送报价")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { showQuoteSheet = false }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("确认方案") {
                        showQuoteSheet = false
                        Task { await quoteOrder() }
                    }
                    .foregroundColor(NBColors.action)
                    .disabled(quotePriceText.isEmpty)
                }
            }
            .onAppear {
                quotePriceText = order.quotePrice.map { String(format: "%.0f", $0) } ?? ""
                quoteDepositText = order.depositAmount.map { String(format: "%.0f", $0) } ?? ""
            }
        }
    }

    // MARK: - Cancel Sheet

    private var cancelSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("取消原因（选填）")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.ink)

                TextEditor(text: $cancelReason)
                    .font(.system(size: 15))
                    .frame(minHeight: 100)
                    .padding(8)
                    .background(NBColors.page)
                    .cornerRadius(Radius.sm)

                // Quick reasons
                HStack(spacing: 8) {
                    ForEach(["时间冲突", "客户取消", "其他"], id: \.self) { reason in
                        Button(reason) {
                            cancelReason = reason
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
            .navigationTitle("取消预约")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("返回") { showCancelSheet = false }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("确认取消") {
                        showCancelSheet = false
                        Task { await cancelOrder() }
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
            return ("已报价", "等待客户接受报价")
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

    private func maskPhone(_ phone: String) -> String {
        guard phone.count >= 7 else { return phone }
        let start = phone.index(phone.startIndex, offsetBy: 3)
        let end = phone.index(phone.endIndex, offsetBy: -4)
        return String(phone[..<start]) + "****" + String(phone[end...])
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
        } catch {
            isLoading = false
            self.error = error.localizedDescription
        }
    }

    private func quoteOrder() async {
        guard !busy else { return }
        guard let price = Double(quotePriceText), price > 0 else { return }
        busy = true
        defer { busy = false }
        let deposit = Double(quoteDepositText)
        do {
            try await APIClient.shared.requestVoid(.quoteOrder(id: orderId, price: price, remark: deposit.map { "deposit:\($0)" }))
            quotePriceText = ""
            quoteDepositText = ""
            await loadOrder()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func cancelOrder() async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            try await APIClient.shared.requestVoid(.cancelOrder(id: orderId, reason: cancelReason.isEmpty ? nil : cancelReason))
            await loadOrder()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func createWork() async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            let _: NailWork = try await APIClient.shared.request(.resource(role: .technician, path: "works/from-order/\(orderId)", method: "POST", body: [:]))
            await loadOrder()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        TechOrderDetailView(orderId: 1)
    }
}
