import SwiftUI

// MARK: - Technician Profile (synced with wxapp technician/profile)

struct TechnicianProfileView: View {
    @EnvironmentObject var appState: AppState
    @State private var profile: TechnicianProfile?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Hero Header (wxapp: gradient #ff6b8a -> #ff8fa3)
                    heroHeader

                    VStack(spacing: Spacing.sectionGap) {
                        // Stats Card (wxapp: 4 rows)
                        statsCard

                        // Order shortcuts
                        orderShortcutsCard

                        // Tools grid
                        toolsGrid

                        // Settings menu
                        menuCard(items: [
                            MenuItem(icon: "person.text.rectangle", title: "个人设置", iconBg: .nbPrimarySoft, destination: AnyView(TechProfileSettingsView())),
                            MenuItem(icon: "lock.fill", title: "账号安全", iconBg: .nbPurpleSoft, destination: AnyView(ChangePasswordView(role: .technician))),
                            MenuItem(icon: "questionmark.circle.fill", title: "帮助反馈", iconBg: NBColors.page, destination: AnyView(HelpFeedbackView(role: .technician))),
                            MenuItem(icon: "info.circle.fill", title: "关于", iconBg: NBColors.page, destination: AnyView(AboutView()))
                        ])

                        // Logout
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

    // MARK: - Hero Header

    private var heroHeader: some View {
        ZStack(alignment: .bottomLeading) {
            LinearGradient(
                colors: [NBColors.action, NBColors.action],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(height: 200)

            // Decorative circles
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

            HStack(spacing: Spacing.lg) {
                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.3))
                        .frame(width: 58, height: 58)
                    Text(String(profile?.name.first ?? "?"))
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                }
                .overlay(Circle().stroke(Color.white.opacity(0.45), lineWidth: 2))

                VStack(alignment: .leading, spacing: 2) {
                    Text(profile?.name ?? "")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.white)
                    Text(profile?.phone ?? "")
                        .font(NBFont.captionLarge)
                        .foregroundColor(.white.opacity(0.7))
                }
                Spacer()

                NavigationLink { TechProfileSettingsView() } label: {
                    HStack(spacing: 2) {
                        Text("编辑")
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

    // MARK: - Stats Card

    private var statsCard: some View {
        VStack(spacing: 0) {
            statRow("今日订单", "0", "本月收入", "¥0")
            Divider().padding(.horizontal, Spacing.cardPadding)
            statRow("客户总数", "0", "作品数量", "0")
        }
        .background(Color.nbSurfaceGlass)
        .cornerRadius(Radius.card)
        .shadow(color: NBColors.ink.opacity(0.06), radius: 12, y: 2)
    }

    private func statRow(_ l1: String, _ v1: String, _ l2: String, _ v2: String) -> some View {
        HStack {
            VStack(spacing: 2) {
                Text(l1).font(NBFont.captionMedium).foregroundColor(.nbTextSecondary)
                Text(v1).font(NBFont.titleMedium).fontWeight(.bold).foregroundColor(.nbTextPrimary)
            }
            .frame(maxWidth: .infinity)
            Divider().frame(height: 30)
            VStack(spacing: 2) {
                Text(l2).font(NBFont.captionMedium).foregroundColor(.nbTextSecondary)
                Text(v2).font(NBFont.titleMedium).fontWeight(.bold).foregroundColor(.nbPrimary)
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.vertical, Spacing.md)
        .padding(.horizontal, Spacing.cardPadding)
    }

    // MARK: - Order Shortcuts

    private var orderShortcutsCard: some View {
        HStack(spacing: Spacing.md) {
            ForEach([
                ("clock", "待报价", Color.nbWarningSoft, Color.nbWarning),
                ("checkmark.circle", "待确认", Color.nbInfoSoft, Color.nbInfo),
                ("play.circle", "进行中", Color.nbSuccessSoft, Color.nbSuccess),
                ("checkmark.seal", "已完成", Color.nbStatusGreenBg, Color.nbStatusGreen)
            ], id: \.1) { icon, title, bg, fg in
                VStack(spacing: Spacing.xs) {
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundColor(fg)
                        .frame(width: 40, height: 40)
                        .background(bg)
                        .cornerRadius(Radius.md)
                    Text(title)
                        .font(NBFont.captionMedium)
                        .foregroundColor(.nbTextSecondary)
                    Text("0")
                        .font(NBFont.bodyMedium)
                        .fontWeight(.semibold)
                        .foregroundColor(.nbTextPrimary)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(Spacing.cardPadding)
        .background(Color.nbSurfaceGlass)
        .cornerRadius(Radius.card)
        .shadow(color: NBColors.ink.opacity(0.06), radius: 12, y: 2)
    }

    // MARK: - Tools Grid

    private var toolsGrid: some View {
        let tools: [(String, String, Color, AnyView)] = [
            ("photo.on.rectangle.angled", "作品管理", .nbPrimarySoft, AnyView(TechnicianWorksView())),
            ("list.bullet.rectangle", "服务项目", .nbPurpleSoft, AnyView(TechnicianServicesView())),
            ("building.2.fill", "门店管理", NBColors.page, AnyView(ShopManagementView())),
            ("car.fill", "上门服务", NBColors.page, AnyView(HomeServiceSettingsView())),
            ("calendar.badge.clock", "服务时间", NBColors.page, AnyView(Text("服务时间"))),
            ("tag.fill", "标签管理", NBColors.page, AnyView(Text("标签管理"))),
            ("crown.fill", "订阅计划", NBColors.page, AnyView(SubscriptionView())),
            ("doc.text.fill", "全部订单", .nbSecondarySoft, AnyView(TechOrdersListView()))
        ]

        return LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], spacing: Spacing.md) {
            ForEach(tools.indices, id: \.self) { i in
                NavigationLink(destination: tools[i].3) {
                    VStack(spacing: Spacing.xs) {
                        Image(systemName: tools[i].0)
                            .font(.system(size: 20))
                            .foregroundColor(.nbPrimary)
                            .frame(width: 40, height: 40)
                            .background(tools[i].2)
                            .cornerRadius(Radius.md)
                        Text(tools[i].1)
                            .font(NBFont.captionMedium)
                            .foregroundColor(.nbTextSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.sm)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(Spacing.cardPadding)
        .background(Color.nbSurfaceGlass)
        .cornerRadius(Radius.card)
        .shadow(color: NBColors.ink.opacity(0.06), radius: 12, y: 2)
    }

    // MARK: - Menu Card

    private func menuCard(items: [MenuItem]) -> some View {
        VStack(spacing: 0) {
            ForEach(items.indices, id: \.self) { index in
                let item = items[index]
                NavigationLink(destination: item.destination) {
                    HStack(spacing: Spacing.md) {
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
                    Divider().padding(.leading, 36 + Spacing.cardPadding + Spacing.md)
                }
            }
        }
        .background(Color.nbSurfaceGlass)
        .cornerRadius(Radius.cardLg)
        .shadow(color: NBColors.ink.opacity(0.07), radius: 16, y: 4)
    }

    private func loadProfile() async {
        do {
            profile = try await APIClient.shared.request(.technicianMe)
        } catch {}
    }
}
