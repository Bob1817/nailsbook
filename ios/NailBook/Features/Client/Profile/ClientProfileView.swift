import SwiftUI

// MARK: - Client Profile (synced with wxapp client/profile)

struct ClientProfileView: View {
    @EnvironmentObject var appState: AppState
    @State private var user: ClientUser?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Hero Header (wxapp: gradient #ff6b8a -> #c084fc, decorative circles)
                    heroHeader

                    VStack(spacing: Spacing.sectionGap) {
                        // Menu sections
                        menuCard(items: [
                            MenuItem(icon: "paintbrush.fill", title: "我的设计", iconBg: .nbPrimarySoft, destination: AnyView(DesignsListView())),
                            MenuItem(icon: "heart.fill", title: "我的收藏", iconBg: Color(hex: "FFF1F5"), destination: AnyView(Text("我的收藏"))),
                            MenuItem(icon: "hand.thumbsup.fill", title: "我的点赞", iconBg: Color(hex: "FFF7ED"), destination: AnyView(Text("我的点赞"))),
                            MenuItem(icon: "location.fill", title: "地址管理", iconBg: Color(hex: "ECFDF5"), destination: AnyView(AddressesListView())),
                            MenuItem(icon: "person.2.fill", title: "绑定美甲师", iconBg: .nbPurpleSoft, destination: AnyView(Text("绑定美甲师"))),
                            MenuItem(icon: "envelope.fill", title: "推荐好友", iconBg: Color(hex: "EFF6FF"), destination: AnyView(Text("推荐好友"))),
                            MenuItem(icon: "exclamationmark.bubble.fill", title: "问题反馈", iconBg: Color(hex: "FEF2F2"), destination: AnyView(HelpFeedbackView(role: .client)))
                        ])

                        menuCard(items: [
                            MenuItem(icon: "lock.fill", title: "修改密码", iconBg: .nbPrimarySoft, destination: AnyView(ChangePasswordView(role: .client))),
                            MenuItem(icon: "book.fill", title: "使用手册", iconBg: .nbPurpleSoft, destination: AnyView(Text("使用手册"))),
                            MenuItem(icon: "doc.text.fill", title: "用户协议", iconBg: Color(hex: "F3F4F6"), destination: AnyView(Text("用户协议"))),
                            MenuItem(icon: "hand.raised.fill", title: "隐私政策", iconBg: Color(hex: "ECFDF5"), destination: AnyView(Text("隐私政策")))
                        ])

                        // Logout button
                        Button(role: .destructive) {
                            Task { await appState.logout() }
                        } label: {
                            Text("退出登录")
                                .font(NBFont.bodyLarge)
                                .fontWeight(.medium)
                                .foregroundColor(.nbError)
                                .frame(maxWidth: .infinity)
                                .frame(height: 52)
                                .background(Color.nbSurfaceGlass)
                                .cornerRadius(Radius.xl)
                        }
                        .padding(.horizontal, Spacing.page)
                        .padding(.bottom, 100)
                    }
                    .padding(.horizontal, Spacing.page)
                    .offset(y: -30)
                }
            }
            .navigationTitle("我的")
            .navigationBarTitleDisplayMode(.inline)
            .ignoresSafeArea(edges: .top)
            .task { await loadProfile() }
        }
    }

    // MARK: - Hero Header (wxapp: gradient + decorative circles)

    private var heroHeader: some View {
        ZStack(alignment: .bottomLeading) {
            // Background gradient
            NBGradient.heroHeader
                .frame(height: 200)

            // Decorative circles (wxapp: ::before 240rpx, ::after 180rpx)
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.10))
                    .frame(width: 120, height: 120)
                    .offset(x: 80, y: -40)
                Circle()
                    .fill(Color.white.opacity(0.07))
                    .frame(width: 90, height: 90)
                    .offset(x: -30, y: 20)
            }
            .frame(height: 200)
            .clipped()

            // Content
            HStack(spacing: Spacing.lg) {
                // Avatar (wxapp: 116rpx, border 4rpx solid rgba(255,255,255,0.45))
                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.3))
                        .frame(width: 58, height: 58)
                    Text(String(user?.nickname?.first ?? "?"))
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                }
                .overlay(
                    Circle()
                        .stroke(Color.white.opacity(0.45), lineWidth: 2)
                )

                VStack(alignment: .leading, spacing: 2) {
                    Text("PROFILE")
                        .font(.system(size: 10, weight: .medium))
                        .tracking(2)
                        .foregroundColor(.white.opacity(0.6))
                    Text(user?.nickname ?? "未设置昵称")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.white)
                    Text(user?.phone ?? "")
                        .font(NBFont.captionLarge)
                        .foregroundColor(.white.opacity(0.7))
                }
                Spacer()
                NavigationLink { Text("编辑资料") } label: {
                    HStack(spacing: 2) {
                        Text("编辑资料")
                            .font(NBFont.captionMedium)
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(Radius.pill)
                }
            }
            .padding(.horizontal, Spacing.page)
            .padding(.bottom, 30)
        }
        .frame(height: 200)
    }

    // MARK: - Menu Card

    private func menuCard(items: [MenuItem]) -> some View {
        VStack(spacing: 0) {
            ForEach(items.indices, id: \.self) { index in
                let item = items[index]
                NavigationLink(destination: item.destination) {
                    HStack(spacing: Spacing.md) {
                        // Icon (wxapp: 72rpx, border-radius 18rpx)
                        Image(systemName: item.icon)
                            .font(.system(size: 16))
                            .foregroundColor(.nbPrimary)
                            .frame(width: 36, height: 36)
                            .background(item.iconBg)
                            .cornerRadius(9)

                        Text(item.title)
                            .font(NBFont.bodyLarge)
                            .foregroundColor(.nbTextPrimary)

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.system(size: 12))
                            .foregroundColor(.nbTextQuaternary)
                    }
                    .padding(.horizontal, Spacing.cardPadding)
                    .frame(height: 52)
                }
                .buttonStyle(.plain)

                if index < items.count - 1 {
                    Divider()
                        .padding(.leading, 36 + Spacing.cardPadding + Spacing.md)
                }
            }
        }
        .background(Color.nbSurfaceGlass)
        .cornerRadius(Radius.cardLg)
        .shadow(color: Color(hex: "0F172A").opacity(0.07), radius: 16, y: 4)
    }

    private func loadProfile() async {
        do {
            user = try await APIClient.shared.request(.clientMe)
        } catch {}
    }
}

// MARK: - Menu Item

struct MenuItem {
    let icon: String
    let title: String
    let iconBg: Color
    let destination: AnyView
}
