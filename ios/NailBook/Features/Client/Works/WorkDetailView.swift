import SwiftUI

// MARK: - Work Detail View (aligned with wxapp design)

struct WorkDetailView: View {
    let workId: Int
    @Environment(\.dismiss) private var dismiss
    @State private var work: NailWork?
    @State private var comments: [NailWorkComment] = []
    @State private var isLoading = true
    @State private var isLiked = false
    @State private var isFavorited = false
    @State private var commentText = ""
    @State private var replyTo: NailWorkComment?
    @State private var currentImageIndex = 0
    @State private var loadErrorMessage: String?
    @State private var myClientUserId: Int?
    @State private var editingComment: NailWorkComment?
    @State private var editText = ""
    @State private var deletingComment: NailWorkComment?
    @State private var navigateToBooking = false

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
        .toolbar(.hidden, for: .tabBar)
        .task { await loadDetail() }
        .task {
            if let me: ClientUser = try? await APIClient.shared.request(.clientMe) {
                myClientUserId = me.id
            }
        }
        // 编辑自己的评论
        .alert("编辑评论", isPresented: Binding(
            get: { editingComment != nil },
            set: { if !$0 { editingComment = nil } }
        )) {
            TextField("评论内容", text: $editText)
            Button("取消", role: .cancel) { editingComment = nil }
            Button("保存") { Task { await saveEdit() } }
        }
        // 删除自己的评论
        .confirmationDialog("删除这条评论？", isPresented: Binding(
            get: { deletingComment != nil },
            set: { if !$0 { deletingComment = nil } }
        ), titleVisibility: .visible) {
            Button("删除", role: .destructive) { Task { await deleteComment() } }
            Button("取消", role: .cancel) { deletingComment = nil }
        }
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

            Text(loadErrorMessage ?? "暂时无法打开这件作品。你可以返回继续浏览，或稍后重新尝试。")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)
                .lineSpacing(1.4)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)

            HStack(spacing: 12) {
                Button("返回浏览") {
                    dismiss()
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
        // 单一滚动流：图片 + 内容 + 评论整体滚动，上滑后内容区占满全屏
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Image carousel
                imageCarousel(work)

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
        }
        .ignoresSafeArea(edges: .top)
        .background(NBColors.page)
        // 评论输入栏：悬浮毛玻璃（Apple glass）
        .safeAreaInset(edge: .bottom) {
            commentInputBar
        }
        // 预约同款：作品归属美甲师时跳转创建预约（作品模式）
        .background(
            Group {
                if let tech = work.technician {
                    NavigationLink(destination: CreateOrderView(techId: tech.id, techName: tech.name ?? "美甲师", sourceWork: work), isActive: $navigateToBooking) { EmptyView() }.hidden()
                }
            }
        )
    }

    // MARK: - Image Carousel

    private func imageCarousel(_ work: NailWork) -> some View {
        ZStack(alignment: .bottom) {
            // 后端 imageUrls 可能为空数组（非 nil），需显式 fallback 到 coverUrl
            let images = {
                if let urls = work.imageUrls, !urls.isEmpty { return urls }
                if let cover = work.coverUrl { return [cover] }
                return [String]()
            }()

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
                        dismiss()
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
            if work.technician != nil {
                Button {
                    navigateToBooking = true
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

            NavigationLink(destination: ArtistHomeView(artistId: tech.id)) {
                HStack(spacing: 2) {
                    Text("查看主页")
                        .font(.system(size: 12))
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10))
                }
                .foregroundColor(NBColors.link)
            }
            .buttonStyle(.plain)
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
                        .foregroundColor(isLiked ? NBColors.money : NBColors.secondary)
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
        // 点击评论 = 回复（引用）该评论
        .onTapGesture { replyTo = comment }
        // 长按自己的评论：编辑 / 删除
        .contextMenu {
            if comment.client?.id == myClientUserId {
                Button {
                    editText = comment.content
                    editingComment = comment
                } label: {
                    Label("编辑", systemImage: "pencil")
                }
                Button(role: .destructive) {
                    deletingComment = comment
                } label: {
                    Label("删除", systemImage: "trash")
                }
            } else {
                Button {
                    replyTo = comment
                } label: {
                    Label("回复", systemImage: "arrowshape.turn.up.left")
                }
            }
        }
    }

    // MARK: - Comment Input Bar

    private var commentInputBar: some View {
        VStack(spacing: 8) {
            // 回复提示胶囊
            if let reply = replyTo {
                let replyName = reply.client?.nickname ?? reply.technician?.name ?? ""
                HStack(spacing: 6) {
                    Image(systemName: "arrowshape.turn.up.left.fill")
                        .font(.system(size: 10))
                        .foregroundColor(NBColors.muted)
                    Text("回复 @\(replyName)")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(NBColors.secondary)
                        .lineLimit(1)
                    Button {
                        replyTo = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.muted)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 5)
                .background(Color.black.opacity(0.06))
                .clipShape(Capsule())
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            HStack(spacing: 10) {
                // 输入框：玻璃上的白色半透明胶囊
                HStack(spacing: 6) {
                    Image(systemName: "text.bubble")
                        .font(.system(size: 13))
                        .foregroundColor(NBColors.muted)
                    TextField(replyTo != nil ? "写回复…" : "说点什么…", text: $commentText)
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.ink)
                        .submitLabel(.send)
                        .onSubmit { Task { await submitComment() } }
                }
                .padding(.horizontal, 14)
                .frame(height: 40)
                .background(Color.white.opacity(0.88))
                .clipShape(Capsule())
                .overlay(
                    Capsule().strokeBorder(Color.black.opacity(0.06), lineWidth: 0.5)
                )

                // 发送按钮：ink 实底胶囊
                Button {
                    Task { await submitComment() }
                } label: {
                    Image(systemName: "paperplane.fill")
                        .font(.system(size: 15))
                        .foregroundColor(.white)
                        .frame(width: 40, height: 40)
                        .background(
                            Circle().fill(commentText.isEmpty
                                ? NBColors.muted.opacity(0.3)
                                : NBColors.ink)
                        )
                }
                .disabled(commentText.isEmpty)
            }
        }
        .padding(.horizontal, 12)
        .padding(.top, 8)
        .padding(.bottom, 6)
        // Apple glass：超薄毛玻璃，透出滚动内容
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) {
            Divider().opacity(0.5)
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
            loadErrorMessage = "加载失败（\(String(describing: error))），请稍后重试。"
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
            await loadComments()
        } catch {}
    }

    private func loadComments() async {
        if let response: [NailWorkComment] = try? await APIClient.shared.request(.workComments(id: workId, page: 1)) {
            comments = response
        }
    }

    private func saveEdit() async {
        guard let comment = editingComment, !editText.trimmingCharacters(in: .whitespaces).isEmpty else {
            editingComment = nil
            return
        }
        let content = editText.trimmingCharacters(in: .whitespaces)
        editingComment = nil
        do {
            _ = try await APIClient.shared.requestVoid(
                .updateComment(workId: workId, commentId: comment.id, content: content)
            )
            await loadComments()
        } catch {}
    }

    private func deleteComment() async {
        guard let comment = deletingComment else { return }
        deletingComment = nil
        do {
            _ = try await APIClient.shared.requestVoid(
                .deleteComment(workId: workId, commentId: comment.id)
            )
            await loadComments()
        } catch {}
    }

    private func shareWork() {
        guard let work = work else { return }
        let shareText = work.title ?? "美甲作品"
        let shareURL = "https://lunails.cn/works/\(workId)"
        let items: [Any] = [shareText, URL(string: shareURL) as Any].compactMap { $0 }
        let av = UIActivityViewController(activityItems: items, applicationActivities: nil)
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let root = scene.windows.first?.rootViewController {
            root.present(av, animated: true)
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        WorkDetailView(workId: 1)
    }
}
