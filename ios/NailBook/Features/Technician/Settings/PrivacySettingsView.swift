import SwiftUI

// MARK: - Privacy Settings (Technician)

struct PrivacySettingsView: View {
    @AppStorage("showPhone") private var showPhone = true
    @AppStorage("showLocation") private var showLocation = true
    @AppStorage("allowSearch") private var allowSearch = true

    var body: some View {
        List {
            Section("个人信息") {
                Toggle(isOn: $showPhone) {
                    Label("显示手机号", systemImage: "phone.fill")
                }
                Toggle(isOn: $showLocation) {
                    Label("显示位置信息", systemImage: "location.fill")
                }
            }

            Section {
                Toggle(isOn: $allowSearch) {
                    Label("允许被搜索", systemImage: "magnifyingglass")
                }
            } header: {
                Text("发现")
            } footer: {
                Text("关闭后，客户无法通过搜索找到你")
            }
        }
        .navigationTitle("隐私设置")
    }
}
