import SwiftUI

struct SavedWorksView: View {
    let favorites: Bool
    @State private var works: [NailWork] = []
    @State private var error: String?
    @State private var loading = true
    var body: some View {
        List {
            ForEach(works) { work in
                NavigationLink { WorkDetailView(workId: work.id) } label: { TechWorkRow(work: work) }
            }
            if loading { ProgressView() }
            else if works.isEmpty && error == nil { Text(favorites ? "还没有收藏的作品" : "还没有点赞的作品") }
            if let error { Text(error); Button("重试") { Task { await load() } } }
        }
        .navigationTitle(favorites ? "我的收藏" : "我的点赞")
        .task { await load() }
        .refreshable { await load() }
    }
    private func load() async {
        defer { loading = false }
        do {
            works = try await APIClient.shared.request(favorites ? .favoritesList(page: 1) : .likesList(page: 1))
            error = nil
        } catch { self.error = error.localizedDescription }
    }
}

struct ClientProfileEditView: View {
    @State private var nickname = ""
    @State private var phone = ""
    @State private var loaded = false
    @State private var busy = false
    @State private var message: String?
    @Environment(\.dismiss) var dismiss

    var body: some View {
        VStack(spacing: 0) {
            // Card
            VStack(spacing: 0) {
                // Name row
                HStack(spacing: 12) {
                    Text("名称")
                        .font(.system(size: 15))
                        .foregroundColor(NBColors.ink)

                    Spacer()

                    TextField("请输入名称", text: $nickname)
                        .font(.system(size: 15))
                        .foregroundColor(NBColors.ink)
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 200)
                }
                .frame(minHeight: 56)
                .padding(.horizontal, 14)

                Divider()
                    .padding(.leading, 14)

                // Phone row
                HStack(spacing: 12) {
                    Text("手机号码")
                        .font(.system(size: 15))
                        .foregroundColor(NBColors.ink)

                    Spacer()

                    Text(phone)
                        .font(.system(size: 15))
                        .foregroundColor(NBColors.secondary)
                }
                .frame(minHeight: 56)
                .padding(.horizontal, 14)
            }
            .background(Color.white)
            .cornerRadius(12)
            .padding(.horizontal, 16)
            .padding(.top, 16)

            // Note
            Text("手机号码用于账号登录，换绑功能暂未开放。")
                .font(.system(size: 12))
                .foregroundColor(NBColors.secondary)
                .lineSpacing(1.4)
                .padding(.horizontal, 20)
                .padding(.top, 10)
                .padding(.bottom, 20)

            // Save button
            Button {
                Task { await save() }
            } label: {
                HStack {
                    if busy {
                        ProgressView()
                            .tint(.white)
                    }
                    Text(busy ? "保存中" : "保存修改")
                        .font(.system(size: 16, weight: .semibold))
                }
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .foregroundColor(.white)
                .background(NBColors.action)
                .cornerRadius(10)
            }
            .disabled(!loaded || busy || nickname.isEmpty)
            .padding(.horizontal, 16)

            if let message {
                Text(message)
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.secondary)
                    .padding(.top, 12)
            }

            Spacer()
        }
        .background(NBColors.page)
        .navigationTitle("编辑资料")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            do {
                let me: ClientUser = try await APIClient.shared.request(.clientMe)
                nickname = me.nickname ?? ""
                phone = me.phone
                loaded = true
            } catch {
                message = error.localizedDescription
            }
        }
    }

    private func save() async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            try await APIClient.shared.requestVoid(.updateClientProfile(params: ["nickname": nickname]))
            message = "资料已保存"
            dismiss()
        } catch {
            message = error.localizedDescription
        }
    }
}

struct RoleSwitchButton: View {
    @EnvironmentObject private var appState: AppState
    @State private var busy = false
    var body: some View {
        VStack(alignment: .leading) {
            Button("切换为\(appState.currentRole == .client ? "美甲师" : "客户")") {
                busy = true
                Task {
                    await appState.switchRole(to: appState.currentRole == .client ? .technician : .client)
                    busy = false
                }
            }.frame(minHeight: 44).disabled(busy)
            if let error = appState.sessionError { Text(error).font(.footnote) }
        }
    }
}
