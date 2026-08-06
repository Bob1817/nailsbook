import SwiftUI

// MARK: - Works List (Waterfall Grid)

struct WorksListView: View {
    let techId: Int?
    @State private var works: [NailWork] = []
    @State private var isLoading = true
    @State private var page = 1
    @State private var hasMore = true

    init(techId: Int? = nil) {
        self.techId = techId
    }

    var body: some View {
        Group {
            if isLoading && works.isEmpty {
                NBLoadingView()
            } else if works.isEmpty {
                NBEmptyState(icon: "photo.on.rectangle.angled", title: "暂无作品")
            } else {
                ScrollView {
                    LazyVGrid(columns: [
                        GridItem(.flexible(), spacing: Spacing.md),
                        GridItem(.flexible(), spacing: Spacing.md)
                    ], spacing: Spacing.md) {
                        ForEach(works) { work in
                            NavigationLink(destination: WorkDetailView(workId: work.id)) {
                                WorkGridCard(work: work)
                            }
                            .buttonStyle(.plain)
                            .onAppear {
                                if work.id == works.last?.id && hasMore {
                                    page += 1
                                    Task { await loadMore() }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, Spacing.md)
                }
                .refreshable { await refresh() }
            }
        }
        .navigationTitle("作品集")
        .background(Color.nbBg)
        .task { await loadWorks() }
    }

    private func loadWorks() async {
        do {
            works = try await APIClient.shared.request(
                .clientWorks(techId: techId, sortBy: nil, sortDir: nil)
            )
            isLoading = false
        } catch {
            isLoading = false
        }
    }

    private func loadMore() async {
        guard hasMore else { return }
        do {
            let more: [NailWork] = try await APIClient.shared.request(
                .clientWorks(techId: techId, sortBy: nil, sortDir: nil)
            )
            if more.isEmpty { hasMore = false }
            else { works.append(contentsOf: more) }
        } catch {}
    }

    private func refresh() async {
        page = 1
        hasMore = true
        await loadWorks()
    }
}

// MARK: - Work Grid Card

struct WorkGridCard: View {
    let work: NailWork

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Cover image
            ZStack(alignment: .topTrailing) {
                Rectangle()
                    .fill(Color.nbSecondarySoft)
                    .aspectRatio(3/4, contentMode: .fit)
                    .cornerRadius(Radius.md)
                    .overlay(
                        Group {
                            if let url = work.coverUrl, let imageURL = URL(string: url) {
                                AsyncImage(url: imageURL) { phase in
                                    switch phase {
                                    case .success(let image):
                                        image.resizable().aspectRatio(contentMode: .fill)
                                    case .failure:
                                        Image(systemName: "photo").foregroundColor(.nbTextTertiary)
                                    default:
                                        ProgressView()
                                    }
                                }
                            } else {
                                Image(systemName: "photo")
                                    .font(.system(size: 32))
                                    .foregroundColor(.nbTextTertiary)
                            }
                        }
                        .cornerRadius(Radius.md)
                    )
                    .clipped()

                if work.isPinned == true {
                    Text("置顶")
                        .font(NBFont.captionSmall)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.nbPrimary)
                        .cornerRadius(Radius.sm)
                        .padding(6)
                }
            }

            // Info
            Text(work.title ?? "未命名作品")
                .font(NBFont.bodyMedium)
                .foregroundColor(.nbTextPrimary)
                .lineLimit(1)

            HStack(spacing: Spacing.sm) {
                if let name = work.technician?.name {
                    Text(name)
                        .font(NBFont.captionLarge)
                        .foregroundColor(.nbTextSecondary)
                }
                Spacer()
                HStack(spacing: 2) {
                    Image(systemName: "heart.fill")
                        .foregroundColor(.nbPrimary)
                    Text("\(work.likeCount ?? 0)")
                }
                .font(NBFont.captionMedium)
                .foregroundColor(.nbTextMuted)
            }
        }
    }
}
