import SwiftUI

struct AccountDeletionView: View {
    let role: UserRole
    struct StateResponse: Decodable {
        let request: Record?
        let blockers: [String]
        struct Record: Decodable { let status: String; let reason: String? }
    }
    @State private var state: StateResponse?
    @State private var reason = ""
    @State private var confirmed = false
    @State private var busy = false
    @State private var error: String?
    @State private var confirmCancel = false
    var body: some View {
        Form {
            if let state {
                Section("注销审核") {
                    Text(state.request?.status == "pending" ? "注销申请等待审核" : "申请注销当前角色账号")
                    ForEach(state.blockers, id: \.self) { Text($0) }
                    if state.request?.status == "pending" {
                        Button("撤回申请") { confirmCancel = true }.frame(minHeight: 44)
                    } else {
                        TextField("注销原因", text: $reason, axis: .vertical)
                        Toggle("我理解账号注销会使该角色无法继续使用", isOn: $confirmed)
                        Button("提交注销申请", role: .destructive) { Task { await submit(cancel: false) } }
                            .frame(minHeight: 44)
                            .disabled(!confirmed || reason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !state.blockers.isEmpty)
                    }
                }
            }
            if let error { Text(error); Button("重试") { Task { await load() } } }
            if busy { ProgressView() }
        }
        .disabled(busy)
        .navigationTitle("账号注销")
        .task { await load() }
        .alert("确认撤回注销申请？", isPresented: $confirmCancel) {
            Button("返回", role: .cancel) {}
            Button("撤回申请") { Task { await submit(cancel: true) } }
        }
    }
    private func load() async {
        busy = true
        defer { busy = false }
        do { state = try await APIClient.shared.request(.resource(role: role, path: "account-deletion")); error = nil }
        catch { self.error = error.localizedDescription }
    }
    private func submit(cancel: Bool) async {
        guard !busy else { return }
        busy = true
        do {
            try await APIClient.shared.requestVoid(.resource(role: role, path: "account-deletion" + (cancel ? "/cancel" : ""), method: "POST", body: cancel ? [:] : ["reason": reason, "confirmed": true]))
            await load()
        } catch { self.error = error.localizedDescription }
        busy = false
    }
}
