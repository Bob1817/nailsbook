import SwiftUI

struct TechnicianServicesView: View {
    @State private var services: [TechnicianService] = []
    @State private var editing: TechnicianService?
    @State private var creating = false
    @State private var deleting: TechnicianService?
    @State private var busy = false
    @State private var error: String?
    var body: some View {
        List {
            ForEach(services) { service in
                VStack(alignment: .leading, spacing: 8) {
                    Text(service.name).font(.headline)
                    Text("¥\(service.price ?? 0, specifier: "%.2f") · \(service.durationMinutes ?? 0) 分钟")
                    Text(service.isActive ? "可预约" : "已停用").font(.footnote)
                    HStack {
                        Button("编辑") { editing = service }
                        Spacer()
                        Button(service.isActive ? "停用" : "启用") { mutate(.toggleService(id: service.id)) }
                        Button("删除", role: .destructive) { deleting = service }
                    }.buttonStyle(.borderless).frame(minHeight: 44)
                }
            }
            if let error { Text(error); Button("重试") { Task { await load() } } }
            if busy { ProgressView() }
        }
        .disabled(busy)
        .navigationTitle("服务项目")
        .toolbar { Button("添加") { creating = true } }
        .task { await load() }
        .refreshable { await load() }
        .sheet(isPresented: $creating) { EditServiceView(service: nil) { await load() } }
        .sheet(item: $editing) { service in EditServiceView(service: service) { await load() } }
        .confirmationDialog("确认删除服务项目？", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }), titleVisibility: .visible) {
            Button("删除", role: .destructive) { if let deleting { mutate(.deleteService(id: deleting.id)) } }
        }
    }
    private func load() async {
        busy = true
        defer { busy = false }
        do { services = try await APIClient.shared.request(.services); error = nil }
        catch { self.error = error.localizedDescription }
    }
    private func mutate(_ endpoint: Endpoint) {
        guard !busy else { return }
        busy = true
        Task {
            defer { busy = false }
            do { try await APIClient.shared.requestVoid(endpoint); await load() }
            catch { self.error = error.localizedDescription }
        }
    }
}

struct EditServiceView: View {
    let service: TechnicianService?
    let onSave: () async -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var description = ""
    @State private var price = ""
    @State private var duration = 60
    @State private var category = "basic_care"
    @State private var busy = false
    @State private var error: String?
    var body: some View {
        NavigationStack {
            Form {
                TextField("服务名称", text: $name)
                TextField("服务描述", text: $description, axis: .vertical)
                TextField("价格（元）", text: $price).keyboardType(.decimalPad)
                Stepper("时长 \(duration) 分钟", value: $duration, in: 1...1440)
                Picker("分类", selection: $category) {
                    Text("基础护理").tag("basic_care")
                    Text("色彩款式").tag("color_style")
                    Text("延长加固").tag("extension_reinforcement")
                    Text("卸甲").tag("removal")
                }
                if let error { Text(error) }
                Button("保存") { Task { await save() } }.frame(minHeight: 44)
                if busy { ProgressView() }
            }
            .disabled(busy)
            .navigationTitle(service == nil ? "添加服务" : "编辑服务")
            .toolbar { Button("关闭") { dismiss() }.disabled(busy) }
            .onAppear {
                name = service?.name ?? ""; description = service?.description ?? ""
                price = service?.price.map { String(format: "%.2f", $0) } ?? ""
                duration = service?.durationMinutes ?? 60; category = service?.category ?? "basic_care"
            }
        }
    }
    private func save() async {
        guard !busy else { return }
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, let fen = OrderMoney.fen(price) else {
            error = "请填写服务名称和有效价格"; return
        }
        busy = true
        defer { busy = false }
        let body: [String: Any] = ["name": name, "description": description, "price": Double(fen) / 100, "durationMinutes": duration, "category": category]
        do {
            try await APIClient.shared.requestVoid(service.map { .updateService(id: $0.id, params: body) } ?? .createService(params: body))
            await onSave(); dismiss()
        } catch { self.error = error.localizedDescription }
    }
}
