import SwiftUI

// MARK: - Technician Home (synced with wxapp technician/home)

struct TechnicianHomeView: View {
    @EnvironmentObject var appState: AppState
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            ZStack {
                NBGradient.pageBg.ignoresSafeArea()

                if isLoading {
                    NBLoadingView()
                } else {
                    ScrollView {
                        VStack(spacing: Spacing.sectionGap) {
                            // Business Hero Card (wxapp: gradient #ff668e -> #8b5cf6)
                            businessHeroCard

                            // Next Order Card
                            nextOrderCard

                            // Today Schedule
                            todayScheduleCard
                        }
                        .padding(.horizontal, Spacing.page)
                        .padding(.vertical, Spacing.lg)
                        .padding(.bottom, 100)
                    }
                }
            }
            .navigationTitle("工作台")
            .navigationBarTitleDisplayMode(.inline)
            .task { await loadData() }
            .refreshable { await loadData() }
        }
    }

    // MARK: - Business Hero (wxapp: gradient card with stats)

    private var businessHeroCard: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("本月概览")
                        .font(NBFont.captionLarge)
                        .foregroundColor(.white.opacity(0.7))
                    Text("¥0")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.white)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("已完成")
                        .font(NBFont.captionMedium)
                        .foregroundColor(.white.opacity(0.6))
                    Text("0 单")
                        .font(NBFont.titleMedium)
                        .foregroundColor(.white)
                }
            }

            HStack(spacing: Spacing.lg) {
                statItem("待报价", "0", .white.opacity(0.8))
                statItem("待确认", "0", .white.opacity(0.8))
                statItem("客户数", "0", .white.opacity(0.8))
            }
        }
        .padding(Spacing.cardPadding)
        .background(NBGradient.primary)
        .cornerRadius(Radius.hero)
        .shadow(color: Color.nbPrimary.opacity(0.3), radius: 16, y: 6)
    }

    private func statItem(_ title: String, _ value: String, _ color: Color) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(NBFont.titleMedium)
                .fontWeight(.bold)
                .foregroundColor(.white)
            Text(title)
                .font(NBFont.captionMedium)
                .foregroundColor(.white.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Next Order Card

    private var nextOrderCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Image(systemName: "clock")
                    .foregroundColor(.nbPrimary)
                Text("下一个预约")
                    .font(NBFont.bodyLarge)
                    .fontWeight(.semibold)
                Spacer()
                Text("暂无")
                    .font(NBFont.captionLarge)
                    .foregroundColor(.nbTextTertiary)
            }
        }
        .padding(Spacing.cardPadding)
        .background(Color.nbSurfaceGlass)
        .cornerRadius(Radius.card)
        .shadow(color: NBColors.ink.opacity(0.06), radius: 12, y: 2)
    }

    // MARK: - Today Schedule Card

    private var todayScheduleCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Image(systemName: "calendar")
                    .foregroundColor(.nbPrimary)
                Text("今日行程")
                    .font(NBFont.bodyLarge)
                    .fontWeight(.semibold)
                Spacer()
                Text("0 单")
                    .font(NBFont.captionLarge)
                    .foregroundColor(.nbTextTertiary)
            }

            VStack(spacing: Spacing.md) {
                Image(systemName: "calendar.badge.clock")
                    .font(.system(size: 32))
                    .foregroundColor(.nbTextTertiary)
                Text("今日暂无预约")
                    .font(NBFont.bodyMedium)
                    .foregroundColor(.nbTextSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.xxl)
        }
        .padding(Spacing.cardPadding)
        .background(Color.nbSurfaceGlass)
        .cornerRadius(Radius.card)
        .shadow(color: NBColors.ink.opacity(0.06), radius: 12, y: 2)
    }

    private func loadData() async {
        isLoading = false
    }
}
