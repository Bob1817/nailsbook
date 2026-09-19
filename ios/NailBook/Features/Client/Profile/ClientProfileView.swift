import SwiftUI

// MARK: - Client Profile (aligned with wxapp design)

struct ClientProfileView: View {
    @EnvironmentObject var appState: AppState
    @State private var user: ClientUser?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Profile Header - White background, not gradient
                    profileHeader

                    VStack(spacing: 12) {
                        // My Services Section
                        sectionCard(title: "我的服务", subtitle: "管理预约、设计与服务沟通") {
                            menuItem(icon: "person.2.fill", title: "我的美甲师", iconBg: NBColors.page) {
                                MyTechniciansView()
                            }
                            menuItem(icon: "doc.text.fill", title: "我的订单", iconBg: NBColors.page) {
                                ClientOrdersView()
                            }
                            menuItem(icon: "photo.fill", title: "我的美甲记录", iconBg: NBColors.page) {
                                BeautyArchiveView()
                            }
                            menuItem(icon: "paintbrush.fill", title: "我的设计", iconBg: NBColors.page) {
                                DesignsListView()
                            }
                            menuItem(icon: "bookmark.fill", title: "我的收藏", iconBg: NBColors.page) {
                                SavedWorksView(favorites: true)
                            }
                            menuItem(icon: "heart.fill", title: "我的点赞", iconBg: NBColors.page) {
                                SavedWorksView(favorites: false)
                            }
                            menuItem(icon: "bubble.left.fill", title: "问题反馈", iconBg: NBColors.page) {
                                HelpFeedbackView(role: .client)
                            }
                        }

                        // Account Info Section
                        sectionCard(title: "账户信息", subtitle: "管理个人资料、登录身份与账户安全") {
                            menuItem(icon: "lock.fill", title: "修改密码", iconBg: NBColors.page) {
                                ChangePasswordView(role: .client)
                            }
                            menuItem(icon: "book.fill", title: "使用手册", iconBg: NBColors.page) {
                                Text("使用手册")
                            }
                            menuItem(icon: "doc.text.fill", title: "用户协议", iconBg: NBColors.page) {
                                Text("用户协议")
                            }
                            menuItem(icon: "shield.fill", title: "隐私政策", iconBg: NBColors.page) {
                                Text("隐私政策")
                            }
                            menuItem(icon: "person.crop.circle.badge.minus", title: "账号注销申请", iconBg: NBColors.page) {
                                AccountDeletionView(role: .client)
                            }
                            menuItem(icon: "arrow.triangle.2.circlepath", title: "切换角色", iconBg: NBColors.page, showValue: true, valueText: "当前：客户") {
                                Text("切换角色")
                            }
                            menuItem(icon: "person.crop.square", title: "切换账号", iconBg: NBColors.page) {
                                Text("切换账号")
                            }
                            menuItem(icon: "info.circle.fill", title: "关于我们", iconBg: NBColors.page) {
                                AboutView()
                            }

                            // Logout button
                            Button {
                                Task { await appState.logout() }
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: "rectangle.portrait.and.arrow.right")
                                        .font(.system(size: 16))
                                        .foregroundColor(.red)
                                        .frame(width: 32, height: 32)

                                    Text("退出登录")
                                        .font(.system(size: 15, weight: .medium))
                                        .foregroundColor(.red)

                                    Spacer()

                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14))
                                        .foregroundColor(NBColors.muted)
                                }
                                .padding(.horizontal, 16)
                                .frame(minHeight: 52)
                            }

                            // Version
                            HStack(spacing: 12) {
                                Image(systemName: "info.circle")
                                    .font(.system(size: 16))
                                    .foregroundColor(NBColors.muted)
                                    .frame(width: 32, height: 32)

                                Text("版本")
                                    .font(.system(size: 14))
                                    .foregroundColor(NBColors.muted)

                                Spacer()

                                Text("1.0.0")
                                    .font(.system(size: 14))
                                    .foregroundColor(NBColors.muted)
                            }
                            .padding(.horizontal, 16)
                            .frame(minHeight: 44)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 100) // Tab bar space
                }
            }
            .background(NBColors.page)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("我的")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(NBColors.ink)
                }
            }
            .task { await loadProfile() }
        }
    }

    // MARK: - Profile Header

    private var profileHeader: some View {
        VStack(spacing: 0) {
            // White background header
            HStack(spacing: 12) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(NBColors.softSurface)
                        .frame(width: 48, height: 48)

                    if let avatarUrl = user?.avatarUrl, let url = URL(string: avatarUrl) {
                        AsyncImage(url: url) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Image(systemName: "person.fill")
                                .font(.system(size: 20))
                                .foregroundColor(NBColors.muted)
                        }
                        .frame(width: 48, height: 48)
                        .clipShape(Circle())
                    } else {
                        Image(systemName: "person.fill")
                            .font(.system(size: 20))
                            .foregroundColor(NBColors.muted)
                    }
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(user?.nickname ?? "未设置昵称")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(NBColors.ink)

                    Text(user?.phone ?? "")
                        .font(.system(size: 12))
                        .foregroundColor(NBColors.muted)
                }

                Spacer()

                NavigationLink { ClientProfileEditView() } label: {
                    HStack(spacing: 2) {
                        Text("编辑资料")
                            .font(.system(size: 14))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12))
                    }
                    .foregroundColor(NBColors.link)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.white)
        }
    }

    // MARK: - Section Card

    private func sectionCard<Content: View>(title: String, subtitle: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(NBColors.ink)

                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.muted)
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 8)

            // Content
            VStack(spacing: 0) {
                content()
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 8)
        }
        .background(Color.white)
        .cornerRadius(12)
    }

    // MARK: - Menu Item

    private func menuItem<Destination: View>(
        icon: String,
        title: String,
        iconBg: Color,
        showValue: Bool = false,
        valueText: String = "",
        @ViewBuilder destination: () -> Destination
    ) -> some View {
        NavigationLink(destination: destination()) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundColor(NBColors.ink)
                    .frame(width: 32, height: 32)
                    .background(iconBg)
                    .cornerRadius(8)

                Text(title)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(NBColors.ink)

                Spacer()

                if showValue {
                    Text(valueText)
                        .font(.system(size: 12))
                        .foregroundColor(NBColors.muted)
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.muted)
            }
            .padding(.horizontal, 8)
            .frame(minHeight: 52)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Data Loading

    private func loadProfile() async {
        do {
            user = try await APIClient.shared.request(.clientMe)
        } catch {}
    }
}

// MARK: - Menu Item (legacy support)

struct MenuItem {
    let icon: String
    let title: String
    let iconBg: Color
    let destination: AnyView
}

// MARK: - Preview

#Preview {
    ClientProfileView()
        .environmentObject(AppState.shared)
}
