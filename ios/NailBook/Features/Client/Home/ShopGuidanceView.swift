import SwiftUI

// MARK: - Shop Guidance Response

struct ShopGuidanceResponse: Codable {
    let technicianId: Int?
    let technicianName: String?
    let shop: ShopGuidanceShop?
    let guidance: ShopGuidance?
}

struct ShopGuidanceShop: Codable {
    let id: String?
    let name: String?
    let province: String?
    let city: String?
    let district: String?
    let detailAddress: String?
    let latitude: Double?
    let longitude: Double?

    var fullAddress: String {
        [province, city, district, detailAddress].compactMap { $0 }.joined()
    }
}

// MARK: - Shop Guidance View

struct ShopGuidanceView: View {
    let techId: Int
    let shopName: String
    let address: String

    @State private var response: ShopGuidanceResponse?
    @State private var loading = true
    @State private var loadFailed = false
    @State private var activeTab = 0

    private let tabs = ["地铁", "公交", "开车"]

    private var currentSection: GuidanceSection? {
        guard let g = response?.guidance else { return nil }
        switch activeTab {
        case 0: return g.metro
        case 1: return g.bus
        default: return g.driving
        }
    }

    private func sectionHasContent(_ section: GuidanceSection?) -> Bool {
        (section?.blocks?.isEmpty == false) || (section?.text?.isEmpty == false) || (section?.images?.isEmpty == false)
    }

    private var hasAnyContent: Bool {
        sectionHasContent(response?.guidance?.metro) || sectionHasContent(response?.guidance?.bus) || sectionHasContent(response?.guidance?.driving)
    }

    var body: some View {
        Group {
            if loading {
                ProgressView("加载中…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if loadFailed {
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 40))
                        .foregroundColor(NBColors.muted)
                    Text("指引信息加载失败")
                        .font(.system(size: 15, weight: .medium))
                    Text("请检查网络后重试")
                        .font(.system(size: 13))
                        .foregroundColor(NBColors.muted)
                    Button("重新加载") { Task { await load() } }
                        .buttonStyle(.borderedProminent)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if !hasAnyContent {
                VStack(spacing: 8) {
                    Text("暂无到店指引")
                        .font(.system(size: 15, weight: .medium))
                    Text("美甲师尚未编辑到店指引信息")
                        .font(.system(size: 13))
                        .foregroundColor(NBColors.muted)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                content
            }
        }
        .navigationTitle("到店指引")
        .toolbar(.hidden, for: .tabBar)
        .navigationBarTitleDisplayMode(.inline)
        .background(NBColors.page)
        .task { await load() }
    }

    private var content: some View {
        VStack(spacing: 0) {
            // Shop header
            VStack(alignment: .leading, spacing: 4) {
                Text(response?.shop?.name ?? shopName)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(NBColors.ink)
                let addr = response?.shop?.fullAddress ?? address
                if !addr.isEmpty {
                    Text(addr)
                        .font(.system(size: 13))
                        .foregroundColor(NBColors.muted)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(Color.white)

            // Tabs
            HStack(spacing: 0) {
                ForEach(0..<tabs.count, id: \.self) { idx in
                    let has = sectionHasContent(sectionFor(idx))
                    Button {
                        activeTab = idx
                    } label: {
                        Text(tabs[idx])
                            .font(.system(size: 15, weight: activeTab == idx ? .bold : .regular))
                            .foregroundColor(activeTab == idx ? NBColors.ink : (has ? NBColors.muted : NBColors.muted.opacity(0.4)))
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .overlay(alignment: .bottom) {
                                if activeTab == idx {
                                    Rectangle()
                                        .fill(NBColors.action)
                                        .frame(height: 2)
                                }
                            }
                    }
                }
            }
            .background(Color.white)

            // Content
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    if let blocks = currentSection?.blocks, !blocks.isEmpty {
                        ForEach(blocks.indices, id: \.self) { i in
                            let block = blocks[i]
                            if block.type == "image", let urlStr = block.url, let url = URL(string: urlStr) {
                                AsyncImage(url: url) { image in
                                    image.resizable().aspectRatio(contentMode: .fit)
                                } placeholder: {
                                    ProgressView().frame(height: 120)
                                }
                                .cornerRadius(8)
                            } else if let text = block.text, !text.isEmpty {
                                Text(text)
                                    .font(.system(size: 14))
                                    .foregroundColor(NBColors.ink)
                                    .lineSpacing(1.5)
                            }
                        }
                    } else if let text = currentSection?.text, !text.isEmpty {
                        Text(text)
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.ink)
                            .lineSpacing(1.5)
                    } else {
                        Text("暂无该方式的到店指引")
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.muted)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.top, 40)
                    }
                }
                .padding(16)
            }

            // Bottom navigate button
            if let shop = response?.shop, shop.latitude != nil || shop.longitude != nil {
                Button {
                    openMap(shop)
                } label: {
                    Text("一键导航到店")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .background(NBColors.action)
                        .cornerRadius(Radius.button)
                }
                .padding(16)
                .background(Color.white)
            }
        }
    }

    private func sectionFor(_ idx: Int) -> GuidanceSection? {
        guard let g = response?.guidance else { return nil }
        switch idx {
        case 0: return g.metro
        case 1: return g.bus
        default: return g.driving
        }
    }

    private func openMap(_ shop: ShopGuidanceShop) {
        let lat = shop.latitude ?? 31.2304
        let lng = shop.longitude ?? 121.4737
        let name = shop.name ?? "店铺"
        if let url = URL(string: "https://maps.apple.com/?ll=\(lat),\(lng)&q=\(name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? name)") {
            UIApplication.shared.open(url)
        }
    }

    private func load() async {
        loading = true
        loadFailed = false
        do {
            let result: ShopGuidanceResponse = try await APIClient.shared.request(
                .publicShopGuidance(id: techId, shopName: shopName, address: address)
            )
            response = result
            // Auto-select first tab with content
            if !sectionHasContent(result.guidance?.metro) {
                if sectionHasContent(result.guidance?.bus) { activeTab = 1 }
                else if sectionHasContent(result.guidance?.driving) { activeTab = 2 }
            }
        } catch {
            loadFailed = true
        }
        loading = false
    }
}
