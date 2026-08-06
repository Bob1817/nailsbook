import SwiftUI

// MARK: - Customers List

struct TechnicianCustomersView: View {
    @State private var customers: [Customer] = []
    @State private var isLoading = true
    @State private var searchText = ""

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    NBLoadingView()
                } else if customers.isEmpty {
                    NBEmptyState(icon: "person.2", title: "暂无客户", message: "客户将在产生订单后自动创建")
                } else {
                    List(filteredCustomers) { customer in
                        NavigationLink(destination: TechCustomerDetailView(customerId: customer.id)) {
                            CustomerRow(customer: customer)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("客户管理")
            .searchable(text: $searchText, prompt: "搜索客户姓名或手机号")
            .background(Color.nbBg)
            .task { await loadCustomers() }
            .refreshable { await loadCustomers() }
        }
    }

    private var filteredCustomers: [Customer] {
        if searchText.isEmpty { return customers }
        return customers.filter {
            ($0.name ?? "").localizedCaseInsensitiveContains(searchText) ||
            ($0.phone ?? "").contains(searchText)
        }
    }

    private func loadCustomers() async {
        do {
            customers = try await APIClient.shared.request(.customers(search: nil, tags: nil))
            isLoading = false
        } catch { isLoading = false }
    }
}

struct CustomerRow: View {
    let customer: Customer

    var body: some View {
        HStack(spacing: Spacing.md) {
            Circle()
                .fill(Color.nbPrimarySoft)
                .frame(width: 44, height: 44)
                .overlay(
                    Text(String(customer.name?.first ?? "?"))
                        .font(NBFont.titleMedium)
                        .foregroundColor(.nbPrimary)
                )

            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack {
                    Text(customer.name ?? "未命名")
                        .font(NBFont.bodyLarge)
                        .foregroundColor(.nbTextPrimary)
                    if let tags = customer.tags, !tags.isEmpty {
                        ForEach(tags.prefix(2), id: \.self) { tag in
                            NBChip(title: tag, color: .nbInfo)
                        }
                    }
                }
                if let phone = customer.phone {
                    Text(phone)
                        .font(NBFont.captionLarge)
                        .foregroundColor(.nbTextSecondary)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                if let count = customer.orderCount {
                    Text("\(count)单")
                        .font(NBFont.captionLarge)
                        .foregroundColor(.nbTextSecondary)
                }
                if let spent = customer.totalSpent, spent > 0 {
                    Text("¥\(String(format: "%.0f", spent))")
                        .font(NBFont.captionMedium)
                        .foregroundColor(.nbPrimary)
                }
            }
        }
        .padding(.vertical, Spacing.xs)
        .listRowBackground(Color.nbSurface)
    }
}

// MARK: - Customer Detail

struct TechCustomerDetailView: View {
    let customerId: Int
    @State private var customer: Customer?
    @State private var isLoading = true
    @State private var showTagEditor = false
    @State private var editTags: [String] = []
    @State private var newTag = ""

    var body: some View {
        ScrollView {
            if let customer = customer {
                VStack(spacing: Spacing.lg) {
                    // Profile header
                    NBCard {
                        HStack(spacing: Spacing.lg) {
                            Circle()
                                .fill(Color.nbPrimarySoft)
                                .frame(width: 64, height: 64)
                                .overlay(
                                    Text(String(customer.name?.first ?? "?"))
                                        .font(NBFont.displaySmall)
                                        .foregroundColor(.nbPrimary)
                                )
                            VStack(alignment: .leading, spacing: Spacing.xs) {
                                Text(customer.name ?? "未命名")
                                    .font(NBFont.titleLarge)
                                    .foregroundColor(.nbTextPrimary)
                                if let phone = customer.phone {
                                    Text(phone)
                                        .font(NBFont.bodyMedium)
                                        .foregroundColor(.nbTextSecondary)
                                }
                                if let count = customer.orderCount {
                                    Text("累计 \(count) 单")
                                        .font(NBFont.captionLarge)
                                        .foregroundColor(.nbTextTertiary)
                                }
                            }
                            Spacer()
                        }
                    }

                    // Tags
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            HStack {
                                Text("标签")
                                    .font(NBFont.titleSmall)
                                Spacer()
                                Button {
                                    editTags = customer.tags ?? []
                                    showTagEditor = true
                                } label: {
                                    Text("编辑")
                                        .font(NBFont.captionLarge)
                                        .foregroundColor(.nbPrimary)
                                }
                            }
                            if let tags = customer.tags, !tags.isEmpty {
                                FlowLayout(spacing: Spacing.sm) {
                                    ForEach(tags, id: \.self) { tag in
                                        NBChip(title: tag)
                                    }
                                }
                            } else {
                                Text("暂无标签")
                                    .font(NBFont.bodyMedium)
                                    .foregroundColor(.nbTextTertiary)
                            }
                        }
                    }

                    // Stats
                    HStack(spacing: Spacing.md) {
                        statCard("累计消费", value: "¥\(String(format: "%.0f", customer.totalSpent ?? 0))")
                        statCard("订单数", value: "\(customer.orderCount ?? 0)")
                    }
                    .padding(.horizontal, Spacing.lg)

                    // Notes
                    if let notes = customer.notes, !notes.isEmpty {
                        NBCard {
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                Text("备注")
                                    .font(NBFont.titleSmall)
                                Text(notes)
                                    .font(NBFont.bodyMedium)
                                    .foregroundColor(.nbTextSecondary)
                            }
                        }
                    }
                }
                .padding(Spacing.lg)
            }
        }
        .navigationTitle("客户详情")
        .navigationBarTitleDisplayMode(.inline)
        .background(Color.nbBg)
        .task { await loadCustomer() }
        .sheet(isPresented: $showTagEditor) { tagEditorSheet }
    }

    private func statCard(_ title: String, value: String) -> some View {
        NBCard {
            VStack(spacing: Spacing.xs) {
                Text(value)
                    .font(NBFont.titleLarge)
                    .foregroundColor(.nbPrimary)
                Text(title)
                    .font(NBFont.captionLarge)
                    .foregroundColor(.nbTextSecondary)
            }
            .frame(maxWidth: .infinity)
        }
    }

    private var tagEditorSheet: some View {
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                HStack {
                    NBTextField(placeholder: "新标签", text: $newTag)
                    Button {
                        if !newTag.isEmpty {
                            editTags.append(newTag)
                            newTag = ""
                        }
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.nbPrimary)
                    }
                }
                .padding(.horizontal, Spacing.lg)

                ForEach(editTags.indices, id: \.self) { index in
                    HStack {
                        Text(editTags[index])
                            .font(NBFont.bodyMedium)
                        Spacer()
                        Button {
                            editTags.remove(at: index)
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.nbTextTertiary)
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, Spacing.sm)
                }
                Spacer()
            }
            .padding(.top, Spacing.lg)
            .navigationTitle("编辑标签")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color.nbBg)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { showTagEditor = false }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("保存") { Task { await saveTags() } }
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func loadCustomer() async {
        do {
            customer = try await APIClient.shared.request(.customerDetail(id: customerId))
            isLoading = false
        } catch { isLoading = false }
    }

    private func saveTags() async {
        do {
            _ = try await APIClient.shared.requestVoid(.updateCustomerTags(id: customerId, tags: editTags))
            showTagEditor = false
            await loadCustomer()
        } catch {}
    }
}
