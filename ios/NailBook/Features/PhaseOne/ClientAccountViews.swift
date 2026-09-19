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
    @State private var city = ""
    @State private var bio = ""
    @State private var loaded = false
    @State private var busy = false
    @State private var message: String?
    var body: some View {
        Form {
            TextField("昵称", text: $nickname)
            TextField("城市", text: $city)
            TextField("个人简介", text: $bio, axis: .vertical)
            Button("保存资料") { Task { await save() } }.frame(minHeight: 44).disabled(!loaded || busy)
            if let message { Text(message) }
        }.navigationTitle("编辑资料")
        .task {
            do {
                let me: ClientUser = try await APIClient.shared.request(.clientMe)
                nickname = me.nickname ?? ""; city = me.city ?? ""; bio = me.bio ?? ""; loaded = true
            } catch { message = error.localizedDescription }
        }
    }
    private func save() async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            try await APIClient.shared.requestVoid(.updateClientProfile(params: ["nickname": nickname, "city": city, "bio": bio]))
            message = "资料已保存"
        } catch { message = error.localizedDescription }
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
