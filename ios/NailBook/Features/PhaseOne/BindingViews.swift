import SwiftUI

struct BoundTechnician: Codable, Identifiable {
    let id: Int
    var name: String?
    var phone: String?
    var isDefault: Bool?
    var bindingStatus: String?
    var invitationCode: String?
    var shopAddresses: [BookingShop]?

    enum CodingKeys: String, CodingKey {
        case id, name, phone, isDefault, bindingStatus, invitationCode, shopAddresses
    }

    // 容错解码：shopAddresses 解码失败时置 nil
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        name = try c.decodeIfPresent(String.self, forKey: .name)
        phone = try c.decodeIfPresent(String.self, forKey: .phone)
        isDefault = try c.decodeIfPresent(Bool.self, forKey: .isDefault)
        bindingStatus = try c.decodeIfPresent(String.self, forKey: .bindingStatus)
        invitationCode = try c.decodeIfPresent(String.self, forKey: .invitationCode)
        shopAddresses = try? c.decode([BookingShop].self, forKey: .shopAddresses)
    }

    init(id: Int, name: String? = nil, phone: String? = nil, isDefault: Bool? = nil, bindingStatus: String? = nil, invitationCode: String? = nil, shopAddresses: [BookingShop]? = nil) {
        self.id = id
        self.name = name
        self.phone = phone
        self.isDefault = isDefault
        self.bindingStatus = bindingStatus
        self.invitationCode = invitationCode
        self.shopAddresses = shopAddresses
    }
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
                        NavigationLink("查看主页") { ArtistHomeView(artistId: tech.id) }
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
    struct Application: Decodable, Identifiable {
        let id: Int
        var name: String?
        var phone: String?
        var note: String?
        var avatarUrl: String?
    }
    @State private var applications: [Application] = []
    @State private var selected: Application?
    @State private var approving = true
    @State private var reason = ""
    @State private var busy = false
    @State private var processingId: Int?
    @State private var error: String?

    var body: some View {
        ZStack {
            NBColors.page.ignoresSafeArea()

            if busy && applications.isEmpty {
                VStack(spacing: 16) {
                    ProgressView().scaleEffect(1.2)
                    Text("正在加载申请...")
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.muted)
                }
            } else if applications.isEmpty && !busy {
                emptyView
            } else {
                applicationsList
            }
        }
        .navigationTitle("绑定申请")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
        .alert(approving ? "确认通过？" : "拒绝申请", isPresented: Binding(get: { selected != nil }, set: { if !$0 { selected = nil } })) {
            if !approving {
                TextField("拒绝原因（选填）", text: $reason)
            }
            Button("返回", role: .cancel) {}
            Button(approving ? "确认通过" : "确认拒绝") {
                if let selected { Task { await submit(selected.id) } }
            }
            .foregroundColor(approving ? NBColors.action : NBColors.danger)
        } message: {
            if let app = selected {
                Text(approving ? "确认将 \(app.name ?? "该客户") 添加为你的客户吗？" : "拒绝后对方需要重新申请")
            }
        }
    }

    // MARK: - Empty View

    private var emptyView: some View {
        VStack(spacing: 16) {
            Spacer()
            ZStack {
                Circle().fill(NBColors.page).frame(width: 60, height: 60)
                Image(systemName: "person.2")
                    .font(.system(size: 24))
                    .foregroundColor(NBColors.muted)
            }
            Text("暂无待处理申请")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(NBColors.ink)
            Text("客户通过邀请码或品牌主页发起绑定申请后，会出现在这里")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Spacer()
        }
    }

    // MARK: - Applications List

    private var applicationsList: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                ForEach(applications) { item in
                    applicationCard(item)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 30)
        }
    }

    private func applicationCard(_ app: Application) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header: avatar + info
            HStack(spacing: 12) {
                // Avatar
                ZStack {
                    Circle().fill(NBColors.page).frame(width: 48, height: 48)
                    if let url = app.avatarUrl, !url.isEmpty {
                        AsyncImage(url: URL(string: url)) { img in
                            img.resizable().aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Text(String(app.name?.first ?? "?"))
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(NBColors.action)
                        }
                        .frame(width: 48, height: 48).clipShape(Circle())
                    } else {
                        Text(String(app.name?.first ?? "?"))
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(NBColors.action)
                    }
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(app.name ?? "新客户")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(NBColors.ink)
                    if let phone = app.phone, !phone.isEmpty {
                        Text(phone)
                            .font(.system(size: 13))
                            .foregroundColor(NBColors.muted)
                    }
                }

                Spacer()
            }

            // Note
            if let note = app.note, !note.isEmpty {
                HStack(spacing: 4) {
                    Text("留言：")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(NBColors.muted)
                    Text(note)
                        .font(.system(size: 13))
                        .foregroundColor(NBColors.ink)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(NBColors.page)
                .cornerRadius(Radius.sm)
            }

            // Actions
            HStack(spacing: 10) {
                Button {
                    approving = false
                    reason = ""
                    selected = app
                } label: {
                    Text("拒绝")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(NBColors.danger)
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .background(NBColors.danger.opacity(0.08))
                        .cornerRadius(Radius.md)
                }
                .disabled(processingId != nil)

                Button {
                    approving = true
                    selected = app
                } label: {
                    HStack(spacing: 4) {
                        if processingId == app.id {
                            ProgressView().scaleEffect(0.7).tint(.white)
                        }
                        Text("通过")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 40)
                    .background(NBColors.action)
                    .cornerRadius(Radius.md)
                }
                .disabled(processingId != nil)
            }
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(Radius.lg)
        .shadow(color: Color.black.opacity(0.04), radius: 8, y: 2)
    }

    // MARK: - Actions

    private func load() async {
        busy = true
        defer { busy = false }
        do {
            applications = try await APIClient.shared.request(.resource(role: .technician, path: "auth/binding-applications"))
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func submit(_ id: Int) async {
        guard processingId == nil else { return }
        processingId = id
        defer { processingId = nil }

        do {
            let path = approving ? "auth/binding-applications/\(id)/approve" : "auth/binding-applications/\(id)/reject"
            let body: [String: Any]? = approving ? nil : ["reason": reason]
            try await APIClient.shared.requestVoid(.resource(role: .technician, path: path, method: "POST", body: body))
            withAnimation { applications.removeAll { $0.id == id } }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
