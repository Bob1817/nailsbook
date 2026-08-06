import SwiftUI

// MARK: - Home Service Settings

struct HomeServiceSettingsView: View {
    @State private var homeServiceEnabled = true
    @State private var serviceRadius: Double = 10
    @State private var homeServiceFee: Double = 0
    @State private var nightFee: Double = 0
    @State private var holidayFee: Double = 0
    @State private var minOrderAmount: Double = 0

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                NBCard {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Toggle(isOn: $homeServiceEnabled) {
                            Label("开启上门服务", systemImage: "car.fill")
                        }
                    }
                }

                if homeServiceEnabled {
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("服务范围")
                                .font(NBFont.titleSmall)
                            HStack {
                                Text("最远距离")
                                    .font(NBFont.bodyMedium)
                                    .foregroundColor(.nbTextSecondary)
                                Spacer()
                                Text("\(Int(serviceRadius)) 公里")
                                    .font(NBFont.bodyMedium)
                                    .foregroundColor(.nbTextPrimary)
                            }
                            Slider(value: $serviceRadius, in: 1...50, step: 1)
                                .tint(.nbPrimary)
                        }
                    }

                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("费用设置")
                                .font(NBFont.titleSmall)
                            feeRow("上门服务费", value: $homeServiceFee)
                            feeRow("夜间服务费", value: $nightFee)
                            feeRow("节假日服务费", value: $holidayFee)
                            feeRow("最低消费金额", value: $minOrderAmount)
                        }
                    }
                }

                NBButton(title: "保存设置", style: .primary) {
                    // Save
                }
            }
            .padding(Spacing.lg)
        }
        .navigationTitle("上门服务设置")
        .background(Color.nbBg)
    }

    private func feeRow(_ title: String, value: Binding<Double>) -> some View {
        HStack {
            Text(title)
                .font(NBFont.bodyMedium)
                .foregroundColor(.nbTextSecondary)
            Spacer()
            Text("¥")
                .font(NBFont.bodyMedium)
                .foregroundColor(.nbTextTertiary)
            TextField("0", value: value, format: .number)
                .font(NBFont.bodyMedium)
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 80)
        }
    }
}
