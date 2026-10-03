import SwiftUI
import PhotosUI

// MARK: - Technician Works Management (aligned with wxapp design)

struct TechnicianWorksView: View {
    @State private var works: [NailWork] = []
    @State private var isLoading = true
    @State private var showCreate = false
    @State private var editingWork: NailWork?
    @State private var deletingWork: NailWork?
    @State private var deleteError: String?

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                NBColors.page.ignoresSafeArea()

                if isLoading {
                    loadingView
                } else if works.isEmpty {
                    emptyView
                } else {
                    worksList
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("作品")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(NBColors.ink)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink { HeroRecommendationsView() } label: {
                        Text("首页推荐")
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.link)
                    }
                }
            }
            .task { await loadWorks() }
            .refreshable { await loadWorks() }
            .sheet(isPresented: $showCreate) {
                TechWorkEditView(work: nil) { await loadWorks() }
            }
            .sheet(item: $editingWork) { work in
                TechWorkEditView(work: work) { await loadWorks() }
            }
            .alert("删除后无法恢复，确认删除？", isPresented: Binding(get: { deletingWork != nil }, set: { if !$0 { deletingWork = nil } })) {
                Button("取消", role: .cancel) { deletingWork = nil }
                Button("删除", role: .destructive) {
                    guard let work = deletingWork else { return }
                    Task { await deleteWork(work) }
                }
            }
            .alert("操作失败", isPresented: Binding(get: { deleteError != nil }, set: { if !$0 { deleteError = nil } })) {
                Button("确定") { deleteError = nil }
            } message: { Text(deleteError ?? "") }
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
            Spacer()
        }
    }

    // MARK: - Empty View

    private var emptyView: some View {
        VStack(spacing: 16) {
            Spacer()

            ZStack {
                Circle()
                    .fill(NBColors.page)
                    .frame(width: 60, height: 60)
                Circle()
                    .fill(Color.black.opacity(0.32))
                    .frame(width: 26, height: 26)
            }

            Text("还没有作品")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.muted)

            Text("上传你的美甲作品，吸引更多客户")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)

            Button("上传第一个作品") {
                showCreate = true
            }
            .font(.system(size: 15, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 32)
            .frame(height: 44)
            .background(NBColors.action)
            .cornerRadius(8)
            .shadow(color: Color.black.opacity(0.3), radius: 12, y: 4)

            Spacer()
        }
    }

    // MARK: - Works List (Waterfall)

    private var worksList: some View {
        ScrollView {
            HStack(alignment: .top, spacing: 8) {
                // Left column
                VStack(spacing: 8) {
                    ForEach(Array(works.enumerated().filter { $0.offset % 2 == 0 }.map { $0.element })) { work in
                        workCard(work)
                    }
                }

                // Right column
                VStack(spacing: 8) {
                    ForEach(Array(works.enumerated().filter { $0.offset % 2 == 1 }.map { $0.element })) { work in
                        workCard(work)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 100)
        }
        .overlay(alignment: .bottom) {
            // Fixed publish button
            VStack(spacing: 0) {
                LinearGradient(
                    colors: [Color.white.opacity(0), Color.white.opacity(0.9), Color.white],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 30)
                .allowsHitTesting(false)

                Button {
                    showCreate = true
                } label: {
                    Text("+ 上传作品")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(NBColors.action)
                        .cornerRadius(8)
                        .shadow(color: Color.black.opacity(0.3), radius: 12, y: 4)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 16)
                .background(Color.white)
            }
        }
    }

    // MARK: - Work Card

    private func workCard(_ work: NailWork) -> some View {
        NavigationLink(destination: TechWorkDetailView(work: work)) {
            ZStack(alignment: .topTrailing) {
                // Image
                let imageHeight = calculateImageHeight(for: work)

                AsyncImage(url: URL(string: work.coverUrl ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(NBColors.page)
                        .overlay(
                            Image(systemName: "photo")
                                .foregroundColor(NBColors.muted)
                        )
                }
                .frame(height: imageHeight)
                .clipped()
                .cornerRadius(Radius.md)

                // Gradient overlay
                VStack {
                    Spacer()
                    LinearGradient(
                        colors: [Color.black.opacity(0.12), Color.clear, Color.clear, Color.black.opacity(0.72)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .frame(height: imageHeight * 0.6)
                }
                .frame(height: imageHeight)
                .cornerRadius(Radius.md)

                // Hidden mask
                if work.isVisible != true {
                    ZStack {
                        Color.black.opacity(0.55)
                        Text("已隐藏")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 4)
                            .background(Color.black.opacity(0.3))
                            .cornerRadius(7)
                    }
                    .frame(height: imageHeight)
                    .cornerRadius(Radius.md)
                }

                // Top tags
                VStack {
                    HStack(spacing: 4) {
                        if work.isPinned == true {
                            Text("置顶")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.black.opacity(0.85))
                                .cornerRadius(7)
                        }
                        if work.isFeatured == true {
                            Text("精品")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.black.opacity(0.85))
                                .cornerRadius(7)
                        }
                        Spacer()
                    }
                    .padding(8)
                    Spacer()
                }
                .frame(height: imageHeight)

                // More button
                VStack {
                    HStack {
                        Spacer()
                        Menu {
                            Button("编辑") { editingWork = work }
                            Button("删除", role: .destructive) { deletingWork = work }
                        } label: {
                            Image(systemName: "ellipsis")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 32, height: 32)
                                .background(Color.black.opacity(0.3))
                                .clipShape(Circle())
                        }
                    }
                    .padding(8)
                    Spacer()
                }
                .frame(height: imageHeight)

                // Bottom info
                VStack {
                    Spacer()
                    VStack(alignment: .leading, spacing: 2) {
                        Text(work.title ?? "未命名作品")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                            .lineLimit(1)

                        if let price = work.price, price > 0 {
                            Text("¥\(String(format: "%.0f", price))")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color.white.opacity(0.92))
                        }

                        HStack(spacing: 12) {
                            HStack(spacing: 3) {
                                Image(systemName: "heart")
                                    .font(.system(size: 10))
                                Text("\(work.likeCount ?? 0)")
                                    .font(.system(size: 11))
                            }
                            HStack(spacing: 3) {
                                Image(systemName: "bubble.right")
                                    .font(.system(size: 10))
                                Text("\(work.commentCount ?? 0)")
                                    .font(.system(size: 11))
                            }
                        }
                        .foregroundColor(Color.white.opacity(0.7))
                    }
                    .padding(10)
                }
                .frame(height: imageHeight)
            }
        }
        .buttonStyle(.plain)
    }

    private func calculateImageHeight(for work: NailWork) -> CGFloat {
        // Varying heights for waterfall effect
        let index = works.firstIndex(where: { $0.id == work.id }) ?? 0
        let heights: [CGFloat] = [200, 160, 180, 220, 170, 190]
        return heights[index % heights.count]
    }

    // MARK: - Data Loading

    private func loadWorks() async {
        do {
            works = try await APIClient.shared.request(.techWorks)
            isLoading = false
        } catch {
            isLoading = false
        }
    }

    private func deleteWork(_ work: NailWork) async {
        do {
            try await APIClient.shared.requestVoid(.deleteWork(id: work.id))
            deletingWork = nil
            await loadWorks()
        } catch {
            deleteError = error.localizedDescription
            deletingWork = nil
        }
    }
}

// MARK: - Tech Work Row (Legacy)

struct TechWorkRow: View {
    let work: NailWork

    var body: some View {
        HStack(spacing: Spacing.md) {
            // Cover
            AsyncImage(url: URL(string: work.coverUrl ?? "")) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .fill(Color.nbSecondarySoft)
                    .overlay(Image(systemName: "photo").foregroundColor(.nbTextTertiary))
            }
            .frame(width: 60, height: 60)
            .cornerRadius(Radius.sm)
            .clipped()

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(work.title ?? "未命名作品")
                    .font(NBFont.bodyLarge)
                    .foregroundColor(.nbTextPrimary)
                    .lineLimit(1)

                HStack(spacing: Spacing.sm) {
                    if work.isVisible == true {
                        NBChip(title: work.publicationStatus == "approved" ? "已发布" : (work.publicationStatus == "draft" ? "草稿" : (work.publicationStatus == "rejected" ? "审核拒绝" : "待审核")), color: .nbTextSecondary)
                    } else {
                        NBChip(title: "隐藏", color: .nbTextTertiary)
                    }
                    if work.isPinned == true {
                        NBChip(title: "置顶", color: .nbWarning)
                    }
                    if work.isFeatured == true {
                        NBChip(title: "精品", color: .nbPrimary)
                    }
                }

                HStack(spacing: Spacing.md) {
                    Label("\(work.likeCount ?? 0)", systemImage: "heart")
                    Label("\(work.commentCount ?? 0)", systemImage: "bubble.right")
                }
                .font(NBFont.captionMedium)
                .foregroundColor(.nbTextTertiary)
            }
            Spacer()
        }
        .padding(.vertical, Spacing.xs)
        .listRowBackground(Color.nbSurface)
    }
}

// MARK: - Tech Work Detail

struct TechWorkDetailView: View {
    @State var work: NailWork
    @Environment(\.dismiss) private var dismiss
    @State private var isLoading = false
    @State private var editing = false
    @State private var deleting = false
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Images
                if let images = work.images, !images.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: Spacing.md) {
                            ForEach(images, id: \.self) { url in
                                AsyncImage(url: URL(string: url)) { image in
                                    image.resizable().aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Rectangle().fill(Color.nbSecondarySoft).overlay(ProgressView())
                                }
                                .frame(width: 280, height: 280)
                                .cornerRadius(Radius.lg)
                                .clipped()
                            }
                        }
                        .padding(.horizontal, Spacing.lg)
                    }
                }

                // Info
                NBCard {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text(work.title ?? "未命名作品")
                            .font(NBFont.titleLarge)
                        if let desc = work.description {
                            Text(desc)
                                .font(NBFont.bodyMedium)
                                .foregroundColor(.nbTextSecondary)
                        }
                        if let tags = work.tags, !tags.isEmpty {
                            FlowLayout(spacing: Spacing.sm) {
                                ForEach(tags, id: \.self) { tag in
                                    NBChip(title: tag)
                                }
                            }
                        }
                    }
                }

                // Stats
                HStack(spacing: Spacing.md) {
                    statItem("浏览", "\(work.viewCount ?? 0)")
                    statItem("点赞", "\(work.likeCount ?? 0)")
                    statItem("收藏", "\(work.favoriteCount ?? 0)")
                    statItem("评论", "\(work.commentCount ?? 0)")
                }
                .padding(.horizontal, Spacing.lg)

                // Toggle controls
                NBCard {
                    VStack(spacing: Spacing.md) {
                        toggleRow(title: "公开可见", isOn: work.isVisible == true, icon: "eye") {
                            Task { await toggleVisible() }
                        }
                        toggleRow(title: "置顶作品", isOn: work.isPinned == true, icon: "pin") {
                            Task { await togglePinned() }
                        }
                        toggleRow(title: "精品推荐", isOn: work.isFeatured == true, icon: "star") {
                            Task { await toggleFeatured() }
                        }
                    }
                }
            }
            .padding(.vertical, Spacing.lg)
        }
        .navigationTitle("作品详情")
        .toolbar(.hidden, for: .tabBar)
        .navigationBarTitleDisplayMode(.inline)
        .background(Color.nbBg)
        .disabled(isLoading)
        .toolbar {
            Button("编辑") { editing = true }
            Button("删除", role: .destructive) { deleting = true }
        }
        .sheet(isPresented: $editing) { TechWorkEditView(work: work) { await reload() } }
        .alert("删除后无法恢复，确认删除作品？", isPresented: $deleting) {
            Button("取消", role: .cancel) {}
            Button("删除", role: .destructive) { Task {
                do { try await APIClient.shared.requestVoid(.deleteWork(id: work.id)); dismiss() }
                catch { self.error = error.localizedDescription }
            } }
        }
        .alert("操作失败", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
            Button("确定") { error = nil }
        } message: { Text(error ?? "") }
    }

    private func statItem(_ title: String, _ value: String) -> some View {
        VStack(spacing: Spacing.xs) {
            Text(value)
                .font(NBFont.titleMedium)
                .foregroundColor(.nbTextPrimary)
            Text(title)
                .font(NBFont.captionLarge)
                .foregroundColor(.nbTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(Spacing.md)
        .background(Color.nbSurface)
        .cornerRadius(Radius.md)
    }

    private func toggleRow(title: String, isOn: Bool, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(.nbTextSecondary)
                    .frame(width: 24)
                Text(title)
                    .font(NBFont.bodyMedium)
                    .foregroundColor(.nbTextPrimary)
                Spacer()
                Image(systemName: isOn ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isOn ? .nbPrimary : .nbTextTertiary)
                    .font(.system(size: 22))
            }
            .padding(.vertical, Spacing.xs)
        }
        .buttonStyle(.plain)
    }

    private func toggleVisible() async {
        await mutate(.toggleWorkVisible(id: work.id))
    }

    private func togglePinned() async {
        await mutate(.toggleWorkPinned(id: work.id))
    }

    private func toggleFeatured() async {
        await mutate(.toggleWorkFeatured(id: work.id))
    }
    private func reload() async {
        do { work = try await APIClient.shared.request(.techWorkDetail(id: work.id)) }
        catch { self.error = error.localizedDescription }
    }
    private func mutate(_ endpoint: Endpoint) async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        do { try await APIClient.shared.requestVoid(endpoint); await reload() }
        catch { self.error = error.localizedDescription }
    }
}

// MARK: - Work Edit View

struct TechWorkEditView: View {
    let work: NailWork?
    var onSave: (() async -> Void)?
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var description = ""
    @State private var tags = ""
    @State private var images: [String] = []
    @State private var photos: [PhotosPickerItem] = []
    @State private var isSaving = false
    @State private var error: String?
    @State private var createRequestId = UUID().uuidString

    var body: some View {
        NavigationStack {
            Form {
                Section("作品内容") {
                    TextField("作品标题", text: $title)
                    TextField("作品描述", text: $description, axis: .vertical).lineLimit(3...8)
                    TextField("标签（逗号分隔）", text: $tags)
                }
                Section("作品照片 · 第一张作为封面") {
                    ForEach(images, id: \.self) { url in
                        HStack {
                            AsyncImage(url: URL(string: url)) { image in image.resizable().scaledToFit() }
                                placeholder: { ProgressView() }.frame(height: 100)
                            Spacer()
                            Button("移除") { images.removeAll { $0 == url } }.frame(minHeight: 44)
                        }
                    }
                    PhotosPicker(selection: $photos, maxSelectionCount: max(1, 9 - images.count), matching: .images) {
                        Label("从照片图库添加", systemImage: "photo.on.rectangle").frame(minHeight: 44)
                    }.disabled(images.count >= 9)
                    .onChange(of: photos) { _ in Task { await upload() } }
                }
                Section {
                    Button("保存草稿") { Task { await save(publish: false) } }.frame(minHeight: 44)
                    Button("提交审核") { Task { await save(publish: true) } }.frame(minHeight: 44)
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || images.isEmpty)
                    Text("审核通过后才会公开展示。编辑已发布作品可能触发重新审核。").font(.footnote)
                }
                if let error { Text(error) }
                if isSaving { ProgressView() }
            }
            .disabled(isSaving)
            .navigationTitle(work == nil ? "新建作品" : "编辑作品")
            .toolbar { Button("关闭") { dismiss() }.disabled(isSaving) }
            .onAppear {
                title = work?.title ?? ""
                description = work?.description ?? ""
                tags = (work?.tags ?? []).joined(separator: ",")
                images = work?.images ?? work?.coverUrl.map { [$0] } ?? []
            }
        }
    }

    private func upload() async {
        guard !isSaving, !photos.isEmpty else { return }
        isSaving = true
        defer { isSaving = false; photos = [] }
        do {
            for item in photos {
                guard let data = try await item.loadTransferable(type: Data.self),
                      let image = UIImage(data: data), let jpeg = image.jpegData(compressionQuality: 0.85) else {
                    throw APIError.invalidResponse
                }
                let result = try await APIClient.shared.uploadImage(data: jpeg, filename: "\(UUID().uuidString).jpg", role: .technician)
                images.append(result.url)
            }
        } catch { self.error = error.localizedDescription }
    }

    private func save(publish: Bool) async {
        guard !isSaving else { return }
        isSaving = true
        defer { isSaving = false }
        let body: [String: Any] = ["title": title, "description": description, "tags": tags,
                                    "images": images, "coverUrl": images.first ?? "", "createRequestId": createRequestId]
        do {
            if let work {
                if publish && work.publicationStatus != "draft" {
                    try await APIClient.shared.requestVoid(.updateWork(id: work.id, params: body))
                } else {
                    try await APIClient.shared.requestVoid(.resource(role: .technician, path: "works/\(work.id)/draft", method: "PATCH", body: body))
                    if publish {
                        try await APIClient.shared.requestVoid(.resource(role: .technician, path: "works/\(work.id)/publish", method: "POST", body: [:]))
                    }
                }
            } else {
                let path = publish ? "works" : "works/drafts"
                try await APIClient.shared.requestVoid(.resource(role: .technician, path: path, method: "POST", body: body))
            }
            await onSave?()
            dismiss()
        } catch { self.error = error.localizedDescription }
    }
}

// MARK: - Preview

#Preview {
    TechnicianWorksView()
}
