import SwiftUI

// MARK: - Notification Settings

struct NotificationSettingsView: View {
    @AppStorage("pushEnabled") private var pushEnabled = true
    @AppStorage("orderNotify") private var orderNotify = true
    @AppStorage("messageNotify") private var messageNotify = true
    @AppStorage("marketingNotify") private var marketingNotify = false

    var body: some View {
        List {
            Section {
                Toggle(isOn: $pushEnabled) {
                    Label("推送通知", systemImage: "bell.fill")
                }
            } header: {
                Text("通知开关")
            } footer: {
                Text("关闭后将不会收到任何推送通知")
            }

            if pushEnabled {
                Section("通知类型") {
                    Toggle(isOn: $orderNotify) {
                        Label("订单通知", systemImage: "doc.text.fill")
                    }
                    Toggle(isOn: $messageNotify) {
                        Label("消息通知", systemImage: "bubble.left.fill")
                    }
                    Toggle(isOn: $marketingNotify) {
                        Label("营销通知", systemImage: "megaphone.fill")
                    }
                }
            }
        }
        .navigationTitle("通知设置")
    }
}
