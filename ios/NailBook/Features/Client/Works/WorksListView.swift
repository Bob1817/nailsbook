import SwiftUI

// MARK: - Works List（对齐小程序发现页：搜索栏 + 分类导航 + editorial 作品卡瀑布流）

struct WorksListView: View {
    let techId: Int?
    @State private var works: [NailWork] = []
    @State private var isLoading = true
    // 本地搜索与分类过滤（对齐 wxapp discover：keyword + activeCategory）
    @State private var keyword = ""
    @State private var activeCategory = "全部"

    init(techId: Int? = nil) {
        self.techId = techId
    }

    /// 分类导航：全部 + 作品标签汇总（对齐 wxapp cats-bar）
    private var categories: [String] {
        var seen = Set<String>()
        var tags: [String] = []
        for work in works {
            for tag in work.tags ?? [] {
                let t = tag.trimmingCharacters(in: .whitespaces)
                if !t.isEmpty && !seen.contains(t) {
                    seen.insert(t)
                    tags.append(t)
                }
            }
        }
        return ["全部"] + Array(tags.prefix(8))
    }

    /// 本地过滤：关键词（标题/美甲师名）+ 分类（标签）
    private var filteredWorks: [NailWork] {
        var result = works
        let kw = keyword.trimmingCharacters(in: .whitespaces)
        if !kw.isEmpty {
            result = result.filter {
                ($0.title ?? "").localizedCaseInsensitiveContains(kw)
                    || ($0.technicianName ?? "").localizedCaseInsensitiveContains(kw)
            }
        }
        if activeCategory != "全部" {
            result = result.filter { ($0.tags ?? []).contains(activeCategory) }
        }
        return result
    }

    var body: some View {
        VStack(spacing: 0) {
            if isLoading {
                loadingView
            } else if works.isEmpty {
                emptyView
            } else {
                ScrollView {
                    VStack(spacing: 0) {
                        // 搜索 + 分类导航（发现页专属；对齐 wxapp discover-head）
                        if techId == nil {
                            searchBar
                            categoryBar
                        }

                        // 全部作品头（对齐 wxapp all-works-head）
                        if !filteredWorks.isEmpty {
                            allWorksHead
                        } else {
                            filterEmptyView
                        }

                        // 瀑布流（两列 editorial 作品卡）
                        if !filteredWorks.isEmpty {
                            worksWaterfall
                            bottomEnd
                        }
                    }
                }
            }
        }
        .background(NBColors.page)
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle(techId != nil ? "作品画册" : "发现好作品")
        .task { await loadWorks() }
        .refreshable { await loadWorks() }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
            Spacer()
        }
    }

    // MARK: - Empty View（对齐 wxapp 空态文案）

    private var emptyView: some View {
        VStack(spacing: 12) {
            Spacer()

            ZStack {
                Circle()
                    .fill(NBColors.page)
                    .frame(width: 36, height: 36)
                Circle()
                    .fill(Color.black.opacity(0.3))
                    .frame(width: 16, height: 16)
            }

            Text(techId != nil ? "还没有公开作品" : "还没有作品可以刷")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)

            Text(techId != nil ? "可以先查看服务并发起预约" : "绑定常用美甲师后，即可浏览她发布的最新作品")
                .font(.system(size: 12))
                .foregroundColor(NBColors.muted)

            Spacer()
        }
        .padding(.horizontal, 20)
    }

    /// 筛选为空（对齐 wxapp：该风格暂无作品 / 没有找到相关作品）
    private var filterEmptyView: some View {
        VStack(spacing: 10) {
            Text(keyword.isEmpty ? "该风格暂无作品" : "没有找到相关作品")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)
            Text(keyword.isEmpty ? "你的美甲师还没有发布此风格的作品" : "换一个关键词，或清除搜索后继续发现灵感")
                .font(.system(size: 12))
                .foregroundColor(NBColors.muted)
                .multilineTextAlignment(.center)
            if !keyword.isEmpty {
                Button("清除搜索") { keyword = "" }
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(NBColors.link)
                    .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
    }

    // MARK: - Search Bar（对齐 wxapp search-bar）

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)
            TextField("搜索作品、风格或美甲师", text: $keyword)
                .font(.system(size: 14))
                .foregroundColor(NBColors.ink)
                .autocorrectionDisabled()
            if !keyword.isEmpty {
                Button {
                    keyword = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.muted)
                }
            }
        }
        .padding(.horizontal, 12)
        .frame(height: 40)
        .background(Color.white)
        .cornerRadius(10)
        .padding(.horizontal, 16)
        .padding(.top, 12)
    }

    // MARK: - Category Bar（对齐 wxapp cats-bar：横向文字导航）

    private var categoryBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(categories, id: \.self) { cat in
                    let active = activeCategory == cat
                    Button {
                        activeCategory = cat
                    } label: {
                        Text(cat)
                            .font(.system(size: 13, weight: active ? .semibold : .regular))
                            .foregroundColor(active ? .white : NBColors.secondary)
                            .padding(.horizontal, 14)
                            .frame(height: 32)
                            .background(active ? NBColors.ink : Color.white)
                            .cornerRadius(16)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
    }

    // MARK: - All Works Head（对齐 wxapp all-works-head）

    private var allWorksHead: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("全部作品")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)
            Spacer()
            Text("\(filteredWorks.count) 款")
                .font(.system(size: 12))
                .foregroundColor(NBColors.muted)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    // MARK: - Works Waterfall（两列 editorial 卡片）

    private var worksWaterfall: some View {
        HStack(alignment: .top, spacing: 8) {
            // 左列
            VStack(spacing: 8) {
                ForEach(Array(filteredWorks.enumerated().filter { $0.offset % 2 == 0 }.map { $0.element })) { work in
                    WorkCardView(work: work)
                }
            }

            // 右列
            VStack(spacing: 8) {
                ForEach(Array(filteredWorks.enumerated().filter { $0.offset % 1 == 0 && $0.offset % 2 == 1 }.map { $0.element })) { work in
                    WorkCardView(work: work)
                }
            }
        }
        .padding(.horizontal, 16)
    }

    /// 底部到底提示（对齐 wxapp bottom-end）
    private var bottomEnd: some View {
        Text("— 已经到底了 —")
            .font(.system(size: 11))
            .foregroundColor(NBColors.muted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
    }

    // MARK: - Data Loading

    private func loadWorks() async {
        do {
            works = try await APIClient.shared.request(
                .clientWorks(techId: techId, sortBy: "latest", sortDir: nil)
            )
            isLoading = false
        } catch {
            isLoading = false
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        WorksListView()
    }
}
