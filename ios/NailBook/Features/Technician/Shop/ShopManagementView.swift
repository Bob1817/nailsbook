import SwiftUI

// MARK: - Shop Management

struct ShopManagementView: View {
    @State private var shops: [ShopAddress] = []
    @State private var isLoading = true
    @State private var showAdd = false

    var body: some View {
        List {
            if isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
            } else if shops.isEmpty {
                Section {
                    VStack(spacing: Spacing.md) {
                        Image(systemName: "building.2")
                            .font(.system(size: 36))
                            .foregroundColor(.nbTextTertiary)
                        Text("暂无门店")
                            .font(NBFont.bodyMedium)
                            .foregroundColor(.nbTextSecondary)
                        Text("添加门店地址，方便客户到店消费")
                            .font(NBFont.captionLarge)
                            .foregroundColor(.nbTextTertiary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.xxl)
                }
            } else {
                ForEach(shops) { shop in
                    ShopRow(shop: shop)
                }
                .onDelete { indexSet in
                    for index in indexSet {
                        shops.remove(at: index)
                    }
                }
            }
        }
        .navigationTitle("门店管理")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button { showAdd = true } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showAdd) {
            EditShopView(shop: nil)
        }
    }
}

struct ShopRow: View {
    let shop: ShopAddress

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(shop.name)
                .font(NBFont.bodyLarge)
                .foregroundColor(.nbTextPrimary)
            Text(shop.address)
                .font(NBFont.captionLarge)
                .foregroundColor(.nbTextSecondary)
            if let hours = shop.businessHours {
                Text(hours)
                    .font(NBFont.captionMedium)
                    .foregroundColor(.nbTextTertiary)
            }
        }
        .padding(.vertical, Spacing.xs)
    }
}

struct EditShopView: View {
    let shop: ShopAddress?
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var address = ""
    @State private var businessHours = ""
    @State private var phone = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("门店信息")
                                .font(NBFont.titleSmall)
                            NBTextField(placeholder: "门店名称", text: $name)
                            NBTextField(placeholder: "详细地址", text: $address)
                            NBTextField(placeholder: "营业时间（如：10:00-20:00）", text: $businessHours)
                            NBTextField(placeholder: "联系电话", text: $phone, keyboardType: .phonePad)
                        }
                    }
                    NBButton(title: "保存", style: .primary) {
                        dismiss()
                    }
                }
                .padding(Spacing.lg)
            }
            .navigationTitle(shop == nil ? "新增门店" : "编辑门店")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color.nbBg)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// Simple shop model
struct ShopAddress: Identifiable {
    let id = UUID()
    var name: String
    var address: String
    var businessHours: String?
    var phone: String?
}
