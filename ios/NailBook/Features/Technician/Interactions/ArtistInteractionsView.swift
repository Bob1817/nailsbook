import SwiftUI

// MARK: - Artist Interactions View (who liked/followed/favorited)

struct ArtistInteractionsView: View {
    @State private var interactions: [ArtistInteraction] = []
    @State private var isLoading = true
    @State private var selectedTab = "all"
    @State private var error: String?

    private let tabs = [
        ("all", "全部"),
        ("follow", "关注"),
        ("like", "点赞"),
        ("favorite", "收藏")
    ]

    var body: some View {
        ZStack {
            NBColors.page.ignoresSafeArea()

            if isLoading {
                VStack(spacing: 16) {
                    ProgressView().scaleEffect(1.2)
                    Text("加载中...").font(.system(size: 14)).foregroundColor(NBColors.muted)
                }
            } else if filteredInteractions.isEmpty {
                emptyView
            } else {
                listView
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle("互动记录")
        .task { await loadInteractions() }
        .refreshable { await loadInteractions() }
    }

    // MARK: - Empty View

    private var emptyView: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "heart.text.square")
                .font(.system(size: 48))
                .foregroundColor(NBColors.muted)
            Text("暂无互动记录")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(NBColors.ink)
            Text("当客户关注、点赞或收藏你的作品时，记录会出现在这里")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Spacer()
        }
    }

    // MARK: - List View

    private var listView: some View {
        VStack(spacing: 0) {
            // Tabs
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    ForEach(tabs, id: \.0) { tab in
                        Button {
                            selectedTab = tab.0
                        } label: {
                            Text(tab.1)
                                .font(.system(size: 14, weight: selectedTab == tab.0 ? .bold : .medium))
                                .foregroundColor(selectedTab == tab.0 ? NBColors.action : NBColors.muted)
                                .frame(height: 38)
                                .padding(.horizontal, 12)
                                .background(selectedTab == tab.0 ? NBColors.page : Color.clear)
                                .cornerRadius(999)
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
            .padding(.vertical, 8)
            .background(Color.white)

            // List
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(filteredInteractions) { interaction in
                        interactionRow(interaction)
                        Divider().padding(.leading, 60)
                    }
                }
                .padding(.top, 8)
                .padding(.bottom, 30)
            }
        }
    }

    private func interactionRow(_ item: ArtistInteraction) -> some View {
        HStack(spacing: 12) {
            // Avatar
            ZStack {
                Circle().fill(NBColors.page).frame(width: 44, height: 44)
                if let url = item.clientAvatarUrl, !url.isEmpty {
                    CachedAsyncImage(url: url) { img in
                        img.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Text(String(item.clientName?.first ?? "?"))
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(NBColors.action)
                    }
                    .frame(width: 44, height: 44).clipShape(Circle())
                } else {
                    Text(String(item.clientName?.first ?? "?"))
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(NBColors.action)
                }
            }

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(item.clientName ?? "用户")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(NBColors.ink)
                    interactionBadge(item.type)
                }
                Text(item.targetTitle ?? "")
                    .font(.system(size: 13))
                    .foregroundColor(NBColors.muted)
                    .lineLimit(1)
            }

            Spacer()

            Text(formatTime(item.createdAt))
                .font(.system(size: 12))
                .foregroundColor(NBColors.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private func interactionBadge(_ type: String?) -> some View {
        let (text, color): (String, Color) = switch type {
        case "follow": ("关注", NBColors.link)
        case "like": ("点赞", NBColors.action)
        case "favorite": ("收藏", NBColors.secondary)
        default: ("互动", NBColors.muted)
        }

        return Text(text)
            .font(.system(size: 11, weight: .medium))
            .foregroundColor(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.1))
            .cornerRadius(999)
    }

    // MARK: - Computed

    private var filteredInteractions: [ArtistInteraction] {
        if selectedTab == "all" { return interactions }
        return interactions.filter { $0.type == selectedTab }
    }

    // MARK: - Helpers

    private func formatTime(_ iso: String?) -> String {
        guard let iso = iso else { return "" }
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = f.date(from: iso) else { return "" }
        let df = DateFormatter()
        if Calendar.current.isDateInToday(date) {
            df.dateFormat = "HH:mm"
        } else {
            df.dateFormat = "MM/dd"
        }
        return df.string(from: date)
    }

    // MARK: - API

    private func loadInteractions() async {
        isLoading = true
        defer { isLoading = false }
        do {
            interactions = try await APIClient.shared.request(.artistInteractions)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Interaction Model

struct ArtistInteraction: Codable, Identifiable {
    var id: Int
    var type: String?
    var clientName: String?
    var clientAvatarUrl: String?
    var targetTitle: String?
    var createdAt: String?
}

// MARK: - Preview

#Preview {
    NavigationStack { ArtistInteractionsView() }
}
