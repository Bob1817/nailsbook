import SwiftUI

// MARK: - Subscription View

struct SubscriptionView: View {
    @State private var currentPlan: SubscriptionPlan?
    @State private var plans: [SubscriptionPlan] = []
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Current plan
                if let plan = currentPlan {
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            HStack {
                                Text("当前计划")
                                    .font(NBFont.titleSmall)
                                Spacer()
                                NBChip(title: plan.name, color: .nbPrimary)
                            }
                            if let price = plan.price {
                                HStack(alignment: .firstTextBaseline) {
                                    Text("¥\(String(format: "%.0f", price))")
                                        .font(NBFont.displaySmall)
                                        .foregroundColor(.nbPrimary)
                                    Text("/\(plan.billingCycle ?? "月")")
                                        .font(NBFont.bodyMedium)
                                        .foregroundColor(.nbTextSecondary)
                                }
                            }
                        }
                    }
                }

                // Features of current plan
                if let features = currentPlan?.features {
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("包含功能")
                                .font(NBFont.titleSmall)
                            Text(features)
                                .font(NBFont.bodyMedium)
                                .foregroundColor(.nbTextSecondary)
                        }
                    }
                }

                // Available plans
                if !plans.isEmpty {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("可选计划")
                            .font(NBFont.titleMedium)
                            .padding(.horizontal, Spacing.lg)

                        ForEach(plans) { plan in
                            planCard(plan)
                        }
                    }
                }
            }
            .padding(.vertical, Spacing.lg)
        }
        .navigationTitle("订阅计划")
        .background(Color.nbBg)
        .task { await loadPlans() }
    }

    private func planCard(_ plan: SubscriptionPlan) -> some View {
        NBCard {
            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack {
                    Text(plan.name)
                        .font(NBFont.titleMedium)
                        .foregroundColor(.nbTextPrimary)
                    Spacer()
                    if plan.id == currentPlan?.id {
                        NBChip(title: "当前", color: .nbSuccess)
                    }
                }

                if let price = plan.price {
                    HStack(alignment: .firstTextBaseline) {
                        Text("¥\(String(format: "%.0f", price))")
                            .font(NBFont.titleLarge)
                            .foregroundColor(.nbPrimary)
                        Text("/\(plan.billingCycle ?? "月")")
                            .font(NBFont.captionLarge)
                            .foregroundColor(.nbTextSecondary)
                    }
                }

                if let desc = plan.description {
                    Text(desc)
                        .font(NBFont.bodySmall)
                        .foregroundColor(.nbTextSecondary)
                }

                // Limits
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    if let max = plan.maxCustomers {
                        limitRow("客户上限", value: "\(max)")
                    }
                    if let max = plan.maxMonthlyBookings {
                        limitRow("每月预约", value: "\(max)")
                    }
                    if let max = plan.maxWorks {
                        limitRow("作品数量", value: "\(max)")
                    }
                }
            }
        }
        .padding(.horizontal, Spacing.lg)
    }

    private func limitRow(_ title: String, value: String) -> some View {
        HStack {
            Text(title)
                .font(NBFont.captionLarge)
                .foregroundColor(.nbTextSecondary)
            Spacer()
            Text(value)
                .font(NBFont.captionLarge)
                .foregroundColor(.nbTextPrimary)
        }
    }

    private func loadPlans() async {
        do {
            plans = try await APIClient.shared.request(.technicianOrders(status: nil, customerId: nil))
            // This is a placeholder - the actual endpoint would be different
            isLoading = false
        } catch { isLoading = false }
    }
}
