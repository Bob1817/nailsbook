import SwiftUI
import UserNotifications

struct NotificationSettingsView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var status = "读取中"
    var body: some View {
        List {
            Section("系统通知权限") {
                Text(status)
                Button("打开系统设置") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
                }.frame(minHeight: 44)
            }
            Section {
                Text("系统授权不代表服务端推送已经启用。微信订阅消息不适用于 iOS；预约状态以应用内刷新为准。")
            }
        }
        .navigationTitle("通知设置")
        .task { await refresh() }
        .onChange(of: scenePhase) { if $0 == .active { Task { await refresh() } } }
    }
    private func refresh() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        switch settings.authorizationStatus {
        case .authorized: status = "系统已授权"
        case .denied: status = "系统已关闭通知"
        case .provisional, .ephemeral: status = "临时授权"
        case .notDetermined: status = "尚未申请通知权限"
        @unknown default: status = "未知权限状态"
        }
    }
}
