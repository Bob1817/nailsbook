import SwiftUI

// MARK: - Technician Works Management

struct TechnicianWorksView: View {
    @State private var works: [NailWork] = []
    @State private var isLoading = true
    @State private var showCreate = false

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    NBLoadingView()
                } else if works.isEmpty {
                    NBEmptyState(icon: "photo.on.rectangle.angled", title: "暂无作品", message: "点击右上角创建你的第一个作品")
                } else {
                    List(works) { work in
                        NavigationLink(destination: TechWorkDetailView(work: work)) {
                            TechWorkRow(work: work)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("作品管理")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { showCreate = true } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .background(Color.nbBg)
            .task { await loadWorks() }
            .refreshable { await loadWorks() }
            .sheet(isPresented: $showCreate) {
                TechWorkEditView(work: nil) { await loadWorks() }
            }
        }
    }

    private func loadWorks() async {
        do {
            works = try await APIClient.shared.request(.techWorks)
            isLoading = false
        } catch { isLoading = false }
    }
}

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
                        NBChip(title: "公开", color: .nbSuccess)
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
    let work: NailWork
    @State private var isLoading = false

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
        .navigationBarTitleDisplayMode(.inline)
        .background(Color.nbBg)
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
        try? await APIClient.shared.requestVoid(.toggleWorkVisible(id: work.id))
    }

    private func togglePinned() async {
        try? await APIClient.shared.requestVoid(.toggleWorkPinned(id: work.id))
    }

    private func toggleFeatured() async {
        try? await APIClient.shared.requestVoid(.toggleWorkFeatured(id: work.id))
    }
}

// MARK: - Work Edit View

struct TechWorkEditView: View {
    let work: NailWork?
    var onSave: (() async -> Void)?

    @Environment(\.dismiss) var dismiss
    @State private var title = ""
    @State private var description = ""
    @State private var tags = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("作品标题")
                                .font(NBFont.titleSmall)
                            NBTextField(placeholder: "如：法式渐变美甲", text: $title)
                        }
                    }

                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("作品描述")
                                .font(NBFont.titleSmall)
                            TextEditor(text: $description)
                                .font(NBFont.bodyMedium)
                                .frame(height: 100)
                                .padding(Spacing.sm)
                                .background(Color.nbSurfaceAlt)
                                .cornerRadius(Radius.sm)
                        }
                    }

                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("标签（逗号分隔）")
                                .font(NBFont.titleSmall)
                            NBTextField(placeholder: "如：法式, 渐变, 日常", text: $tags)
                        }
                    }

                    NBButton(title: work == nil ? "创建作品" : "保存修改", style: .primary, isLoading: isSaving) {
                        save()
                    }
                }
                .padding(Spacing.lg)
            }
            .navigationTitle(work == nil ? "新建作品" : "编辑作品")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color.nbBg)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { dismiss() }
                }
            }
            .onAppear { loadExisting() }
        }
    }

    private func loadExisting() {
        guard let w = work else { return }
        title = w.title ?? ""
        description = w.description ?? ""
        tags = (w.tags ?? []).joined(separator: ", ")
    }

    private func save() {
        guard !title.isEmpty else { return }
        isSaving = true

        let tagList = tags.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        let params: [String: Any] = [
            "title": title,
            "description": description,
            "tags": tagList
        ]

        Task {
            do {
                if let w = work {
                    _ = try await APIClient.shared.requestVoid(.updateWork(id: w.id, params: params))
                } else {
                    _ = try await APIClient.shared.requestVoid(.createWork(params: params))
                }
                await onSave?()
                dismiss()
            } catch {
                isSaving = false
            }
        }
    }
}
