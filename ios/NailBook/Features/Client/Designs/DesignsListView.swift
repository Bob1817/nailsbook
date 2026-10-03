import SwiftUI
import PhotosUI

// MARK: - Designs List (aligned with wxapp design)

struct DesignsListView: View {
    @State private var designs: [DesignRequest] = []
    @State private var isLoading = true

    var body: some View {
        VStack(spacing: 0) {
            // Create section
            createSection

            // List section
            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("设计记录")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(NBColors.ink)
                        Text("查看设计素材、灵感需求与状态变化")
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.muted)
                    }

                    Spacer()

                    if !designs.isEmpty {
                        Text("\(designs.count) 个设计")
                            .font(.system(size: 12))
                            .foregroundColor(NBColors.muted)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 4)
                            .background(Color.white)
                            .cornerRadius(7)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 12)

                if isLoading {
                    loadingView
                } else if designs.isEmpty {
                    emptyView
                } else {
                    designsGrid
                }
            }
        }
        .background(NBColors.page)
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadDesigns() }
        .refreshable { await loadDesigns() }
    }

    // MARK: - Create Section

    private var createSection: some View {
        HStack(spacing: 8) {
            // Customize design
            NavigationLink(destination: CreateDesignView()) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("创意定制")
                        .font(.system(size: 11))
                        .foregroundColor(NBColors.muted)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(NBColors.page)
                        .cornerRadius(6)

                    ZStack {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(NBColors.action)
                            .frame(width: 32, height: 32)
                        Circle()
                            .fill(Color.white.opacity(0.4))
                            .frame(width: 12, height: 12)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("设计美甲")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(NBColors.ink)
                        Text("从风格、配色到甲型，发起你的专属灵感需求")
                            .font(.system(size: 11))
                            .foregroundColor(NBColors.muted)
                            .lineSpacing(1.3)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(Color.white)
                .cornerRadius(12)
            }
            .buttonStyle(.plain)

            // Upload design
            NavigationLink(destination: CreateDesignView()) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("图稿参考")
                        .font(.system(size: 11))
                        .foregroundColor(NBColors.muted)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(NBColors.page)
                        .cornerRadius(6)

                    ZStack {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(NBColors.action)
                            .frame(width: 32, height: 32)
                        Circle()
                            .fill(Color.white.opacity(0.4))
                            .frame(width: 12, height: 12)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("上传设计")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(NBColors.ink)
                        Text("上传喜欢的参考图，与美甲师沟通细节")
                            .font(.system(size: 11))
                            .foregroundColor(NBColors.muted)
                            .lineSpacing(1.3)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(Color.white)
                .cornerRadius(12)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    // MARK: - Empty View

    private var emptyView: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(NBColors.page)
                    .frame(width: 60, height: 60)
                Circle()
                    .fill(NBColors.action)
                    .frame(width: 18, height: 18)
            }

            Text("暂无设计作品")
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(NBColors.ink)

            Text("点击上方按钮创建你的第一个美甲设计")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 10, y: 2)
        .padding(.horizontal, 16)
    }

    // MARK: - Designs Grid

    private var designsGrid: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 8),
                GridItem(.flexible(), spacing: 8)
            ], spacing: 8) {
                ForEach(Array(designs.enumerated()), id: \.element.id) { index, design in
                    NavigationLink(destination: DesignDetailView(designId: design.id)) {
                        designCard(design, isTall: index % 3 == 0)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 20)
        }
    }

    private func designCard(_ design: DesignRequest, isTall: Bool) -> some View {
        ZStack(alignment: .topLeading) {
            // Image
            if let images = design.images, !images.isEmpty {
                AsyncImage(url: URL(string: images[0])) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(NBColors.page)
                        .overlay(
                            ZStack {
                                Circle()
                                    .fill(NBColors.page)
                                    .frame(width: 24, height: 24)
                                Circle()
                                    .fill(NBColors.action)
                                    .frame(width: 9, height: 9)
                            }
                        )
                }
                .aspectRatio(isTall ? 3/4 : 1, contentMode: .fit)
                .frame(maxWidth: .infinity)
                .clipped()
                .cornerRadius(10)
            } else {
                ZStack {
                    Rectangle()
                        .fill(NBColors.page)
                        .aspectRatio(isTall ? 3/4 : 1, contentMode: .fit)
                        .cornerRadius(10)

                    ZStack {
                        Circle()
                            .fill(NBColors.page)
                            .frame(width: 24, height: 24)
                        Circle()
                            .fill(NBColors.action)
                            .frame(width: 9, height: 9)
                    }
                }
            }

            // Status badge
            Text(statusText(design.status))
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(statusColor(design.status))
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Color.black.opacity(0.2))
                .cornerRadius(6)
                .padding(8)

            // Bottom overlay
            VStack(alignment: .leading, spacing: 2) {
                Spacer()

                LinearGradient(
                    colors: [Color.clear, Color.black.opacity(0.7)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 60)
                .overlay(
                    VStack(alignment: .leading, spacing: 2) {
                        Text(design.title ?? "未命名设计")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                            .lineLimit(1)

                        Text(design.description ?? "暂无描述")
                            .font(.system(size: 11))
                            .foregroundColor(Color.white.opacity(0.78))
                            .lineLimit(1)

                        if let date = design.createdAt {
                            Text(formatDate(date))
                                .font(.system(size: 11))
                                .foregroundColor(Color.white.opacity(0.72))
                        }
                    }
                    .padding(8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                )
            }
        }
        .cornerRadius(10)
    }

    private func statusText(_ status: String?) -> String {
        switch status {
        case "pending": return "待报价"
        case "quoted": return "已报价"
        case "accepted": return "已接受"
        case "rejected": return "已拒绝"
        case "converted": return "已转化"
        case "cancelled": return "已取消"
        default: return status ?? "未知"
        }
    }

    private func statusColor(_ status: String?) -> Color {
        switch status {
        case "pending": return NBColors.link
        case "quoted": return NBColors.link
        case "accepted": return NBColors.success
        case "rejected": return .red
        case "converted": return NBColors.success
        case "cancelled": return NBColors.secondary
        default: return NBColors.muted
        }
    }

    private func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return "" }
        let f = DateFormatter()
        f.dateFormat = "MM/dd"
        return f.string(from: date)
    }

    // MARK: - Data Loading

    private func loadDesigns() async {
        do {
            designs = try await APIClient.shared.request(.clientDesigns)
            isLoading = false
        } catch {
            isLoading = false
        }
    }
}

// MARK: - Design Detail

struct DesignDetailView: View {
    let designId: Int
    @State private var design: DesignRequest?
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            if let design = design {
                VStack(spacing: Spacing.lg) {
                    // Images
                    if let images = design.images, !images.isEmpty {
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

                    VStack(alignment: .leading, spacing: Spacing.lg) {
                        NBCard {
                            VStack(alignment: .leading, spacing: Spacing.md) {
                                Text(design.title ?? "未命名设计")
                                    .font(NBFont.titleLarge)
                                if let desc = design.description {
                                    Text(desc)
                                        .font(NBFont.bodyMedium)
                                        .foregroundColor(.nbTextSecondary)
                                }
                            }
                        }

                        // Quote info
                        if let price = design.quotePrice, price > 0 {
                            NBCard {
                                VStack(alignment: .leading, spacing: Spacing.md) {
                                    Text("报价信息")
                                        .font(NBFont.titleSmall)
                                    HStack {
                                        Text("报价金额")
                                        Spacer()
                                        Text("¥\(String(format: "%.0f", price))")
                                            .foregroundColor(.nbPrimary)
                                            .font(NBFont.titleMedium)
                                    }
                                    .font(NBFont.bodyMedium)
                                    .foregroundColor(.nbTextSecondary)
                                    if let remark = design.quoteRemark {
                                        Text(remark)
                                            .font(NBFont.bodySmall)
                                            .foregroundColor(.nbTextTertiary)
                                    }
                                }
                            }
                        }

                        // Actions
                        if design.status == "quoted" {
                            HStack(spacing: Spacing.md) {
                                NBButton(title: "接受报价", style: .primary) {
                                    Task { await acceptQuote() }
                                }
                                NBButton(title: "拒绝", style: .outline) {
                                    Task { await rejectQuote() }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                }
                .padding(.vertical, Spacing.lg)
            }
        }
        .navigationTitle("设计详情")
        .toolbar(.hidden, for: .tabBar)
        .navigationBarTitleDisplayMode(.inline)
        .background(Color.nbBg)
        .task { await loadDetail() }
    }

    private func loadDetail() async {
        do {
            design = try await APIClient.shared.request(.designDetail(id: designId))
            isLoading = false
        } catch { isLoading = false }
    }

    private func acceptQuote() async {
        do {
            _ = try await APIClient.shared.requestVoid(.acceptDesignQuote(id: designId))
            await loadDetail()
        } catch {}
    }

    private func rejectQuote() async {
        do {
            _ = try await APIClient.shared.requestVoid(.rejectDesignQuote(id: designId))
            await loadDetail()
        } catch {}
    }
}

// MARK: - Create Design

struct CreateDesignView: View {
    @Environment(\.dismiss) var dismiss
    @State private var title = ""
    @State private var description = ""
    @State private var images: [String] = []
    @State private var photos: [PhotosPickerItem] = []
    @State private var isSubmitting = false
    @State private var isUploading = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                NBCard {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("设计标题")
                            .font(NBFont.titleSmall)
                        NBTextField(placeholder: "如：法式美甲设计", text: $title)
                    }
                }

                NBCard {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("描述需求")
                            .font(NBFont.titleSmall)
                        TextEditor(text: $description)
                            .font(NBFont.bodyMedium)
                            .frame(height: 120)
                            .padding(Spacing.sm)
                            .background(Color.nbSurfaceAlt)
                            .cornerRadius(Radius.sm)
                    }
                }

                // Image upload
                NBCard {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("参考图片（选填）")
                            .font(NBFont.titleSmall)
                        Text("上传参考图，帮助美甲师理解你的设计需求")
                            .font(NBFont.captionMedium)
                            .foregroundColor(.nbTextTertiary)

                        // Image grid
                        if !images.isEmpty {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(images, id: \.self) { url in
                                        ZStack(alignment: .topTrailing) {
                                            AsyncImage(url: URL(string: url)) { img in
                                                img.resizable().aspectRatio(contentMode: .fill)
                                            } placeholder: {
                                                Rectangle().fill(Color.nbSurfaceAlt).overlay(ProgressView())
                                            }
                                            .frame(width: 80, height: 80)
                                            .cornerRadius(Radius.sm)
                                            .clipped()

                                            Button {
                                                images.removeAll { $0 == url }
                                            } label: {
                                                Image(systemName: "xmark.circle.fill")
                                                    .font(.system(size: 18))
                                                    .foregroundColor(.white)
                                                    .background(Circle().fill(Color.black.opacity(0.5)))
                                            }
                                            .offset(x: 6, y: -6)
                                        }
                                    }
                                }
                            }
                        }

                        PhotosPicker(selection: $photos, maxSelectionCount: max(1, 5 - images.count), matching: .images) {
                            HStack {
                                if isUploading {
                                    ProgressView().scaleEffect(0.8)
                                    Text("上传中...")
                                } else {
                                    Image(systemName: "photo.on.rectangle")
                                    Text(images.isEmpty ? "添加参考图" : "继续添加")
                                }
                            }
                            .font(NBFont.bodyMedium)
                            .foregroundColor(.nbPrimary)
                            .frame(minHeight: 44)
                        }
                        .disabled(images.count >= 5 || isUploading)
                        .onChange(of: photos) { _ in Task { await uploadImages() } }
                    }
                }

                if let error = errorMessage {
                    Text(error)
                        .font(NBFont.captionLarge)
                        .foregroundColor(.nbError)
                }

                NBButton(title: "提交设计需求", style: .primary, isLoading: isSubmitting) {
                    submit()
                }
            }
            .padding(Spacing.lg)
        }
        .navigationTitle("新建设计")
        .toolbar(.hidden, for: .tabBar)
        .navigationBarTitleDisplayMode(.inline)
        .background(Color.nbBg)
    }

    private func uploadImages() async {
        guard !photos.isEmpty else { return }
        isUploading = true
        defer { isUploading = false; photos = [] }
        do {
            for item in photos {
                guard let data = try await item.loadTransferable(type: Data.self),
                      let image = UIImage(data: data),
                      let jpeg = image.jpegData(compressionQuality: 0.85) else { continue }
                let result = try await APIClient.shared.uploadImage(data: jpeg, filename: "\(UUID().uuidString).jpg", role: .client)
                images.append(result.url)
            }
        } catch {
            errorMessage = "图片上传失败"
        }
    }

    private func submit() {
        guard !title.isEmpty else {
            errorMessage = "请输入标题"
            return
        }
        isSubmitting = true
        Task {
            do {
                var params: [String: Any] = ["title": title, "description": description]
                if !images.isEmpty { params["imageUrls"] = images }
                _ = try await APIClient.shared.requestVoid(.createDesign(params: params))
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                isSubmitting = false
            }
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        DesignsListView()
    }
}
