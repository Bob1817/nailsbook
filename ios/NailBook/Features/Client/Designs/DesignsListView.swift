import SwiftUI

// MARK: - Designs List

struct DesignsListView: View {
    @State private var designs: [DesignRequest] = []
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    NBLoadingView()
                } else if designs.isEmpty {
                    NBEmptyState(icon: "paintbrush", title: "暂无设计需求", message: "上传参考图，让美甲师为你设计")
                } else {
                    List(designs) { design in
                        NavigationLink(destination: DesignDetailView(designId: design.id)) {
                            DesignRow(design: design)
                        }
                        .listRowSeparator(.hidden)
                        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.lg, bottom: Spacing.sm, trailing: Spacing.lg))
                        .listRowBackground(Color.nbBg)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("设计需求")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink { CreateDesignView() } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .background(Color.nbBg)
            .task { await loadDesigns() }
            .refreshable { await loadDesigns() }
        }
    }

    private func loadDesigns() async {
        do {
            designs = try await APIClient.shared.request(.clientDesigns)
            isLoading = false
        } catch {
            isLoading = false
        }
    }
}

struct DesignRow: View {
    let design: DesignRequest

    var body: some View {
        NBCard {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Text(design.title ?? "未命名设计")
                        .font(NBFont.titleSmall)
                        .foregroundColor(.nbTextPrimary)
                    Spacer()
                    designStatusChip(design.status)
                }

                if let desc = design.description, !desc.isEmpty {
                    Text(desc)
                        .font(NBFont.bodySmall)
                        .foregroundColor(.nbTextSecondary)
                        .lineLimit(2)
                }

                if let images = design.images, !images.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: Spacing.xs) {
                            ForEach(images.prefix(4), id: \.self) { url in
                                AsyncImage(url: URL(string: url)) { image in
                                    image.resizable().aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Rectangle().fill(Color.nbSecondarySoft)
                                }
                                .frame(width: 56, height: 56)
                                .cornerRadius(Radius.sm)
                                .clipped()
                            }
                        }
                    }
                }

                if let price = design.quotePrice, price > 0 {
                    HStack {
                        Text("报价")
                            .font(NBFont.captionLarge)
                            .foregroundColor(.nbTextSecondary)
                        Text("¥\(String(format: "%.0f", price))")
                            .font(NBFont.titleSmall)
                            .foregroundColor(.nbPrimary)
                    }
                }
            }
        }
    }

    private func designStatusChip(_ status: String) -> some View {
        let (text, color): (String, Color) = switch status {
        case "pending": ("待报价", .nbWarning)
        case "quoted": ("已报价", .nbInfo)
        case "accepted": ("已接受", .nbSuccess)
        case "rejected": ("已拒绝", .nbError)
        default: (status, .nbTextTertiary)
        }
        return NBChip(title: text, color: color)
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
    @State private var isSubmitting = false
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
        .navigationBarTitleDisplayMode(.inline)
        .background(Color.nbBg)
    }

    private func submit() {
        guard !title.isEmpty else {
            errorMessage = "请输入标题"
            return
        }
        isSubmitting = true
        Task {
            do {
                _ = try await APIClient.shared.requestVoid(
                    .createDesign(params: ["title": title, "description": description])
                )
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                isSubmitting = false
            }
        }
    }
}
