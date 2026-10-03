import SwiftUI

// MARK: - Privacy Settings (Technician)

struct PrivacySettingsView: View {
    @State private var showPhone = true
    @State private var showLocation = true
    @State private var allowSearch = true
    @State private var isLoading = true
    @State private var saving = false

    var body: some View {
        List {
            Section("个人信息") {
                Toggle(isOn: $showPhone) {
                    Label("显示手机号", systemImage: "phone.fill")
                }
                .onChange(of: showPhone) { _ in Task { await save() } }

                Toggle(isOn: $showLocation) {
                    Label("显示位置信息", systemImage: "location.fill")
                }
                .onChange(of: showLocation) { _ in Task { await save() } }
            }

            Section {
                Toggle(isOn: $allowSearch) {
                    Label("允许被搜索", systemImage: "magnifyingglass")
                }
                .onChange(of: allowSearch) { _ in Task { await save() } }
            } header: {
                Text("发现")
            } footer: {
                Text("关闭后，客户无法通过搜索找到你")
            }

            if saving {
                HStack {
                    Spacer()
                    ProgressView()
                    Text("保存中...")
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.muted)
                    Spacer()
                }
            }
        }
        .navigationTitle("隐私设置")
        .task { await loadProfile() }
        .disabled(isLoading)
    }

    private func loadProfile() async {
        do {
            let profile: TechnicianProfile = try await APIClient.shared.request(.technicianMe)
            showPhone = profile.showPhone ?? true
            showLocation = profile.showLocation ?? true
            allowSearch = profile.allowSearch ?? true
        } catch {}
        isLoading = false
    }

    private func save() async {
        guard !saving else { return }
        saving = true
        defer { saving = false }
        do {
            let params: [String: Any] = [
                "showPhone": showPhone,
                "showLocation": showLocation,
                "allowSearch": allowSearch
            ]
            try await APIClient.shared.requestVoid(.updateTechnicianProfile(params: params))
        } catch {}
    }
}