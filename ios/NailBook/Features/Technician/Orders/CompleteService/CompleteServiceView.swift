import SwiftUI

// MARK: - Complete Service View (technician completes an order)

struct CompleteServiceView: View {
    let orderId: Int
    @Environment(\.dismiss) private var dismiss

    @State private var order: Order?
    @State private var isLoading = true
    @State private var submitting = false
    @State private var saved = false
    @State private var error: String?

    // Required fields
    @State private var actualStartTime = Date()
    @State private var actualEndTime = Date()
    @State private var actualAmountText = ""
    @State private var materialCostText = "0"

    // Optional service record fields
    @State private var materials = ""
    @State private var techniques = ""
    @State private var nailCondition = ""
    @State private var customerFeedback = ""
    @State private var careAdvice = ""

    // Create linked work
    @State private var creatingWork = false
    @State private var createdWorkId: Int?
    @State private var showWorkEditor = false

    var body: some View {
        ZStack {
            NBColors.page.ignoresSafeArea()

            if isLoading {
                loadingView
            } else if saved {
                successView
            } else {
                formView
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle("完成服务")
        .toolbar(.hidden, for: .tabBar)
        .task { await loadOrder() }
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView().scaleEffect(1.2)
            Text("加载中...").font(.system(size: 14)).foregroundColor(NBColors.muted)
        }
    }

    // MARK: - Form

    private var formView: some View {
        ScrollView {
            VStack(spacing: 14) {
                // Card 1: Service info
                serviceInfoCard

                // Card 2: Service record (optional)
                serviceRecordCard

                // Error
                if let err = error {
                    Text(err)
                        .font(.system(size: 13))
                        .foregroundColor(NBColors.danger)
                        .padding(.horizontal, 20)
                }

                // Submit
                Button {
                    Task { await submit() }
                } label: {
                    HStack {
                        if submitting { ProgressView().scaleEffect(0.8).tint(.white) }
                        Text(submitting ? "提交中..." : "确认完成")
                            .font(.system(size: 16, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(canSubmit ? NBColors.action : Color.gray)
                    .cornerRadius(Radius.lg)
                }
                .disabled(!canSubmit || submitting)
                .padding(.horizontal, 20)
                .padding(.bottom, 30)
            }
            .padding(.top, 12)
        }
    }

    // MARK: - Service Info Card

    private var serviceInfoCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("实际服务信息")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)

            // Start time
            VStack(alignment: .leading, spacing: 6) {
                Text("实际开始时间 *")
                    .font(.system(size: 13))
                    .foregroundColor(NBColors.muted)
                DatePicker("开始时间", selection: $actualStartTime)
                    .labelsHidden()
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            // End time
            VStack(alignment: .leading, spacing: 6) {
                Text("实际结束时间 *")
                    .font(.system(size: 13))
                    .foregroundColor(NBColors.muted)
                DatePicker("结束时间", selection: $actualEndTime)
                    .labelsHidden()
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            // Actual amount
            VStack(alignment: .leading, spacing: 6) {
                Text("实际金额（元）*")
                    .font(.system(size: 13))
                    .foregroundColor(NBColors.muted)
                TextField("0", text: $actualAmountText)
                    .font(.system(size: 16))
                    .keyboardType(.decimalPad)
                    .padding(12)
                    .background(NBColors.page)
                    .cornerRadius(Radius.sm)
            }

            // Material cost
            VStack(alignment: .leading, spacing: 6) {
                Text("材料成本（元）")
                    .font(.system(size: 13))
                    .foregroundColor(NBColors.muted)
                TextField("0", text: $materialCostText)
                    .font(.system(size: 16))
                    .keyboardType(.decimalPad)
                    .padding(12)
                    .background(NBColors.page)
                    .cornerRadius(Radius.sm)
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(Radius.md)
        .shadow(color: Color.black.opacity(0.04), radius: 8, y: 2)
        .padding(.horizontal, 16)
    }

    // MARK: - Service Record Card

    private var serviceRecordCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("服务记录")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)

            Text("以下信息为选填，用于完善服务档案")
                .font(.system(size: 12))
                .foregroundColor(NBColors.muted)

            textArea("色号、品牌和材料", text: $materials)
            textArea("本次使用的工艺", text: $techniques)
            textArea("甲面、甲型和敏感情况", text: $nailCondition)
            textArea("客户反馈", text: $customerFeedback)
            textArea("护理建议", text: $careAdvice)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(Radius.md)
        .shadow(color: Color.black.opacity(0.04), radius: 8, y: 2)
        .padding(.horizontal, 16)
    }

    private func textArea(_ placeholder: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(placeholder)
                .font(.system(size: 13))
                .foregroundColor(NBColors.muted)
            TextField(placeholder, text: text, axis: .vertical)
                .font(.system(size: 14))
                .lineLimit(2...5)
                .padding(10)
                .background(NBColors.page)
                .cornerRadius(Radius.sm)
        }
    }

    // MARK: - Success View

    private var successView: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(NBColors.success)

            Text("服务已完成")
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(NBColors.ink)

            if let customerName = order?.customer?.name {
                Text("\(customerName) 的服务记录已保存")
                    .font(.system(size: 15))
                    .foregroundColor(NBColors.muted)
            }

            VStack(spacing: 12) {
                Button {
                    Task { await createWorkFromOrder() }
                } label: {
                    HStack {
                        if creatingWork { ProgressView().scaleEffect(0.8).tint(.white) }
                        Text(creatingWork ? "创建中..." : "发布关联作品")
                            .font(.system(size: 15, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(NBColors.action)
                    .cornerRadius(Radius.md)
                }
                .disabled(creatingWork)

                Button {
                    dismiss()
                } label: {
                    Text("暂不发布，返回订单")
                        .font(.system(size: 15))
                        .foregroundColor(NBColors.muted)
                        .frame(minHeight: 44)
                }
            }
            .padding(.horizontal, 40)

            Spacer()
        }
        .sheet(isPresented: $showWorkEditor) {
            TechWorkEditView(work: nil) { }
        }
    }

    // MARK: - Computed

    private var canSubmit: Bool {
        !actualAmountText.isEmpty && !submitting && actualEndTime > actualStartTime
    }

    // MARK: - Actions

    private func loadOrder() async {
        defer { isLoading = false }
        do {
            order = try await APIClient.shared.request(.techOrderDetail(id: orderId))
            // Pre-fill defaults
            if let start = order?.startTime, let date = parseISODate(start) {
                actualStartTime = date
            }
            actualEndTime = Date()
            actualAmountText = "\(Int(order?.quotePrice ?? 0))"
        } catch {}
    }

    private func submit() async {
        guard canSubmit else { return }
        submitting = true
        error = nil
        defer { submitting = false }

        guard let amount = Double(actualAmountText), amount >= 0 else {
            error = "请输入有效金额"
            return
        }
        let materialCost = Double(materialCostText) ?? 0

        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        var params: [String: Any] = [
            "actualStartTime": isoFormatter.string(from: actualStartTime),
            "actualEndTime": isoFormatter.string(from: actualEndTime),
            "actualAmount": amount,
            "materialCost": materialCost
        ]

        // Optional fields
        if !materials.trimmingCharacters(in: .whitespaces).isEmpty { params["materials"] = materials }
        if !techniques.trimmingCharacters(in: .whitespaces).isEmpty { params["techniques"] = techniques }
        if !nailCondition.trimmingCharacters(in: .whitespaces).isEmpty { params["nailCondition"] = nailCondition }
        if !customerFeedback.trimmingCharacters(in: .whitespaces).isEmpty { params["customerFeedback"] = customerFeedback }
        if !careAdvice.trimmingCharacters(in: .whitespaces).isEmpty { params["careAdvice"] = careAdvice }

        do {
            try await APIClient.shared.requestVoid(.completeOrder(id: orderId, params: params))
            saved = true
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func createWorkFromOrder() async {
        creatingWork = true
        defer { creatingWork = false }
        do {
            let work: NailWork = try await APIClient.shared.request(.resource(role: .technician, path: "works/from-order/\(orderId)", method: "POST", body: [:]))
            createdWorkId = work.id
            showWorkEditor = true
        } catch {
            self.error = "创建作品失败：\(error.localizedDescription)"
        }
    }

    private func parseISODate(_ str: String) -> Date? {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: str)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack { CompleteServiceView(orderId: 1) }
}