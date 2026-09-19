import SwiftUI

struct BookingService: Decodable, Identifiable {
    let id: String
    let name: String
    let durationMinutes: Int
    let price: Price
    struct Price: Decodable { let min: Double?; let max: Double? }
}

struct CreateOrderView: View {
    let techId: Int
    let techName: String
    @Environment(\.dismiss) private var dismiss
    @State private var services: [BookingService] = []
    @State private var shops: [BookingShop] = []
    @State private var selectedServices: Set<String> = []
    @State private var shopName = ""
    @State private var date = Date().addingTimeInterval(86400)
    @State private var custom = false
    @State private var title = ""
    @State private var remark = ""
    @State private var busy = false
    @State private var loaded = false
    @State private var error: String?
    @State private var lastSubmission: Data?
    @State private var applicationKey = UUID().uuidString

    var body: some View {
        Form {
            Section("到店预约 · \(techName)") {
                Picker("门店", selection: $shopName) {
                    Text("请选择门店").tag("")
                    ForEach(shops) { Text($0.name).tag($0.name) }
                }
                if let shop = shops.first(where: { $0.name == shopName }) { Text(shop.address).font(.footnote) }
                Text("提交后由美甲师确认排期，款项在线下支付。")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            Section("服务内容") {
                Toggle("自定义需求", isOn: $custom)
                if custom {
                    TextField("需求标题", text: $title)
                } else {
                    ForEach(services) { service in
                        Toggle(isOn: Binding(get: { selectedServices.contains(service.id) }, set: {
                            if $0 { selectedServices.insert(service.id) } else { selectedServices.remove(service.id) }
                        })) {
                            VStack(alignment: .leading) {
                                Text(service.name)
                                Text("\(service.durationMinutes) 分钟 · ¥\(service.price.min ?? 0, specifier: "%.2f") 起").font(.footnote)
                            }
                        }
                    }
                }
                TextField("需求描述或预约备注", text: $remark, axis: .vertical).lineLimit(3...6)
            }
            Section("期望到店时间（北京时间）") {
                DatePicker("日期和时间", selection: $date, in: Date()...)
                    .environment(\.timeZone, TimeZone(identifier: "Asia/Shanghai")!)
            }
            if let error { Section { Text(error) } }
            Section {
                Button("提交预约申请") { Task { await submit() } }.frame(minHeight: 44)
                    .disabled(!loaded || shopName.isEmpty || (custom ? title.trimmingCharacters(in: .whitespaces).isEmpty : selectedServices.isEmpty))
                if busy { ProgressView() }
                if !loaded { Button("重新加载") { Task { await load() } } }
            }
        }
        .disabled(busy)
        .navigationTitle("新建预约")
        .task { await load() }
    }

    private func load() async {
        busy = true
        defer { busy = false }
        do {
            let me: ClientUser = try await APIClient.shared.request(.clientMe)
            guard let tech = me.technicians?.first(where: { $0.id == techId }) else {
                error = "请先绑定这位美甲师"; return
            }
            shops = (tech.shopAddresses ?? []).filter { $0.enabled != false }
            services = try await APIClient.shared.request(.publicResource(path: "brands/\(techId)/services?pageSize=50"))
            if shops.count == 1 { shopName = shops[0].name }
            loaded = true
            error = shops.isEmpty ? "美甲师尚未开放到店预约" : nil
        } catch { self.error = error.localizedDescription }
    }

    private func submit() async {
        guard !busy, loaded, !shopName.isEmpty else { return }
        busy = true
        defer { busy = false }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Asia/Shanghai")
        formatter.dateFormat = "yyyy-MM-dd"
        let day = formatter.string(from: date)
        formatter.dateFormat = "HH:mm"
        var body: [String: Any] = ["techId": techId, "serviceDate": day, "startTime": formatter.string(from: date),
                                   "serviceType": "到店美甲", "shopAddress": ["name": shopName],
                                   "applicationKey": applicationKey, "remark": remark]
        if custom { body["customTitle"] = title; body["customDescription"] = remark }
        else { body["selectedServiceIds"] = Array(selectedServices).sorted() }
        do {
            var fingerprint = body
            fingerprint.removeValue(forKey: "applicationKey")
            let encoded = try JSONSerialization.data(withJSONObject: fingerprint, options: .sortedKeys)
            if let previous = lastSubmission, previous != encoded {
                applicationKey = UUID().uuidString
                body["applicationKey"] = applicationKey
            }
            lastSubmission = encoded
            try await APIClient.shared.requestVoid(.createClientOrder(params: body))
            dismiss()
        } catch { self.error = error.localizedDescription }
    }
}
