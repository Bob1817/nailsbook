import SwiftUI

// MARK: - Shop Management

struct ShopManagementView: View {
    @State private var shops: [ShopAddress] = []
    @State private var isLoading = true
    @State private var showAdd = false
    @State private var error: String?

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
                    NavigationLink(destination: EditShopView(shop: shop, onSave: { saved in
                        Task { await loadShops() }
                    })) {
                        ShopRow(shop: shop)
                    }
                }
                .onDelete(perform: deleteShops)
            }
        }
        .navigationTitle("门店管理")
        .toolbar(.hidden, for: .tabBar)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button { showAdd = true } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showAdd) {
            EditShopView(shop: nil, onSave: { _ in
                Task { await loadShops() }
            })
        }
        .task { await loadShops() }
        .alert("错误", isPresented: .constant(error != nil)) {
            Button("确定") { error = nil }
        } message: {
            Text(error ?? "")
        }
    }

    private func loadShops() async {
        do {
            let profile: TechnicianProfile = try await APIClient.shared.request(.technicianShops)
            shops = profile.shopAddresses ?? []
            isLoading = false
        } catch {
            isLoading = false
            self.error = error.localizedDescription
        }
    }

    private func deleteShops(at offsets: IndexSet) {
        let shopsToDelete = offsets.map { shops[$0] }
        guard let first = shopsToDelete.first else { return }

        Task {
            do {
                let remaining = shops.filter { shop in
                    !offsets.contains(shops.firstIndex(where: { $0.id == shop.id }) ?? -1)
                }
                let shopData = remaining.map { shop -> [String: Any] in
                    var dict: [String: Any] = [
                        "id": shop.id,
                        "name": shop.name,
                        "detailAddress": shop.detailAddress,
                        "enabled": shop.enabled
                    ]
                    if let province = shop.province { dict["province"] = province }
                    if let city = shop.city { dict["city"] = city }
                    if let district = shop.district { dict["district"] = district }
                    if let lat = shop.latitude { dict["latitude"] = lat }
                    if let lng = shop.longitude { dict["longitude"] = lng }
                    if let phone = shop.phone { dict["phone"] = phone }
                    return dict
                }
                let hasEnabled = remaining.contains(where: { $0.enabled })
                try await APIClient.shared.requestVoid(.updateShopAddresses(shops: shopData, shopService: hasEnabled))
                shops = remaining
            } catch {
                self.error = error.localizedDescription
                await loadShops()
            }
        }
    }
}

struct ShopRow: View {
    let shop: ShopAddress

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            HStack {
                Text(shop.name)
                    .font(NBFont.bodyLarge)
                    .foregroundColor(.nbTextPrimary)
                Spacer()
                if !shop.enabled {
                    Text("已关闭")
                        .font(NBFont.captionSmall)
                        .foregroundColor(.nbTextTertiary)
                        .padding(.horizontal, Spacing.xs)
                        .padding(.vertical, 2)
                        .background(Color.nbSecondarySoft)
                        .cornerRadius(Radius.sm)
                }
            }
            Text(shop.address)
                .font(NBFont.captionLarge)
                .foregroundColor(.nbTextSecondary)
            if let phone = shop.phone, !phone.isEmpty {
                Text(phone)
                    .font(NBFont.captionMedium)
                    .foregroundColor(.nbTextTertiary)
            }
        }
        .padding(.vertical, Spacing.xs)
    }
}

// MARK: - Edit Shop View

struct EditShopView: View {
    let shop: ShopAddress?
    let onSave: (ShopAddress) -> Void
    @Environment(\.dismiss) var dismiss

    @State private var name = ""
    @State private var province = ""
    @State private var city = ""
    @State private var district = ""
    @State private var detailAddress = ""
    @State private var phone = ""
    @State private var enabled = true
    @State private var saving = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("门店信息")
                                .font(NBFont.titleSmall)
                            NBTextField(placeholder: "门店名称", text: $name)
                            NBTextField(placeholder: "省份", text: $province)
                            NBTextField(placeholder: "城市", text: $city)
                            NBTextField(placeholder: "区/县", text: $district)
                            NBTextField(placeholder: "详细地址", text: $detailAddress)
                            NBTextField(placeholder: "联系电话", text: $phone, keyboardType: .phonePad)
                        }
                    }

                    NBCard {
                        Toggle("启用门店", isOn: $enabled)
                            .font(NBFont.bodyMedium)
                    }

                    if let error {
                        Text(error)
                            .font(NBFont.captionMedium)
                            .foregroundColor(.nbError)
                    }

                    NBButton(title: saving ? "保存中..." : "保存", style: .primary) {
                        Task { await save() }
                    }
                    .disabled(saving || name.isEmpty || detailAddress.isEmpty)
                }
                .padding(Spacing.lg)
            }
            .navigationTitle(shop == nil ? "新增门店" : "编辑门店")
            .toolbar(.hidden, for: .tabBar)
            .navigationBarTitleDisplayMode(.inline)
            .background(Color.nbBg)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { dismiss() }
                }
            }
        }
        .onAppear {
            if let shop = shop {
                name = shop.name
                province = shop.province ?? ""
                city = shop.city ?? ""
                district = shop.district ?? ""
                detailAddress = shop.detailAddress
                phone = shop.phone ?? ""
                enabled = shop.enabled
            }
        }
    }

    private func save() async {
        saving = true
        error = nil

        do {
            // Get current shops
            let profile: TechnicianProfile = try await APIClient.shared.request(.technicianShops)
            var currentShops = profile.shopAddresses ?? []

            let shopId = shop?.id ?? UUID().uuidString
            let shopData: [String: Any] = {
                var dict: [String: Any] = [
                    "id": shopId,
                    "name": name.trimmingCharacters(in: .whitespaces),
                    "detailAddress": detailAddress.trimmingCharacters(in: .whitespaces),
                    "enabled": enabled
                ]
                if !province.isEmpty { dict["province"] = province }
                if !city.isEmpty { dict["city"] = city }
                if !district.isEmpty { dict["district"] = district }
                if !phone.isEmpty { dict["phone"] = phone }
                if let lat = shop?.latitude { dict["latitude"] = lat }
                if let lng = shop?.longitude { dict["longitude"] = lng }
                return dict
            }()

            if let index = currentShops.firstIndex(where: { $0.id == shopId }) {
                currentShops[index] = ShopAddress(
                    id: shopId,
                    name: name.trimmingCharacters(in: .whitespaces),
                    province: province.isEmpty ? nil : province,
                    city: city.isEmpty ? nil : city,
                    district: district.isEmpty ? nil : district,
                    detailAddress: detailAddress.trimmingCharacters(in: .whitespaces),
                    latitude: shop?.latitude,
                    longitude: shop?.longitude,
                    phone: phone.isEmpty ? nil : phone,
                    enabled: enabled,
                    businessHours: shop?.businessHours,
                    guidance: shop?.guidance
                )
            } else {
                currentShops.append(ShopAddress(
                    id: shopId,
                    name: name.trimmingCharacters(in: .whitespaces),
                    province: province.isEmpty ? nil : province,
                    city: city.isEmpty ? nil : city,
                    district: district.isEmpty ? nil : district,
                    detailAddress: detailAddress.trimmingCharacters(in: .whitespaces),
                    phone: phone.isEmpty ? nil : phone,
                    enabled: enabled
                ))
            }

            let shopArray = currentShops.map { s -> [String: Any] in
                var dict: [String: Any] = [
                    "id": s.id,
                    "name": s.name,
                    "detailAddress": s.detailAddress,
                    "enabled": s.enabled
                ]
                if let p = s.province { dict["province"] = p }
                if let c = s.city { dict["city"] = c }
                if let d = s.district { dict["district"] = d }
                if let lat = s.latitude { dict["latitude"] = lat }
                if let lng = s.longitude { dict["longitude"] = lng }
                if let ph = s.phone { dict["phone"] = ph }
                return dict
            }
            let hasEnabled = currentShops.contains(where: { $0.enabled })

            try await APIClient.shared.requestVoid(.updateShopAddresses(shops: shopArray, shopService: hasEnabled))

            saving = false
            onSave(currentShops.last ?? ShopAddress(id: shopId, name: name, detailAddress: detailAddress, enabled: enabled))
            dismiss()
        } catch {
            saving = false
            self.error = error.localizedDescription
        }
    }
}
