import SwiftUI

// MARK: - Work Card（对齐小程序 work-card editorial 变体：价格胶囊 + 美甲师信息 + 点赞收藏 + 预约同款）
// 首页精选作品与发现页瀑布流共用

struct WorkCardView: View {
    let work: NailWork

    @State private var isLiked: Bool
    @State private var isFavorited: Bool
    @State private var likeCount: Int
    @State private var favoriteCount: Int

    init(work: NailWork) {
        self.work = work
        _isLiked = State(initialValue: work.isLiked ?? false)
        _isFavorited = State(initialValue: work.isFavorited ?? false)
        _likeCount = State(initialValue: work.likeCount ?? 0)
        _favoriteCount = State(initialValue: work.favoriteCount ?? 0)
    }

    private var techId: Int? { work.technicianId ?? work.techId }

    /// 城市 · 店铺名（对齐小程序 artistPlaceLine；城市去掉末尾"市"）
    private var placeLine: String? {
        func slimCity(_ c: String) -> String {
            var trimmed = c.trimmingCharacters(in: .whitespaces)
            if trimmed.hasSuffix("市") { trimmed.removeLast() }
            return trimmed
        }
        let city = (work.technicianShopAddress ?? "").trimmingCharacters(in: .whitespaces)
        let shop = (work.technicianShopName ?? "").trimmingCharacters(in: .whitespaces)
        let parts = [slimCity(city), shop].filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    var body: some View {
        NavigationLink(destination: WorkDetailView(workId: work.id)) {
            VStack(alignment: .leading, spacing: 0) {
                // 作品图 + 左下角价格胶囊
                // The container owns layout; a filled image must not widen the column.
                Rectangle()
                    .fill(NBColors.page)
                    .aspectRatio(0.75, contentMode: .fit)
                    .overlay {
                        AsyncImage(url: URL(string: work.coverUrl ?? "")) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Image(systemName: "photo")
                                .foregroundColor(NBColors.muted)
                        }
                    }
                    .overlay(alignment: .bottomLeading) {
                        if let price = work.displayPrice {
                            Text(price)
                                .font(.system(size: 13.5, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 10)
                                .frame(minHeight: 26)
                                .background(Color.black.opacity(0.62))
                                .cornerRadius(Radius.full)
                                .padding(7)
                        }
                    }
                    .clipped()

                // 标题
                Text(work.title ?? "美甲作品")
                    .font(.system(size: 13.5, weight: .semibold))
                    .foregroundColor(NBColors.ink)
                    .lineLimit(1)
                    .padding(.horizontal, 9)
                    .padding(.top, 9)

                // 美甲师信息：头像 + 名字 / 城市 · 店铺名（对齐小程序 wc-editorial-artist）
                HStack(spacing: 5) {
                    AsyncImage(url: URL(string: work.technicianAvatarUrl ?? "")) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Image(systemName: "person.crop.circle")
                            .foregroundColor(NBColors.muted)
                    }
                    .frame(width: 23, height: 23)
                    .clipShape(Circle())

                    VStack(alignment: .leading, spacing: 1) {
                        Text(work.technicianName ?? "独立美甲师")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(NBColors.ink)
                            .lineLimit(1)

                        if let placeLine {
                            Text(placeLine)
                                .font(.system(size: 9.5))
                                .foregroundColor(NBColors.muted)
                                .lineLimit(1)
                        }
                    }
                }
                .padding(.horizontal, 9)
                .padding(.top, 6)
                .padding(.bottom, 2)

                // 操作行：点赞收藏紧凑相邻，预约按钮填充剩余宽度。
                HStack(spacing: 0) {
                    Button(action: toggleLike) {
                        VStack(spacing: 2) {
                            Image(systemName: isLiked ? "heart.fill" : "heart")
                                .font(.system(size: 13))
                            Text("\(likeCount)")
                                .font(.system(size: 10))
                        }
                        .foregroundColor(isLiked ? NBColors.money : NBColors.muted)
                        .frame(width: 36, height: 44)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)

                    Button(action: toggleFavorite) {
                        VStack(spacing: 2) {
                            Image(systemName: isFavorited ? "star.fill" : "star")
                                .font(.system(size: 13))
                            Text("\(favoriteCount)")
                                .font(.system(size: 10))
                        }
                        .foregroundColor(isFavorited ? NBColors.warning : NBColors.secondary)
                        .frame(width: 36, height: 44)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)

                    Spacer().frame(width: 4)

                    if let techId, let techName = work.technicianName ?? work.technician?.name {
                        NavigationLink(destination: CreateOrderView(
                            techId: techId,
                            techName: techName,
                            sourceWork: work
                        )) {
                            Text("预约同款")
                                .font(.system(size: 11, weight: .semibold))
                                .lineLimit(1)
                                .fixedSize(horizontal: true, vertical: false)
                                .foregroundColor(.white)
                                .padding(.horizontal, 8)
                                .frame(maxWidth: .infinity, minHeight: 32)
                                .background(NBColors.action)
                                .cornerRadius(8)
                                .frame(minHeight: 44)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .simultaneousGesture(TapGesture())
                    }
                }
                .padding(.horizontal, 9)
                .padding(.bottom, 7)
            }
            .background(Color.white)
            .cornerRadius(12)  // 对齐小程序 wc-editorial 24rpx
            .shadow(color: Color.black.opacity(0.05), radius: 8, y: 2)
        }
        .buttonStyle(.plain)
    }

    private func toggleLike() {
        isLiked.toggle()
        likeCount = max(0, likeCount + (isLiked ? 1 : -1))
        Task { try? await APIClient.shared.requestVoid(.likeWork(id: work.id)) }
    }

    private func toggleFavorite() {
        isFavorited.toggle()
        favoriteCount = max(0, favoriteCount + (isFavorited ? 1 : -1))
        Task { try? await APIClient.shared.requestVoid(.favoriteWork(id: work.id)) }
    }
}
