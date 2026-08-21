import SwiftUI

// MARK: - Services Management

struct TechnicianServicesView: View {
    @State private var services: [TechnicianService] = []
    @State private var isLoading = true
    @State private var showCreate = false

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    NBLoadingView()
                } else if services.isEmpty {
                    NBEmptyState(icon: "list.bullet.rectangle", title: "暂无服务项目", message: "添加你提供的美甲服务")
                } else {
                    List(services) { service in
                        ServiceRow(service: service,
                                  onToggle: { Task { await toggleService(service.id) } },
                                  onDelete: { Task { await deleteService(service.id) } })
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("服务项目")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { showCreate = true } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .background(Color.nbBg)
            .task { await loadServices() }
            .refreshable { await loadServices() }
            .sheet(isPresented: $showCreate) {
                EditServiceView(service: nil) { await loadServices() }
            }
        }
    }

    private func loadServices() async {
        do {
            services = try await APIClient.shared.request(.services)
            isLoading = false
        } catch { isLoading = false }
    }

    private func toggleService(_ id: Int) async {
        do {
            _ = try await APIClient.shared.requestVoid(.toggleService(id: id))
            await loadServices()
        } catch {}
    }

    private func deleteService(_ id: Int) async {
        do {
            _ = try await APIClient.shared.requestVoid(.deleteService(id: id))
            await loadServices()
        } catch {}
    }
}

struct ServiceRow: View {
    let service: TechnicianService
    var onToggle: (() -> Void)?
    var onDelete: (() -> Void)?

    var body: some View {
        HStack(spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(service.name)
                    .font(NBFont.bodyLarge)
                    .foregroundColor(.nbTextPrimary)
                if let desc = service.description, !desc.isEmpty {
                    Text(desc)
                        .font(NBFont.captionLarge)
                        .foregroundColor(.nbTextSecondary)
                        .lineLimit(1)
                }
                HStack(spacing: Spacing.md) {
                    if let price = service.price {
                        Text("¥\(String(format: "%.0f", price))")
                            .font(NBFont.bodyMedium)
                            .foregroundColor(.nbPrimary)
                    }
                    if let duration = service.duration {
                        Text("\(duration)分钟")
                            .font(NBFont.captionLarge)
                            .foregroundColor(.nbTextTertiary)
                    }
                    if let category = service.category {
                        NBChip(title: category, color: .nbInfo)
                    }
                }
            }
            Spacer()
            Button {
                onToggle?()
            } label: {
                Image(systemName: service.isActive ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(service.isActive ? .nbSuccess : .nbTextTertiary)
                    .font(.system(size: 22))
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, Spacing.xs)
        .listRowBackground(Color.nbSurface)
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) { onDelete?() } label: {
                Label("删除", systemImage: "trash")
            }
            NavigationLink { EditServiceView(service: service) {} } label: {
                Label("编辑", systemImage: "pencil")
            }
            .tint(.nbInfo)
        }
    }
}

// MARK: - Edit Service

struct EditServiceView: View {
    let service: TechnicianService?
    var onSave: (() async -> Void)?

    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var description = ""
    @State private var priceText = ""
    @State private var durationText = ""
    @State private var category = ""
    @State private var isSaving = false

    private let categories = ["基础护理", "色彩美甲", "延伸美甲", "卸甲", "其他"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("服务名称")
                                .font(NBFont.titleSmall)
                            NBTextField(placeholder: "如：基础美甲护理", text: $name)
                        }
                    }

                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("服务描述")
                                .font(NBFont.titleSmall)
                            TextEditor(text: $description)
                                .font(NBFont.bodyMedium)
                                .frame(height: 80)
                                .padding(Spacing.sm)
                                .background(Color.nbSurfaceAlt)
                                .cornerRadius(Radius.sm)
                        }
                    }

                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("价格与时长")
                                .font(NBFont.titleSmall)
                            HStack(spacing: Spacing.md) {
                                NBTextField(placeholder: "价格(元)", text: $priceText, keyboardType: .decimalPad)
                                NBTextField(placeholder: "时长(分钟)", text: $durationText, keyboardType: .numberPad)
                            }
                        }
                    }

                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("分类")
                                .font(NBFont.titleSmall)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: Spacing.sm) {
                                    ForEach(categories, id: \.self) { cat in
                                        NBChip(title: cat, isSelected: category == cat)
                                            .onTapGesture { category = cat }
                                    }
                                }
                            }
                        }
                    }

                    NBButton(title: service == nil ? "添加服务" : "保存修改", style: .primary, isLoading: isSaving) {
                        save()
                    }
                }
                .padding(Spacing.lg)
            }
            .navigationTitle(service == nil ? "添加服务" : "编辑服务")
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
        guard let s = service else { return }
        name = s.name
        description = s.description ?? ""
        if let p = s.price { priceText = String(format: "%.0f", p) }
        if let d = s.duration { durationText = "\(d)" }
        category = s.category ?? ""
    }

    private func save() {
        guard !name.isEmpty else { return }
        isSaving = true

        var params: [String: Any] = ["name": name]
        if !description.isEmpty { params["description"] = description }
        if let price = Double(priceText) { params["price"] = price }
        if let duration = Int(durationText) { params["duration"] = duration }
        if !category.isEmpty { params["category"] = category }

        Task {
            do {
                if let s = service {
                    _ = try await APIClient.shared.requestVoid(.updateService(id: s.id, params: params))
                } else {
                    _ = try await APIClient.shared.requestVoid(.createService(params: params))
                }
                await onSave?()
                dismiss()
            } catch {
                isSaving = false
            }
        }
    }
}
