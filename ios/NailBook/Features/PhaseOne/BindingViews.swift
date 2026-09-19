import SwiftUI

struct BoundTechnician: Codable, Identifiable {
    let id: Int
    var name: String?
    var phone: String?
    var isDefault: Bool?
    var bindingStatus: String?
    var invitationCode: String?
    var shopAddresses: [BookingShop]?
}

struct BookingShop: Codable, Identifiable {
    var id: String { name }
    let name: String
    var enabled: Bool?
    var province: String?
    var city: String?
    var district: String?
    var detailAddress: String?
    var address: String { [province, city, district, detailAddress].compactMap { $0 }.joined() }
    enum CodingKeys: String, CodingKey { case name, enabled, province, city, district, detailAddress }
}

struct MyTechniciansView: View {
    @State private var profile: ClientUser?
    @State private var code = ""
    @State private var note = ""
    @State private var found: BoundTechnician?
    @State private var busy = false
    @State private var error: String?
    @State private var removing: BoundTechnician?

    private var active: [BoundTechnician] { profile?.technicians ?? [] }
    private var pending: [BoundTechnician] { profile?.pendingTechnicians ?? [] }

    var body: some View {
        List {
            Section("已绑定 \(active.count) · 待审核 \(pending.count) · 最多 5 位") {
                ForEach(active) { tech in
                    VStack(alignment: .leading, spacing: 12) {
                        Text((tech.name ?? "美甲师") + (tech.isDefault == true ? " · 默认" : ""))
                        NavigationLink("查看作品") { WorksListView(techId: tech.id) }
                        NavigationLink("预约到店") { CreateOrderView(techId: tech.id, techName: tech.name ?? "美甲师") }
                        if tech.isDefault != true {
                            Button("设为默认") { mutate("auth/set-default-technician/\(tech.id)", method: "POST") }
                        }
                        Button("解绑", role: .destructive) { removing = tech }
                    }.padding(.vertical, 8)
                }
                ForEach(pending) { tech in
                    VStack(alignment: .leading) {
                        Text("\(tech.name ?? "美甲师") · 待审核")
                        Button("撤销申请", role: .destructive) { removing = tech }.frame(minHeight: 44)
                    }
                }
            }
            if active.count + pending.count < 5 {
                Section("绑定美甲师") {
                    TextField("8 位邀请码", text: $code)
                        .textInputAutocapitalization(.characters).autocorrectionDisabled()
                        .onChange(of: code) { _ in found = nil }
                    Button("查找美甲师") { Task { await find() } }.frame(minHeight: 44)
                    if let tech = found {
                        Text(tech.name ?? "美甲师")
                        TextField("申请备注（选填）", text: $note)
                        Button("提交绑定申请") {
                            mutate("auth/bind-technician", method: "POST",
                                   body: ["techId": tech.id, "inviteCode": code.uppercased(), "note": note])
                        }.frame(minHeight: 44)
                    }
                }
            }
            if let error { Section { Text(error) } }
            if busy { ProgressView() }
        }
        .navigationTitle("我的美甲师")
        .disabled(busy)
        .task { await load() }
        .refreshable { await load() }
        .confirmationDialog("确认解除这项绑定或申请？", isPresented: Binding(get: { removing != nil }, set: { if !$0 { removing = nil } }), titleVisibility: .visible) {
            if let tech = removing {
                Button(tech.bindingStatus == "pending" ? "撤销申请" : "解绑", role: .destructive) {
                    let path = tech.bindingStatus == "pending" ? "binding-applications" : "unbind-technician"
                    mutate("auth/\(path)/\(tech.id)", method: "DELETE")
                }
            }
        }
    }

    private func load() async {
        do { profile = try await APIClient.shared.request(.clientMe); error = nil }
        catch { self.error = error.localizedDescription }
    }

    private func find() async {
        guard code.count == 8 else { error = "请输入 8 位邀请码"; return }
        busy = true
        defer { busy = false }
        do {
            struct Result: Decodable { let valid: Bool; let technician: BoundTechnician? }
            let result: Result = try await APIClient.shared.request(.findTechnicianByInviteCode(code: code.uppercased()))
            found = result.valid ? result.technician : nil
            error = found == nil ? "无效邀请码" : nil
        } catch { self.error = error.localizedDescription }
    }

    private func mutate(_ path: String, method: String, body: [String: Any]? = nil) {
        guard !busy else { return }
        busy = true
        Task {
            defer { busy = false }
            do {
                try await APIClient.shared.requestVoid(.resource(role: .client, path: path, method: method, body: body))
                found = nil
                await load()
            } catch { self.error = error.localizedDescription }
        }
    }
}

struct BindingApplicationsView: View {
    struct Application: Decodable, Identifiable { let id: Int; let name: String?; let phone: String?; let note: String? }
    @State private var applications: [Application] = []
    @State private var selected: Application?
    @State private var approving = true
    @State private var reason = ""
    @State private var busy = false
    @State private var error: String?
    var body: some View {
        List {
            ForEach(applications) { item in
                VStack(alignment: .leading) {
                    Text(item.name ?? "客户")
                    if let note = item.note { Text(note).font(.footnote) }
                    HStack {
                        Button("通过") { approving = true; selected = item }.frame(minHeight: 44)
                        Spacer()
                        Button("拒绝", role: .destructive) { approving = false; reason = ""; selected = item }.frame(minHeight: 44)
                    }.buttonStyle(.borderless)
                }
            }
            if applications.isEmpty && !busy && error == nil { Text("暂无待审核申请") }
            if let error { Text(error) }
            if busy { ProgressView() }
        }
        .disabled(busy)
        .navigationTitle("绑定申请")
        .task { await load() }
        .refreshable { await load() }
        .alert(approving ? "确认通过绑定申请？" : "拒绝绑定申请", isPresented: Binding(get: { selected != nil }, set: { if !$0 { selected = nil } })) {
            if !approving { TextField("拒绝原因（选填）", text: $reason) }
            Button("返回", role: .cancel) {}
            Button("确认") { if let selected { Task { await submit(selected.id) } } }
        }
    }
    private func load() async {
        busy = true
        defer { busy = false }
        do { applications = try await APIClient.shared.request(.resource(role: .technician, path: "auth/binding-applications")); error = nil }
        catch { self.error = error.localizedDescription }
    }
    private func submit(_ id: Int) async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            try await APIClient.shared.requestVoid(.resource(role: .technician, path: "auth/binding-applications/\(id)/\(approving ? "approve" : "reject")", method: "POST", body: ["reason": reason]))
            applications.removeAll { $0.id == id }
        } catch { self.error = error.localizedDescription }
    }
}
