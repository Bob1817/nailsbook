import SwiftUI

// Money is parsed as decimal yuan, validated in integer fen, then sent using the API's units.
enum OrderMoney {
    static func fen(_ text: String, allowZero: Bool = false) -> Int? {
        guard text.range(of: #"^\d+(\.\d{1,2})?$"#, options: .regularExpression) != nil,
              let amount = Decimal(string: text, locale: Locale(identifier: "en_US_POSIX")),
              amount <= 1_000_000, allowZero ? amount >= 0 : amount > 0 else { return nil }
        return NSDecimalNumber(decimal: amount * 100).intValue
    }
}

struct OrderActionView: View {
    enum Action: String, Identifiable {
        case quote = "发送报价", confirm = "确认排期与报价", complete = "完成服务", cancel = "取消预约"
        var id: String { rawValue }
    }
    let order: Order
    let action: Action
    let onSave: () async -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var amount = ""
    @State private var deposit = "0"
    @State private var paid = false
    @State private var date = Date()
    @State private var end = Date()
    @State private var duration = 120
    @State private var note = ""
    @State private var materials = ""
    @State private var care = ""
    @State private var refund = false
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                if action == .cancel {
                    Section("取消确认") {
                        TextField("取消原因", text: $note)
                        if order.isDepositPaid == true, (order.depositAmount ?? 0) > 0 {
                            Toggle("线下退还定金", isOn: $refund)
                            Text("请与客户确认定金处置，此操作只登记退款结果。").font(.footnote)
                        }
                    }
                } else {
                    Section(action == .complete ? "实际收款" : "最终报价") {
                        TextField("总金额（元）", text: $amount).keyboardType(.decimalPad)
                        if action != .complete {
                            TextField("定金（元）", text: $deposit).keyboardType(.decimalPad)
                                .onChange(of: deposit) { if OrderMoney.fen($0, allowZero: true) == 0 { paid = false } }
                            Toggle("已实际收到线下定金", isOn: $paid).disabled((OrderMoney.fen(deposit, allowZero: true) ?? 0) == 0)
                            Text("定金不能超过总价；零定金视为无需定金。").font(.footnote)
                        }
                    }
                    if action == .quote {
                        Section("服务时间") {
                            DatePicker("到店时间", selection: $date, in: Date()...)
                            Stepper("时长 \(duration) 分钟", value: $duration, in: 15...1440, step: 15)
                            TextField("服务项目及报价说明", text: $note, axis: .vertical)
                        }
                    }
                    if action == .complete {
                        Section("服务记录") {
                            DatePicker("实际开始", selection: $date)
                            DatePicker("实际结束", selection: $end)
                            TextField("材料", text: $materials, axis: .vertical)
                            TextField("技法与服务记录", text: $note, axis: .vertical)
                            TextField("养护建议", text: $care, axis: .vertical)
                        }
                    }
                }
                if let error { Text(error) }
                Button(action.rawValue) { Task { await save() } }.frame(minHeight: 44)
                if busy { ProgressView() }
            }
            .disabled(busy)
            .navigationTitle(action.rawValue)
            .toolbar { Button("返回") { dismiss() }.disabled(busy) }
            .onAppear {
                amount = String(format: "%.2f", order.quotePrice ?? 0)
                deposit = String(format: "%.2f", order.depositAmount ?? 0)
                paid = order.isDepositPaid == true
                date = Self.parse(order.startTime) ?? Date()
                end = Date()
            }
        }
    }

    static func parse(_ value: String?) -> Date? {
        guard let value else { return nil }
        let f = ISO8601DateFormatter()
        if let date = f.date(from: value) { return date }
        f.formatOptions.insert(.withFractionalSeconds)
        return f.date(from: value)
    }

    private func save() async {
        guard !busy else { return }
        var body: [String: Any] = [:]
        let path: String
        if action == .cancel {
            path = "cancel"
            body = ["reason": note, "refundDeposit": refund]
        } else {
            guard let total = OrderMoney.fen(amount, allowZero: action == .complete),
                  let depositFen = OrderMoney.fen(deposit, allowZero: true),
                  action == .complete || depositFen <= total else {
                error = "请填写有效金额（最多两位小数），定金不能超过总价"; return
            }
            let yuan = Double(total) / 100
            switch action {
            case .confirm:
                path = "confirm"
                body = ["price": yuan, "depositAmount": Double(depositFen) / 100, "isDepositPaid": depositFen > 0 && paid]
            case .quote:
                path = "review"
                let f = DateFormatter()
                f.locale = Locale(identifier: "en_US_POSIX")
                f.timeZone = TimeZone(identifier: "Asia/Shanghai")
                f.dateFormat = "yyyy-MM-dd"
                let day = f.string(from: date)
                f.dateFormat = "HH:mm"
                body = ["quoteMode": "manual", "amountFen": total, "durationMinutes": duration,
                        "serviceDate": day, "startTime": f.string(from: date), "remark": note,
                        "depositAmount": Double(depositFen) / 100, "isDepositPaid": depositFen > 0 && paid]
            case .complete:
                guard end > date, end <= Date() else { error = "实际结束时间必须晚于开始时间且不晚于当前时间"; return }
                path = "complete"
                let f = ISO8601DateFormatter()
                body = ["actualStartTime": f.string(from: date), "actualEndTime": f.string(from: end),
                        "actualAmount": yuan, "materials": materials, "techniques": note, "careAdvice": care]
            case .cancel: return
            }
        }
        busy = true
        defer { busy = false }
        do {
            try await APIClient.shared.requestVoid(.resource(role: .technician, path: "orders/\(order.id)/\(path)", method: "PATCH", body: body))
            await onSave()
            dismiss()
        } catch { self.error = error.localizedDescription }
    }
}

struct ServiceReviewView: View {
    let orderId: Int
    @Environment(\.dismiss) private var dismiss
    @State private var rating = 5
    @State private var content = ""
    @State private var busy = false
    @State private var error: String?
    var body: some View {
        NavigationStack {
            Form {
                Stepper("评分：\(rating) 星", value: $rating, in: 1...5)
                TextField("服务评价（最多 500 字）", text: $content, axis: .vertical).lineLimit(3...8)
                if let error { Text(error) }
                Button("提交评价") { Task { await save() } }.frame(minHeight: 44)
                    .disabled(busy || content.count > 500)
            }.navigationTitle("服务评价")
                .toolbar { Button("关闭") { dismiss() } }
        }
    }
    private func save() async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            try await APIClient.shared.requestVoid(.resource(role: .client, path: "orders/\(orderId)/review", method: "PATCH", body: ["rating": rating, "content": content, "photos": [], "photoUseAuthorized": false]))
            dismiss()
        } catch { self.error = error.localizedDescription }
    }
}
