import SwiftUI

// MARK: - Technician Services (aligned with wxapp design)

struct TechnicianServicesView: View {
    @State private var services: [TechnicianService] = []
    @State private var isLoading = true
    @State private var showCreate = false
    @State private var editingService: TechnicianService?
    @State private var deletingService: TechnicianService?
    @State private var busy = false
    @State private var error: String?

    private let categoryLabels = [
        "basic_care": "基础护理",
        "color_style": "色彩款式",
        "extension_reinforcement": "延长加固",
        "removal": "卸甲"
    ]

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            NBColors.page.ignoresSafeArea()

            if isLoading {
                loadingView
            } else if services.isEmpty {
                emptyView
            } else {
                servicesList
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("服务管理")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(NBColors.ink)
            }
        }
        .task { await load() }
        .refreshable { await load() }
        .sheet(isPresented: $showCreate) {
            EditServiceView(service: nil) { await load() }
        }
        .sheet(item: $editingService) { service in
            EditServiceView(service: service) { await load() }
        }
        .confirmationDialog("确认删除服务项目？", isPresented: Binding(get: { deletingService != nil }, set: { if !$0 { deletingService = nil } }), titleVisibility: .visible) {
            Button("删除", role: .destructive) {
                if let service = deletingService {
                    Task { await deleteService(service) }
                }
            }
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

            // Empty icon
            VStack(spacing: 8) {
                Rectangle()
                    .fill(NBColors.action)
                    .frame(width: 28, height: 3)
                    .cornerRadius(2)
                Rectangle()
                    .fill(NBColors.action)
                    .frame(width: 28, height: 3)
                    .cornerRadius(2)
                Rectangle()
                    .fill(NBColors.action)
                    .frame(width: 28, height: 3)
                    .cornerRadius(2)
            }
            .frame(width: 44, height: 44)
            .padding(10)
            .background(NBColors.page)
            .cornerRadius(7)

            Text("还没有服务项目")
                .font(.system(size: 16))
                .foregroundColor(NBColors.ink)

            Text("至少添加一项有效服务和价格，才能开启接单")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)
                .lineSpacing(1.4)

            Button("添加第一个服务") {
                showCreate = true
            }
            .font(.system(size: 15, weight: .medium))
            .foregroundColor(.white)
            .padding(.horizontal, 36)
            .frame(height: 44)
            .background(NBColors.action)
            .cornerRadius(Radius.xl)

            Spacer()
        }
        .padding(.horizontal, 20)
    }

    // MARK: - Services List

    private var servicesList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(services) { service in
                    serviceCard(service)
                }
            }
            .padding(.horizontal, 14)
            .padding(.top, 8)
            .padding(.bottom, 100)
        }
        .overlay(alignment: .bottomTrailing) {
            // FAB
            Button {
                showCreate = true
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 24, weight: .light))
                    .foregroundColor(.white)
                    .frame(width: 54, height: 54)
                    .background(NBColors.action)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.35), radius: 16, y: 4)
            }
            .padding(.trailing, 20)
            .padding(.bottom, 16)
        }
    }

    // MARK: - Service Card

    private func serviceCard(_ service: TechnicianService) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Top: category + menu
            HStack {
                Text(categoryLabels[service.category ?? ""] ?? "其他")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(NBColors.muted)

                Spacer()

                Menu {
                    Button("编辑") { editingService = service }
                    Button(service.isActive ? "下架" : "上架") {
                        Task { await toggleService(service) }
                    }
                    Button("删除", role: .destructive) {
                        deletingService = service
                    }
                } label: {
                    HStack(spacing: 3) {
                        ForEach(0..<3, id: \.self) { _ in
                            Circle()
                                .fill(NBColors.muted)
                                .frame(width: 4, height: 4)
                        }
                    }
                    .frame(width: 32, height: 32)
                }
            }

            // Title + status
            HStack(spacing: 8) {
                Text(service.name)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(NBColors.ink)
                    .lineLimit(1)

                Spacer()

                // Status badge
                HStack(spacing: 4) {
                    Circle()
                        .fill(service.isActive ? NBColors.action : NBColors.control)
                        .frame(width: 5, height: 5)
                    Text(service.isActive ? "上架中" : "已下架")
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundColor(service.isActive ? NBColors.success : NBColors.muted)
                .padding(.horizontal, 7)
                .padding(.vertical, 4)
                .background(service.isActive ? NBColors.successSurface : NBColors.page)
                .cornerRadius(999)
            }
            .padding(.top, 12)

            // Description
            if let desc = service.description, !desc.isEmpty {
                Text(desc)
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.muted)
                    .lineLimit(2)
                    .lineSpacing(1.4)
                    .padding(.top, 8)
            }

            // Price & Duration
            HStack(spacing: 8) {
                // Price
                VStack(alignment: .leading, spacing: 4) {
                    Text("服务价格")
                        .font(.system(size: 11))
                        .foregroundColor(NBColors.muted)
                    Text(service.price != nil ? "¥\(String(format: "%.0f", service.price!))" : "待设置")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(NBColors.action)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(NBColors.page)
                .cornerRadius(9)

                // Duration
                VStack(alignment: .leading, spacing: 4) {
                    Text("预计时长")
                        .font(.system(size: 11))
                        .foregroundColor(NBColors.muted)
                    HStack(alignment: .firstTextBaseline, spacing: 3) {
                        Text("\(service.durationMinutes ?? 0)")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(NBColors.ink)
                        Text("分钟")
                            .font(.system(size: 11))
                            .foregroundColor(NBColors.muted)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(NBColors.page)
                .cornerRadius(9)
            }
            .padding(.top, 16)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(14)
        .shadow(color: Color.black.opacity(0.035), radius: 10, y: 2)
    }

    // MARK: - Actions

    private func load() async {
        do {
            services = try await APIClient.shared.request(.services)
            isLoading = false
        } catch {
            isLoading = false
            self.error = error.localizedDescription
        }
    }

    private func toggleService(_ service: TechnicianService) async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            try await APIClient.shared.requestVoid(.toggleService(id: service.id))
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func deleteService(_ service: TechnicianService) async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            try await APIClient.shared.requestVoid(.deleteService(id: service.id))
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Edit Service View

struct EditServiceView: View {
    let service: TechnicianService?
    let onSave: () async -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var description = ""
    @State private var price = ""
    @State private var duration = 60
    @State private var category = "basic_care"
    @State private var busy = false
    @State private var error: String?

    private let categories = [
        ("basic_care", "基础护理"),
        ("color_style", "色彩款式"),
        ("extension_reinforcement", "延长加固"),
        ("removal", "卸甲")
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Name
                    VStack(alignment: .leading, spacing: 6) {
                        Text("服务名称 *")
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.muted)
                        TextField("例：法式美甲", text: $name)
                            .font(.system(size: 15))
                            .frame(height: 44)
                            .padding(.horizontal, 12)
                            .background(NBColors.page)
                            .cornerRadius(7)
                    }

                    // Category
                    VStack(alignment: .leading, spacing: 6) {
                        Text("分类")
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.muted)
                        Picker("分类", selection: $category) {
                            ForEach(categories, id: \.0) { cat in
                                Text(cat.1).tag(cat.0)
                            }
                        }
                        .pickerStyle(.segmented)
                    }

                    // Price & Duration
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("服务价格（元）*")
                                .font(.system(size: 14))
                                .foregroundColor(NBColors.muted)
                            TextField("例如 168", text: $price)
                                .font(.system(size: 15))
                                .keyboardType(.decimalPad)
                                .frame(height: 44)
                                .padding(.horizontal, 12)
                                .background(NBColors.page)
                                .cornerRadius(7)
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("预计时长（分钟）*")
                                .font(.system(size: 14))
                                .foregroundColor(NBColors.muted)
                            TextField("60", value: $duration, format: .number)
                                .font(.system(size: 15))
                                .keyboardType(.numberPad)
                                .frame(height: 44)
                                .padding(.horizontal, 12)
                                .background(NBColors.page)
                                .cornerRadius(7)
                        }
                    }

                    Text("客户预约时可多选服务，系统会按这里的价格自动累加。")
                        .font(.system(size: 12))
                        .foregroundColor(NBColors.muted)
                        .lineSpacing(1.4)

                    // Description
                    VStack(alignment: .leading, spacing: 6) {
                        Text("描述（选填）")
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.muted)
                        TextEditor(text: $description)
                            .font(.system(size: 15))
                            .frame(minHeight: 80)
                            .padding(8)
                            .background(NBColors.page)
                            .cornerRadius(7)
                    }

                    if let error {
                        Text(error)
                            .font(.system(size: 14))
                            .foregroundColor(.red)
                    }

                    // Save button
                    Button {
                        Task { await save() }
                    } label: {
                        HStack {
                            if busy {
                                ProgressView()
                                    .tint(.white)
                            }
                            Text(busy ? "保存中..." : "保存")
                                .font(.system(size: 16, weight: .semibold))
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .foregroundColor(.white)
                        .background(name.isEmpty || price.isEmpty ? NBColors.muted : NBColors.action)
                        .cornerRadius(10)
                    }
                    .disabled(busy || name.isEmpty || price.isEmpty)
                }
                .padding(16)
            }
            .background(NBColors.page)
            .navigationTitle(service == nil ? "添加服务" : "编辑服务")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("关闭") { dismiss() }
                        .disabled(busy)
                }
            }
            .onAppear {
                name = service?.name ?? ""
                description = service?.description ?? ""
                price = service?.price.map { String(format: "%.0f", $0) } ?? ""
                duration = service?.durationMinutes ?? 60
                category = service?.category ?? "basic_care"
            }
        }
    }

    private func save() async {
        guard !busy else { return }
        guard !name.trimmingCharacters(in: .whitespaces).isEmpty,
              let priceValue = Double(price) else {
            error = "请填写服务名称和有效价格"
            return
        }
        busy = true
        defer { busy = false }

        let body: [String: Any] = [
            "name": name,
            "description": description,
            "price": priceValue,
            "durationMinutes": duration,
            "category": category
        ]

        do {
            try await APIClient.shared.requestVoid(
                service.map { .updateService(id: $0.id, params: body) } ?? .createService(params: body)
            )
            await onSave()
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        TechnicianServicesView()
    }
}
