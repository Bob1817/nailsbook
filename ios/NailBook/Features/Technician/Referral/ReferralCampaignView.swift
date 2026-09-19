import SwiftUI

// MARK: - Referral Campaign View

struct ReferralCampaignView: View {
    @State private var insights: TechnicianInsights?
    @State private var relations: [ReferralRelation] = []
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Stats
                statsSection

                // Relations
                relationsSection
            }
            .padding(.vertical, Spacing.lg)
        }
        .navigationTitle("推荐活动")
        .background(Color.nbBg)
        .task { await loadData() }
        .refreshable { await loadData() }
    }

    // MARK: - Stats Section

    private var statsSection: some View {
        VStack(spacing: Spacing.md) {
            Text("推荐统计")
                .font(NBFont.titleMedium)
                .frame(maxWidth: .infinity, alignment: .leading)

            HStack(spacing: Spacing.md) {
                statCard("总推荐", value: "\(insights?.referrals?.total ?? 0)")
                statCard("有效推荐", value: "\(insights?.referrals?.qualified ?? 0)")
            }

            HStack(spacing: Spacing.md) {
                statCard("转化率", value: conversionRate)
                statCard("推荐收入", value: formatMoney(insights?.referrals?.qualifiedRevenue ?? 0))
            }
        }
        .padding(.horizontal, Spacing.lg)
    }

    private func statCard(_ title: String, value: String) -> some View {
        NBCard {
            VStack(spacing: Spacing.xs) {
                Text(value)
                    .font(NBFont.titleLarge)
                    .fontWeight(.bold)
                    .foregroundColor(.nbPrimary)
                Text(title)
                    .font(NBFont.captionLarge)
                    .foregroundColor(.nbTextSecondary)
            }
            .frame(maxWidth: .infinity)
        }
    }

    private var conversionRate: String {
        guard let rate = insights?.referrals?.conversionRate else { return "待积累" }
        return "\(Int(rate * 100))%"
    }

    // MARK: - Relations Section

    private var relationsSection: some View {
        VStack(spacing: Spacing.md) {
            Text("推荐记录")
                .font(NBFont.titleMedium)
                .frame(maxWidth: .infinity, alignment: .leading)

            if isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
            } else if relations.isEmpty {
                NBCard {
                    VStack(spacing: Spacing.md) {
                        Image(systemName: "person.2")
                            .font(.system(size: 32))
                            .foregroundColor(.nbTextTertiary)
                        Text("暂无推荐记录")
                            .font(NBFont.bodyMedium)
                            .foregroundColor(.nbTextSecondary)
                        Text("分享您的邀请码给好友，好友注册后即可建立推荐关系")
                            .font(NBFont.captionLarge)
                            .foregroundColor(.nbTextTertiary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
                }
            } else {
                ForEach(relations) { relation in
                    relationRow(relation)
                }
            }
        }
        .padding(.horizontal, Spacing.lg)
    }

    private func relationRow(_ relation: ReferralRelation) -> some View {
        NBCard {
            HStack(spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(relation.referrer?.nickname ?? "客户")
                        .font(NBFont.bodyMedium)
                        .foregroundColor(.nbTextPrimary)
                    Text("推荐给 \(relation.referred?.nickname ?? "新客户")")
                        .font(NBFont.captionLarge)
                        .foregroundColor(.nbTextSecondary)
                    if let date = relation.createdAt {
                        Text(String(date.prefix(10)))
                            .font(NBFont.captionSmall)
                            .foregroundColor(.nbTextTertiary)
                    }
                }

                Spacer()

                Text(statusText(relation.status))
                    .font(NBFont.captionMedium)
                    .foregroundColor(statusColor(relation.status))
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xs)
                    .background(statusColor(relation.status).opacity(0.1))
                    .cornerRadius(Radius.sm)
            }
        }
    }

    private func statusText(_ status: String?) -> String {
        switch status {
        case "pending_first_order": return "待首单"
        case "qualified": return "已生效"
        case "rejected": return "未达标"
        default: return "处理中"
        }
    }

    private func statusColor(_ status: String?) -> Color {
        switch status {
        case "pending_first_order": return .nbWarning
        case "qualified": return .nbSuccess
        case "rejected": return .nbError
        default: return .nbTextTertiary
        }
    }

    // MARK: - Helpers

    private func loadData() async {
        do {
            let month = currentDateInChina().prefix(7).description
            async let insightsRequest: TechnicianInsights = APIClient.shared.request(.technicianInsights(month: month))
            async let relationsRequest: [ReferralRelation] = APIClient.shared.request(.referralRelations)

            insights = try await insightsRequest
            relations = (try? await relationsRequest) ?? []
            isLoading = false
        } catch {
            isLoading = false
            self.error = error.localizedDescription
        }
    }

    private func currentDateInChina() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "Asia/Shanghai")
        return formatter.string(from: Date())
    }

    private func formatMoney(_ amount: Double) -> String {
        if amount >= 10000 {
            return String(format: "¥%.1f万", amount / 10000)
        } else {
            return String(format: "¥%.0f", amount)
        }
    }
}
