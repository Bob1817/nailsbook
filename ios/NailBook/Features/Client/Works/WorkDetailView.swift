import SwiftUI

// MARK: - Work Detail View

struct WorkDetailView: View {
    let workId: Int
    @State private var work: NailWork?
    @State private var comments: [NailWorkComment] = []
    @State private var isLoading = true
    @State private var isLiked = false
    @State private var isFavorited = false
    @State private var commentText = ""
    @State private var replyTo: NailWorkComment?
    @State private var currentImageIndex = 0
    @State private var showCommentInput = false

    var body: some View {
        ScrollView {
            if let work = work {
                VStack(spacing: 0) {
                    // Image carousel
                    if let images = work.images, !images.isEmpty {
                        TabView(selection: $currentImageIndex) {
                            ForEach(images.indices, id: \.self) { index in
                                AsyncImage(url: URL(string: images[index])) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                } placeholder: {
                                    Rectangle()
                                        .fill(Color.nbSecondarySoft)
                                        .overlay(ProgressView())
                                }
                                .tag(index)
                            }
                        }
                        .tabViewStyle(.page(indexDisplayMode: .automatic))
                        .frame(height: 400)
                    }

                    VStack(alignment: .leading, spacing: Spacing.lg) {
                        // Title & info
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text(work.title ?? "未命名作品")
                                .font(NBFont.titleLarge)
                                .foregroundColor(.nbTextPrimary)

                            if let tech = work.technician {
                                HStack(spacing: Spacing.sm) {
                                    Circle()
                                        .fill(Color.nbPrimarySoft)
                                        .frame(width: 24, height: 24)
                                        .overlay(
                                            Text(String(tech.name?.first ?? "?"))
                                                .font(NBFont.captionSmall)
                                                .foregroundColor(.nbPrimary)
                                        )
                                    Text(tech.name ?? "")
                                        .font(NBFont.bodySmall)
                                        .foregroundColor(.nbTextSecondary)
                                }
                            }

                            if let desc = work.description, !desc.isEmpty {
                                Text(desc)
                                    .font(NBFont.bodyMedium)
                                    .foregroundColor(.nbTextSecondary)
                                    .padding(.top, Spacing.xs)
                            }

                            // Tags
                            if let tags = work.tags, !tags.isEmpty {
                                FlowLayout(spacing: Spacing.sm) {
                                    ForEach(tags, id: \.self) { tag in
                                        NBChip(title: tag)
                                    }
                                }
                            }
                        }

                        Divider()

                        // Action bar
                        HStack(spacing: Spacing.xxl) {
                            actionButton(icon: isLiked ? "heart.fill" : "heart",
                                        title: "\(work.likeCount ?? 0)",
                                        color: isLiked ? .nbPrimary : .nbTextSecondary) {
                                toggleLike()
                            }
                            actionButton(icon: isFavorited ? "star.fill" : "star",
                                        title: "\(work.favoriteCount ?? 0)",
                                        color: isFavorited ? .nbWarning : .nbTextSecondary) {
                                toggleFavorite()
                            }
                            actionButton(icon: "bubble.right",
                                        title: "\(comments.count)",
                                        color: .nbTextSecondary) {
                                showCommentInput = true
                            }
                            Spacer()
                            actionButton(icon: "square.and.arrow.up",
                                        title: "分享",
                                        color: .nbTextSecondary) {
                                shareWork()
                            }
                        }

                        Divider()

                        // Comments section
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("评论 (\(comments.count))")
                                .font(NBFont.titleSmall)
                                .foregroundColor(.nbTextPrimary)

                            if comments.isEmpty {
                                Text("暂无评论，快来抢沙发~")
                                    .font(NBFont.bodyMedium)
                                    .foregroundColor(.nbTextTertiary)
                                    .padding(.vertical, Spacing.lg)
                            } else {
                                ForEach(comments) { comment in
                                    CommentRow(comment: comment) {
                                        replyTo = comment
                                        showCommentInput = true
                                    }
                                }
                            }
                        }
                    }
                    .padding(Spacing.lg)
                }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .background(Color.nbBg)
        .safeAreaInset(edge: .bottom) {
            // Comment input bar
            if showCommentInput {
                commentInputBar
            }
        }
        .task { await loadDetail() }
    }

    // MARK: - Comment Input Bar

    private var commentInputBar: some View {
        HStack(spacing: Spacing.md) {
            if let reply = replyTo {
                Text("回复 \(reply.client?.nickname ?? reply.technician?.name ?? "")")
                    .font(NBFont.captionLarge)
                    .foregroundColor(.nbPrimary)
                Button { replyTo = nil } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.nbTextTertiary)
                }
            }

            TextField(replyTo != nil ? "写回复..." : "写评论...", text: $commentText)
                .font(NBFont.bodyMedium)
                .padding(.horizontal, Spacing.md)
                .frame(height: 40)
                .background(Color.nbSurfaceAlt)
                .cornerRadius(Radius.full)

            Button {
                Task { await submitComment() }
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 28))
                    .foregroundColor(commentText.isEmpty ? .nbTextTertiary : .nbPrimary)
            }
            .disabled(commentText.isEmpty)
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.vertical, Spacing.sm)
        .background(Color.nbSurface)
        .shadow(color: .black.opacity(0.06), radius: 4, y: -2)
    }

    // MARK: - Actions

    private func actionButton(icon: String, title: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                Text(title)
                    .font(NBFont.captionMedium)
            }
            .foregroundColor(color)
        }
    }

    private func loadDetail() async {
        do {
            work = try await APIClient.shared.request(.workDetail(id: workId))
            isLiked = work?.isLiked ?? false
            isFavorited = work?.isFavorited ?? false
            let response: [NailWorkComment] = try await APIClient.shared.request(.workComments(id: workId, page: 1))
            comments = response
            isLoading = false
        } catch {
            isLoading = false
        }
    }

    private func toggleLike() {
        isLiked.toggle()
        if isLiked { work?.likeCount = (work?.likeCount ?? 0) + 1 }
        else { work?.likeCount = max(0, (work?.likeCount ?? 0) - 1) }
        Task { try? await APIClient.shared.requestVoid(.likeWork(id: workId)) }
    }

    private func toggleFavorite() {
        isFavorited.toggle()
        if isFavorited { work?.favoriteCount = (work?.favoriteCount ?? 0) + 1 }
        else { work?.favoriteCount = max(0, (work?.favoriteCount ?? 0) - 1) }
        Task { try? await APIClient.shared.requestVoid(.favoriteWork(id: workId)) }
    }

    private func submitComment() async {
        guard !commentText.isEmpty else { return }
        do {
            _ = try await APIClient.shared.requestVoid(
                .addComment(workId: workId, content: commentText, parentId: replyTo?.id)
            )
            commentText = ""
            replyTo = nil
            showCommentInput = false
            let response: [NailWorkComment] = try await APIClient.shared.request(.workComments(id: workId, page: 1))
            comments = response
        } catch {}
    }

    private func shareWork() {
        // TODO: implement share
    }
}

// MARK: - Comment Row

struct CommentRow: View {
    let comment: NailWorkComment
    var onReply: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                Circle()
                    .fill(Color.nbPrimarySoft)
                    .frame(width: 28, height: 28)
                    .overlay(
                        Text(String(displayName.first ?? "?"))
                            .font(NBFont.captionSmall)
                            .foregroundColor(.nbPrimary)
                    )
                VStack(alignment: .leading, spacing: 1) {
                    Text(displayName)
                        .font(NBFont.captionLarge)
                        .fontWeight(.medium)
                        .foregroundColor(.nbTextPrimary)
                    if let time = comment.createdAt {
                        Text(formatTime(time))
                            .font(NBFont.captionSmall)
                            .foregroundColor(.nbTextMuted)
                    }
                }
                Spacer()

                if comment.isPinned == true {
                    Text("置顶")
                        .font(NBFont.captionSmall)
                        .foregroundColor(.nbPrimary)
                }
            }

            Text(comment.content)
                .font(NBFont.bodyMedium)
                .foregroundColor(.nbTextPrimary)

            // Replies
            if let replies = comment.replies, !replies.isEmpty {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    ForEach(replies) { reply in
                        HStack(spacing: Spacing.sm) {
                            Circle()
                                .fill(Color.nbSecondarySoft)
                                .frame(width: 20, height: 20)
                                .overlay(
                                    Text(String((reply.client?.nickname ?? reply.technician?.name ?? "?").first ?? "?"))
                                        .font(.system(size: 8))
                                        .foregroundColor(.nbTextSecondary)
                                )
                            Text(reply.client?.nickname ?? reply.technician?.name ?? "")
                                .font(NBFont.captionMedium)
                                .fontWeight(.medium)
                            Text(reply.content)
                                .font(NBFont.captionLarge)
                                .foregroundColor(.nbTextSecondary)
                        }
                    }
                }
                .padding(.leading, Spacing.xl)
                .padding(.vertical, Spacing.sm)
                .background(Color.nbSurfaceAlt)
                .cornerRadius(Radius.sm)
            }

            Button { onReply?() } label: {
                Text("回复")
                    .font(NBFont.captionLarge)
                    .foregroundColor(.nbTextTertiary)
            }
        }
        .padding(.vertical, Spacing.sm)
    }

    private var displayName: String {
        comment.client?.nickname ?? comment.technician?.name ?? "匿名用户"
    }

    private func formatTime(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return "" }
        let f = DateFormatter()
        f.dateFormat = "MM-dd HH:mm"
        return f.string(from: date)
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, origin) in result.origins.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + origin.x, y: bounds.minY + origin.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, origins: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var origins: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            origins.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxX = max(maxX, x)
        }

        return (CGSize(width: maxX - spacing, height: y + rowHeight), origins)
    }
}
