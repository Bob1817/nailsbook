import SwiftUI

// MARK: - Technician Customers (aligned with wxapp design)

struct TechnicianCustomersView: View {
    @State private var customers: [Customer] = []
    @State private var isLoading = true
    @State private var searchText = ""
    @State private var selectedLifecycle = "all"
    @State private var selectedTag: String?
    @State private var profile: TechnicianProfile?
    @State private var showInviteCopied = false

    private let lifecycleTabs = [
        ("all", "全部"),
        ("new", "新客"),
        ("active", "活跃"),
        ("due", "待复购"),
        ("dormant", "沉睡")
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Header
            headerSection

            // Customer list
            if isLoading {
                skeletonList
            } else if filteredCustomers.isEmpty {
                emptyView
            } else {
                customerList
            }
        }
        .background(NBColors.page)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("客户")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(NBColors.ink)
            }
        }
        .task { await loadCustomers(); await loadProfile() }
        .refreshable { await loadCustomers() }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: 8) {
            // Search bar + Invite button
            HStack(spacing: 6) {
                HStack(spacing: 7) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.muted)

                    TextField("搜索姓名或联系方式", text: $searchText)
                        .font(.system(size: 14))

                    if !searchText.isEmpty {
                        Button {
                            searchText = ""
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 12))
                                .foregroundColor(NBColors.muted)
                                .frame(width: 32, height: 32)
                        }
                    }
                }
                .frame(height: 44)
                .padding(.horizontal, 13)
                .background(NBColors.softSurface)
                .cornerRadius(Radius.input)

                Button {
                    if let code = profile?.invitationCode, !code.isEmpty {
                        UIPasteboard.general.string = code
                        showInviteCopied = true
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                            .font(.system(size: 14))
                        Text("邀请")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundColor(NBColors.action)
                    .frame(height: 44)
                    .padding(.horizontal, 11)
                    .background(NBColors.softSurface)
                    .cornerRadius(Radius.lg)
                }
                .alert("邀请码已复制", isPresented: $showInviteCopied) {
                    Button("确定", role: .cancel) {}
                } message: {
                    Text("邀请码：\(profile?.invitationCode ?? "")\n分享给客户即可绑定")
                }
            }
            .padding(.horizontal, 16)

            // Lifecycle tabs
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    ForEach(lifecycleTabs, id: \.0) { tab in
                        Button {
                            selectedLifecycle = tab.0
                        } label: {
                            Text(tab.1)
                                .font(.system(size: 14, weight: selectedLifecycle == tab.0 ? .bold : .medium))
                                .foregroundColor(selectedLifecycle == tab.0 ? NBColors.action : NBColors.muted)
                                .frame(height: 38)
                                .padding(.horizontal, 12)
                                .background(selectedLifecycle == tab.0 ? NBColors.page : Color.clear)
                                .cornerRadius(999)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.vertical, 8)
        .background(Color.white)
    }

    // MARK: - Customer List

    private var customerList: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                ForEach(filteredCustomers) { customer in
                    NavigationLink(destination: TechCustomerDetailView(customerId: customer.id)) {
                        customerCard(customer)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 20)
        }
    }

    private func customerCard(_ customer: Customer) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header: avatar + name + lifecycle + arrow
            HStack(spacing: 10) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(NBColors.page)
                        .frame(width: 52, height: 52)
                    Text(String(customer.name?.first ?? "?"))
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(NBColors.ink)
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(customer.name ?? "未命名")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(NBColors.ink)
                            .lineLimit(1)

                        // Lifecycle badge
                        Text(lifecycleLabel(customer))
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(lifecycleColor(customer))
                            .padding(.horizontal, 7)
                            .padding(.vertical, 2)
                            .background(lifecycleColor(customer).opacity(0.1))
                            .cornerRadius(999)
                    }

                    HStack(spacing: 4) {
                        Image(systemName: "mappin")
                            .font(.system(size: 10))
                        Text("暂无地址")
                            .font(.system(size: 12))
                    }
                    .foregroundColor(NBColors.muted)
                    .lineLimit(1)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.control)
            }

            // Status
            HStack(spacing: 6) {
                Circle()
                    .fill(lifecycleColor(customer))
                    .frame(width: 6, height: 6)
                Text(lifecycleReason(customer))
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.ink)
                Spacer()
            }
            .padding(10)
            .background(lifecycleColor(customer).opacity(0.08))
            .cornerRadius(7)
            .padding(.top, 10)

            // Tags
            if let tags = customer.tags, !tags.isEmpty {
                HStack(spacing: 5) {
                    ForEach(tags.prefix(3), id: \.self) { tag in
                        Text(tag)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(NBColors.ink)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(NBColors.page)
                            .cornerRadius(7)
                    }
                }
                .padding(.top, 10)
            }

            // Stats
            HStack(spacing: 0) {
                VStack(spacing: 2) {
                    Text("累计消费")
                        .font(.system(size: 11))
                        .foregroundColor(NBColors.muted)
                    Text("¥\(String(format: "%.0f", customer.totalSpent ?? 0))")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(NBColors.action)
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 2) {
                    Text("服务次数")
                        .font(.system(size: 11))
                        .foregroundColor(NBColors.muted)
                    Text("\(customer.orderCount ?? 0) 次")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(NBColors.ink)
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 2) {
                    Text("最近服务")
                        .font(.system(size: 11))
                        .foregroundColor(NBColors.muted)
                    Text(formatLastOrder(customer.lastOrderAt))
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(NBColors.ink)
                }
                .frame(maxWidth: .infinity)
            }
            .padding(.vertical, 12)
        }
        .padding(12)
        .background(Color.white)
        .cornerRadius(Radius.lg)
        .shadow(color: Color.black.opacity(0.05), radius: 10, y: 2)
    }

    // MARK: - Skeleton List

    private var skeletonList: some View {
        ScrollView {
            VStack(spacing: 10) {
                ForEach(0..<3, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: Radius.lg)
                        .fill(NBColors.page)
                        .frame(height: 140)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
        }
    }

    // MARK: - Empty View

    private var emptyView: some View {
        VStack(spacing: 12) {
            Spacer()

            ZStack {
                Circle()
                    .fill(NBColors.page)
                    .frame(width: 56, height: 56)
                ZStack {
                    Circle()
                        .fill(NBColors.action)
                        .frame(width: 21, height: 21)
                    RoundedRectangle(cornerRadius: 7)
                        .fill(NBColors.action)
                        .frame(width: 28, height: 14)
                        .offset(y: 18)
                }
            }

            Text(searchText.isEmpty ? "还没有客户" : "没有找到匹配的客户")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)

            Text(searchText.isEmpty ? "客户预约后会自动出现在这里" : "换个关键词、生命周期或标签试试")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)

            Spacer()
        }
        .padding(.horizontal, 20)
    }

    // MARK: - Computed Properties

    private var filteredCustomers: [Customer] {
        customers.filter { customer in
            // Search filter
            if !searchText.isEmpty {
                let nameMatch = (customer.name ?? "").localizedCaseInsensitiveContains(searchText)
                let phoneMatch = (customer.phone ?? "").contains(searchText)
                if !nameMatch && !phoneMatch { return false }
            }

            // Lifecycle filter
            if selectedLifecycle != "all" {
                let lifecycle = customerLifecycle(customer)
                if lifecycle != selectedLifecycle { return false }
            }

            return true
        }
    }

    // MARK: - Helpers

    private func customerLifecycle(_ customer: Customer) -> String {
        // Simplified lifecycle logic
        if customer.orderCount == 0 { return "new" }
        if customer.orderCount ?? 0 >= 3 { return "active" }
        return "new"
    }

    private func lifecycleLabel(_ customer: Customer) -> String {
        switch customerLifecycle(customer) {
        case "new": return "新客"
        case "active": return "活跃"
        case "due": return "待复购"
        case "dormant": return "沉睡"
        default: return "新客"
        }
    }

    private func lifecycleColor(_ customer: Customer) -> Color {
        switch customerLifecycle(customer) {
        case "new": return NBColors.muted
        case "active": return NBColors.success
        case "due": return NBColors.warning
        case "dormant": return NBColors.muted
        default: return NBColors.muted
        }
    }

    private func lifecycleReason(_ customer: Customer) -> String {
        switch customerLifecycle(customer) {
        case "new": return "新客户，等待首次服务"
        case "active": return "活跃客户"
        case "due": return "距离上次服务已有一段时间"
        case "dormant": return "长时间未消费"
        default: return "新客户"
        }
    }

    private func formatLastOrder(_ isoString: String?) -> String {
        guard let isoString = isoString else { return "暂无" }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return "暂无" }
        let f = DateFormatter()
        f.dateFormat = "MM/dd"
        return f.string(from: date)
    }

    // MARK: - Data Loading

    private func loadCustomers() async {
        do {
            customers = try await APIClient.shared.request(.customers(search: nil, tags: nil))
            isLoading = false
        } catch {
            isLoading = false
        }
    }

    private func loadProfile() async {
        do {
            profile = try await APIClient.shared.request(.technicianMe)
        } catch {}
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

    // Follow up
    @State private var followUpContent = ""
    @State private var followUpDate = Date()
    @State private var showFollowUpDatePicker = false
    @State private var savingFollowUp = false

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

                    // Follow Up Section
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("跟进记录")
                                .font(NBFont.titleSmall)

                            // Create follow up
                            VStack(spacing: Spacing.sm) {
                                TextField("输入跟进内容...", text: $followUpContent)
                                    .font(NBFont.bodyMedium)
                                    .padding(Spacing.md)
                                    .background(Color.nbSurfaceAlt)
                                    .cornerRadius(Radius.md)

                                HStack {
                                    Button {
                                        showFollowUpDatePicker = true
                                    } label: {
                                        HStack(spacing: Spacing.xs) {
                                            Image(systemName: "calendar")
                                                .font(.system(size: 14))
                                            Text(formatFollowUpDate(followUpDate))
                                                .font(NBFont.captionLarge)
                                        }
                                        .foregroundColor(.nbTextSecondary)
                                    }

                                    Spacer()

                                    Button {
                                        Task { await createFollowUp() }
                                    } label: {
                                        Text(savingFollowUp ? "保存中..." : "添加跟进")
                                            .font(NBFont.captionLarge)
                                            .fontWeight(.medium)
                                            .foregroundColor(.white)
                                            .padding(.horizontal, Spacing.md)
                                            .padding(.vertical, Spacing.sm)
                                            .background(followUpContent.isEmpty ? Color.nbTextTertiary : Color.nbPrimary)
                                            .cornerRadius(Radius.full)
                                    }
                                    .disabled(followUpContent.isEmpty || savingFollowUp)
                                }
                            }

                            // Follow up list
                            if let followUps = customer.followUps, !followUps.isEmpty {
                                Divider()
                                ForEach(followUps) { followUp in
                                    FollowUpRow(followUp: followUp) {
                                        Task { await completeFollowUp(followUp.id) }
                                    }
                                }
                            }
                        }
                    }

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
        .toolbar(.hidden, for: .tabBar)
        .navigationBarTitleDisplayMode(.inline)
        .background(Color.nbBg)
        .task { await loadCustomer() }
        .sheet(isPresented: $showTagEditor) { tagEditorSheet }
        .sheet(isPresented: $showFollowUpDatePicker) {
            NavigationStack {
                DatePicker("选择跟进日期", selection: $followUpDate, displayedComponents: .date)
                    .datePickerStyle(.graphical)
                    .padding()
                    .navigationTitle("跟进日期")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Button("确定") { showFollowUpDatePicker = false }
                        }
                    }
            }
            .presentationDetents([.medium])
        }
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

    private func createFollowUp() async {
        guard !followUpContent.isEmpty else { return }
        savingFollowUp = true
        do {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let plannedAt = formatter.string(from: followUpDate)
            _ = try await APIClient.shared.requestVoid(.createCustomerFollowUp(id: customerId, content: followUpContent, plannedAt: plannedAt))
            followUpContent = ""
            savingFollowUp = false
            await loadCustomer()
        } catch {
            savingFollowUp = false
        }
    }

    private func completeFollowUp(_ followUpId: Int) async {
        do {
            _ = try await APIClient.shared.requestVoid(.completeCustomerFollowUp(customerId: customerId, followUpId: followUpId))
            await loadCustomer()
        } catch {}
    }

    private func formatFollowUpDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy年M月d日"
        return formatter.string(from: date)
    }
}

// MARK: - Follow Up Row

struct FollowUpRow: View {
    let followUp: FollowUp
    let onComplete: () -> Void

    var body: some View {
        HStack(spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(followUp.content ?? "")
                    .font(NBFont.bodyMedium)
                    .foregroundColor(.nbTextPrimary)
                if let plannedAt = followUp.plannedAt {
                    Text(formatDate(plannedAt))
                        .font(NBFont.captionMedium)
                        .foregroundColor(.nbTextTertiary)
                }
            }
            Spacer()
            if followUp.status == "completed" {
                Text("已完成")
                    .font(NBFont.captionSmall)
                    .foregroundColor(.nbSuccess)
                    .padding(.horizontal, Spacing.xs)
                    .padding(.vertical, 2)
                    .background(Color.nbSuccessSoft)
                    .cornerRadius(Radius.sm)
            } else {
                Button {
                    onComplete()
                } label: {
                    Text("完成")
                        .font(NBFont.captionSmall)
                        .foregroundColor(.white)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(Color.nbPrimary)
                        .cornerRadius(Radius.sm)
                }
            }
        }
        .padding(.vertical, Spacing.xs)
    }

    private func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return "" }
        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "yyyy年M月d日"
        return displayFormatter.string(from: date)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        TechnicianCustomersView()
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        TechnicianCustomersView()
    }
}
