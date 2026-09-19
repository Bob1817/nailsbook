import SwiftUI

// MARK: - Work Detail View (aligned with wxapp design)

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
        ZStack {
            if isLoading {
                loadingView
            } else if let work = work {
                workContent(work)
            } else {
                errorView
            }
        }
        .navigationBarHidden(true)
        .task { await loadDetail() }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
                .scaleEffect(1.2)
            Spacer()
        }
        .background(NBColors.page)
    }

    // MARK: - Error View

    private var errorView: some View {
        VStack(spacing: 16) {
            Spacer()

            ZStack {
                Circle()
                    .fill(NBColors.page)
                    .frame(width: 44, height: 44)
                Text("!")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(NBColors.ink)
            }

            Text("作品暂时无法加载")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(NBColors.ink)

            Text("暂时无法打开这件作品。你可以返回继续浏览，或稍后重新尝试。")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)
                .lineSpacing(1.4)
                .multilineTextAlignment(.center)

            HStack(spacing: 12) {
                Button("返回浏览") {
                    // Go back
                }
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(NBColors.secondary)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(NBColors.page)
                .cornerRadius(8)

                Button("重新加载") {
                    Task { await loadDetail() }
                }
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(NBColors.action)
                .cornerRadius(8)
            }
            .padding(.horizontal, 24)

            Spacer()
        }
        .background(NBColors.page)
    }

    // MARK: - Work Content

    private func workContent(_ work: NailWork) -> some View {
        VStack(spacing: 0) {
            // Image carousel
            imageCarousel(work)

            // Info panel
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Title row
                    titleRow(work)

                    // Price
                    if let price = work.price, price > 0 {
                        priceRow(work)
                    }

                    // Description
                    if let desc = work.description, !desc.isEmpty {
                        Text(desc)
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.secondary)
                            .lineSpacing(1.6)
                            .padding(.top, 8)
                    }

                    // Tags
                    if let tags = work.tags, !tags.isEmpty {
                        tagsSection(tags)
                    }

                    // Technician info
                    if let tech = work.technician {
                        technicianRow(tech)
                    }

                    // Engagement actions
                    engagementSection(work)

                    // Comments
                    commentsSection
                }
                .padding(16)
            }

            // Comment input bar
            if showCommentInput {
                commentInputBar
            }
        }
        .background(Color.white)
    }

    // MARK: - Image Carousel

    private func imageCarousel(_ work: NailWork) -> some View {
        ZStack(alignment: .bottom) {
            let images = work.imageUrls ?? (work.coverUrl != nil ? [work.coverUrl!] : [])

            if images.isEmpty {
                Rectangle()
                    .fill(NBColors.page)
                    .frame(height: UIScreen.main.bounds.height * 0.55)
            } else {
                TabView(selection: $currentImageIndex) {
                    ForEach(images.indices, id: \.self) { index in
                        AsyncImage(url: URL(string: images[index])) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Rectangle()
                                .fill(NBColors.page)
                                .overlay(ProgressView())
                        }
                        .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .automatic))
                .frame(height: UIScreen.main.bounds.height * 0.55)
            }

            // Back button
            VStack {
                HStack {
                    Button {
                        // Go back
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(.white)
                            .frame(width: 44, height: 44)
                            .background(Color.black.opacity(0.52))
                            .clipShape(Circle())
                    }
                    .padding(.leading, 16)
                    .padding(.top, 60)

                    Spacer()
                }
                Spacer()
            }
        }
    }

    // MARK: - Title Row

    private func titleRow(_ work: NailWork) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(work.title ?? "未命名作品")
                .font(.system(size: 19, weight: .bold))
                .foregroundColor(NBColors.ink)
                .lineLimit(2)

            Spacer()

            // Book same button
            Button {
                // Book same
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "calendar")
                        .font(.system(size: 12))
                    Text("预约同款")
                        .font(.system(size: 13, weight: .semibold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(NBColors.action)
                .cornerRadius(6)
            }
        }
    }

    // MARK: - Price Row

    private func priceRow(_ work: NailWork) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("¥\(String(format: "%.0f", work.price ?? 0))")
                .font(.system(size: 19, weight: .bold))
                .foregroundColor(NBColors.action)
        }
        .padding(.top, 8)
    }

    // MARK: - Tags Section

    private func tagsSection(_ tags: [String]) -> some View {
        HStack(spacing: 8) {
            ForEach(tags, id: \.self) { tag in
                Text("#\(tag)")
                    .font(.system(size: 11))
                    .foregroundColor(NBColors.ink)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 4)
                    .background(NBColors.page)
                    .cornerRadius(999)
            }
        }
        .padding(.top, 12)
    }

    // MARK: - Technician Row

    private func technicianRow(_ tech: WorkTechnician) -> some View {
        HStack(spacing: 12) {
            if let avatarUrl = tech.avatarUrl, let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(NBColors.page)
                }
                .frame(width: 36, height: 36)
                .clipShape(Circle())
            } else {
                ZStack {
                    Circle()
                        .fill(NBColors.page)
                        .frame(width: 36, height: 36)
                    Text(String(tech.name?.first ?? "?"))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(NBColors.action)
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(tech.name ?? "")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(NBColors.ink)
                Text("服务美甲师")
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.muted)
            }

            Spacer()

            Text("查看主页 ›")
                .font(.system(size: 12))
                .foregroundColor(NBColors.link)
        }
        .padding(.vertical, 12)
    }

    // MARK: - Engagement Section

    private func engagementSection(_ work: NailWork) -> some View {
        HStack(spacing: 6) {
            // Like
            Button {
                toggleLike()
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: isLiked ? "heart.fill" : "heart")
                        .font(.system(size: 16))
                        .foregroundColor(isLiked ? NBColors.action : NBColors.secondary)
                    Text("\(work.likeCount ?? 0)")
                        .font(.system(size: 13))
                        .foregroundColor(NBColors.secondary)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(NBColors.page)
                .cornerRadius(9)
            }

            // Favorite
            Button {
                toggleFavorite()
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: isFavorited ? "star.fill" : "star")
                        .font(.system(size: 16))
                        .foregroundColor(isFavorited ? NBColors.warning : NBColors.secondary)
                    Text("\(work.favoriteCount ?? 0)")
                        .font(.system(size: 13))
                        .foregroundColor(NBColors.secondary)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(NBColors.page)
                .cornerRadius(9)
            }

            // Share
            Button {
                shareWork()
            } label: {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 16))
                    .foregroundColor(NBColors.secondary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(NBColors.page)
                    .cornerRadius(9)
            }
        }
        .padding(.vertical, 12)
    }

    // MARK: - Comments Section

    private var commentsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("评论")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(NBColors.ink)
                Spacer()
                Text("\(comments.count) 条")
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.muted)
            }

            if comments.isEmpty {
                VStack(spacing: 8) {
                    Text("还没有评论")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(NBColors.secondary)
                    Text("说说你对这个作品的看法")
                        .font(.system(size: 11))
                        .foregroundColor(NBColors.muted)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
                .background(NBColors.page)
                .cornerRadius(10)
            } else {
                ForEach(comments) { comment in
                    commentRow(comment)
                }
            }
        }
    }

    private func commentRow(_ comment: NailWorkComment) -> some View {
        HStack(alignment: .top, spacing: 9) {
            // Avatar
            let avatarUrl = comment.client?.avatarUrl ?? comment.technician?.avatarUrl
            let userName = comment.client?.nickname ?? comment.technician?.name ?? "匿名用户"
            let isTechnician = comment.technicianId != nil

            if let avatarUrl = avatarUrl, let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(NBColors.page)
                }
                .frame(width: 30, height: 30)
                .clipShape(Circle())
            } else {
                ZStack {
                    Circle()
                        .fill(NBColors.page)
                        .frame(width: 30, height: 30)
                    Text(String(userName.prefix(1)))
                        .font(.system(size: 12))
                        .foregroundColor(NBColors.muted)
                }
            }

            // Content
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(userName)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(NBColors.ink)

                    if isTechnician {
                        Text("美甲师")
                            .font(.system(size: 10))
                            .foregroundColor(NBColors.secondary)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1)
                            .background(NBColors.page)
                            .cornerRadius(3)
                    }

                    if comment.isPinned == true {
                        Text("置顶")
                            .font(.system(size: 10))
                            .foregroundColor(NBColors.secondary)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1)
                            .background(NBColors.page)
                            .cornerRadius(3)
                    }

                    Spacer()

                    if let time = comment.createdAt {
                        Text(formatTime(time))
                            .font(.system(size: 10))
                            .foregroundColor(NBColors.muted)
                    }
                }

                Text(comment.content)
                    .font(.system(size: 13))
                    .foregroundColor(NBColors.secondary)
                    .lineSpacing(1.4)
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Comment Input Bar

    private var commentInputBar: some View {
        VStack(spacing: 0) {
            Divider()

            if let reply = replyTo {
                let replyName = reply.client?.nickname ?? reply.technician?.name ?? ""
                HStack {
                    Text("回复 @\(replyName)")
                        .font(.system(size: 11))
                        .foregroundColor(NBColors.secondary)
                    Spacer()
                    Button("取消") { replyTo = nil }
                        .font(.system(size: 11))
                        .foregroundColor(NBColors.ink)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
            }

            HStack(spacing: 12) {
                TextField(replyTo != nil ? "写回复..." : "添加评论…", text: $commentText)
                    .font(.system(size: 13))
                    .padding(.horizontal, 13)
                    .frame(height: 44)
                    .background(NBColors.softSurface)
                    .cornerRadius(8)

                Button {
                    Task { await submitComment() }
                } label: {
                    Text("发送")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(commentText.isEmpty ? NBColors.muted : .white)
                        .frame(width: 72, height: 44)
                        .background(commentText.isEmpty ? NBColors.page : NBColors.action)
                        .cornerRadius(8)
                }
                .disabled(commentText.isEmpty)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.white)
        }
    }

    // MARK: - Helpers

    private func formatTime(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return "" }
        let f = DateFormatter()
        f.dateFormat = "MM-dd HH:mm"
        return f.string(from: date)
    }

    // MARK: - Actions

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

// MARK: - Preview

#Preview {
    NavigationStack {
        WorkDetailView(workId: 1)
    }
}
