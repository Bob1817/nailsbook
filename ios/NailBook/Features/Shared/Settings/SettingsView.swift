import SwiftUI

// MARK: - Client Settings

struct ClientSettingsView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        List {
            Section("账号安全") {
                NavigationLink { ChangePasswordView(role: .client) } label: {
                    Label("修改密码", systemImage: "lock.fill")
                }
                NavigationLink { NotificationSettingsView() } label: {
                    Label("通知设置", systemImage: "bell.fill")
                }
            }

            Section("关于") {
                NavigationLink { HelpFeedbackView(role: .client) } label: {
                    Label("帮助与反馈", systemImage: "questionmark.circle.fill")
                }
                NavigationLink { AboutView() } label: {
                    Label("关于 NailBook", systemImage: "info.circle.fill")
                }
            }

            Section {
                Button(role: .destructive) {
                    Task { await appState.logout() }
                } label: {
                    HStack {
                        Spacer()
                        Text("退出登录")
                            .font(NBFont.bodyLarge)
                        Spacer()
                    }
                }
            }
        }
        .navigationTitle("设置")
    }
}

// MARK: - Technician Settings

struct TechnicianSettingsView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        List {
            Section("账号安全") {
                NavigationLink { ChangePasswordView(role: .technician) } label: {
                    Label("修改密码", systemImage: "lock.fill")
                }
                NavigationLink { NotificationSettingsView() } label: {
                    Label("通知设置", systemImage: "bell.fill")
                }
                NavigationLink { PrivacySettingsView() } label: {
                    Label("隐私设置", systemImage: "hand.raised.fill")
                }
            }

            Section("经营") {
                NavigationLink { ShopManagementView() } label: {
                    Label("门店管理", systemImage: "building.2.fill")
                }
                NavigationLink { HomeServiceSettingsView() } label: {
                    Label("上门服务设置", systemImage: "car.fill")
                }
                NavigationLink { SubscriptionView() } label: {
                    Label("订阅计划", systemImage: "crown.fill")
                }
            }

            Section("关于") {
                NavigationLink { HelpFeedbackView(role: .technician) } label: {
                    Label("帮助与反馈", systemImage: "questionmark.circle.fill")
                }
                NavigationLink { AboutView() } label: {
                    Label("关于 NailBook", systemImage: "info.circle.fill")
                }
            }

            Section {
                Button(role: .destructive) {
                    Task { await appState.logout() }
                } label: {
                    HStack {
                        Spacer()
                        Text("退出登录")
                            .font(NBFont.bodyLarge)
                        Spacer()
                    }
                }
            }
        }
        .navigationTitle("设置")
    }
}
