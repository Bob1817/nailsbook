import SwiftUI

struct BookingService: Decodable, Identifiable {
    let id: String
    let name: String
    let durationMinutes: Int
    let price: Price
    struct Price: Decodable { let min: Double?; let max: Double? }
}

/// 美甲师冻结时段（已预约/占用）
struct BlockedSlot: Decodable {
    let orderId: Int?
    let startTime: String
    let endTime: String
}

/// 公开服务列表分页包装（GET /public/brands/:id/services 返回 { items, pagination, attribution }）
struct BookingServicePage: Decodable {
    let items: [BookingService]
}

/// 可选日期（今天起 N 天）
struct BookingDate: Identifiable {
    let dateStr: String
    let day: Int
    let weekdayLabel: String
    var id: String { dateStr }

    static func today() -> BookingDate { BookingDate(offset: 0)! }

    init?(offset: Int) {
        let date = Calendar.current.date(byAdding: .day, value: offset, to: Date())!
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Asia/Shanghai")
        formatter.dateFormat = "yyyy-MM-dd"
        dateStr = formatter.string(from: date)
        day = Calendar.current.component(.day, from: date)
        let weekdays = ["日", "一", "二", "三", "四", "五", "六"]
        let weekday = weekdays[Calendar.current.component(.weekday, from: date) - 1]
        weekdayLabel = offset == 0 ? "今天" : "周\(weekday)"
    }
}

struct CreateOrderView: View {
    let techId: Int
    let techName: String
    var prefillRemark: String = ""
    /// 作品同款预约：以该作品为预约服务内容（对齐 wxapp create-order?workId= 场景）
    var sourceWork: NailWork?
    @Environment(\.dismiss) private var dismiss
    @State private var services: [BookingService] = []
    @State private var shops: [BookingShop] = []
    @State private var selectedServices: Set<String> = Set()
    @State private var shopName = ""
    @State private var serviceDate: String = BookingDate.today().dateStr
    @State private var startTime = ""
    @State private var blockedSlots: [BlockedSlot] = []
    @State private var custom = false
    @State private var title = ""
    @State private var remark: String

    init(techId: Int, techName: String, prefillRemark: String = "", sourceWork: NailWork? = nil) {
        self.techId = techId
        self.techName = techName
        self.prefillRemark = prefillRemark
        self.sourceWork = sourceWork
        _remark = State(initialValue: prefillRemark)
    }
    @State private var busy = false
    @State private var loaded = false
    @State private var error: String?
    @State private var lastSubmission: Data?
    @State private var applicationKey = UUID().uuidString

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if let error {
                    errorBanner(error)
                }
                if !loaded && busy {
                    ProgressView().frame(maxWidth: .infinity).padding(40)
                } else if !loaded {
                    Button("重新加载") { Task { await load() } }
                        .font(.system(size: 14, weight: .medium))
                        .frame(maxWidth: .infinity, minHeight: 44)
                } else {
                    // 来源作品（预约同款）
                    if let work = sourceWork {
                        sectionCard {
                            sectionHead(title: "预约同款作品", sub: "服务项目与价格来自该作品")
                            sourceWorkCard(work)
                        }
                    }

                    // 服务内容
                    sectionCard {
                        sectionHead(
                            title: sourceWork != nil ? "服务项目" : "选择服务 · 可多选",
                            sub: sourceWork != nil ? "根据同款作品读取，不可修改" : nil
                        )
                        if let work = sourceWork {
                            workServiceLines(work)
                        } else {
                            serviceSelection
                        }
                    }

                    // 时间（对齐 wxapp booking-time-picker：横向日期条 + 时段网格）
                    sectionCard {
                        sectionHead(title: "选择时间", sub: "先申请时间，美甲师确认后生效")
                        bookingTimePicker
                    }

                    // 门店（服务形式）
                    sectionCard {
                        sectionHead(
                            title: "服务形式",
                            sub: shops.count == 1 ? "当前美甲师仅有 1 个可用门店" : "单选 · 请选择到店门店"
                        )
                        shopList
                    }

                    // 补充说明（对齐 wxapp：独立 section，位于服务形式下方）
                    sectionCard {
                        sectionHead(title: "补充说明")
                        remarkField(placeholder: "请填写预约备注，如款式偏好、特殊需求等")
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 120)
        }
        .background(NBColors.page)
        .navigationTitle("新建预约")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        .disabled(busy)
        .task { await load() }
        // 提交栏（对齐 wxapp submit-bar：底部固定 + 价格列 + 提交按钮）
        .safeAreaInset(edge: .bottom) {
            if loaded {
                submitBar
            }
        }
    }

    // MARK: - UI Blocks（对齐 wxapp create-order 分区卡片设计）

    private func errorBanner(_ message: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.circle.fill")
                .font(.system(size: 14))
                .foregroundColor(NBColors.money)
            Text(message)
                .font(.system(size: 12))
                .foregroundColor(NBColors.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(12)
        .background(Color.white)
        .cornerRadius(12)
    }

    private func sectionCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .cornerRadius(12)
    }

    private func sectionHead(title: String, sub: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(NBColors.ink)
            if let sub {
                Text(sub)
                    .font(.system(size: 11))
                    .foregroundColor(NBColors.muted)
            }
        }
    }

    /// 作品服务线 + 组合价格（对齐 wxapp work-service-grid / work-service-summary）
    private func workServiceLines(_ work: NailWork) -> some View {
        let lines = work.serviceLines ?? []
        return VStack(alignment: .leading, spacing: 10) {
            if lines.isEmpty {
                Text("该作品尚未配置服务项目，价格由美甲师确认")
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.muted)
            } else {
                // 服务线卡片
                VStack(spacing: 8) {
                    ForEach(lines) { line in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(alignment: .firstTextBaseline) {
                                Text(line.nameSnapshot)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(NBColors.ink)
                                    .lineLimit(1)
                                Spacer()
                                Text("¥\(line.subtotalFen / 100)")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(NBColors.money)
                            }
                            HStack(spacing: 10) {
                                Text("× \(line.quantity)")
                                Text("约 \(line.durationMinutes * line.quantity) 分钟")
                            }
                            .font(.system(size: 11))
                            .foregroundColor(NBColors.muted)
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(NBColors.page)
                        .cornerRadius(10)
                    }
                }

                // 组合价格汇总
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("组合价格")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(NBColors.secondary)
                        Text("\(lines.count) 类服务 · 约 \(work.totalDurationMinutes ?? lines.reduce(0) { $0 + $1.durationMinutes * $1.quantity }) 分钟")
                            .font(.system(size: 10))
                            .foregroundColor(NBColors.muted)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        // 服务小计与标准价不一致时展示原价删除线
                        let subtotalFen = work.serviceSubtotalFen ?? lines.reduce(0) { $0 + $1.subtotalFen }
                        let standardFen = work.standardPriceFen
                        if let std = standardFen, std != subtotalFen {
                            Text("¥\(subtotalFen / 100)")
                                .font(.system(size: 11))
                                .strikethrough()
                                .foregroundColor(NBColors.muted)
                            Text("¥\(std / 100)")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(NBColors.money)
                        } else {
                            Text("¥\(subtotalFen / 100)")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(NBColors.money)
                        }
                    }
                }
                .padding(12)
                .background(NBColors.page)
                .cornerRadius(10)
            }
        }
    }

    private func sourceWorkCard(_ work: NailWork) -> some View {
        HStack(spacing: 12) {
            if let cover = work.coverUrl, let url = URL(string: cover) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle().fill(NBColors.page)
                }
                .frame(width: 72, height: 72)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(work.title ?? "同款作品")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(NBColors.ink)
                    .lineLimit(1)
                if let price = work.displayPrice {
                    Text(price)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(NBColors.money)
                }
                Text("提交后由美甲师确认排期")
                    .font(.system(size: 11))
                    .foregroundColor(NBColors.muted)
            }
            Spacer()
        }
    }

    private var serviceSelection: some View {
        VStack(spacing: 10) {
            // 自定义开关（对齐 wxapp 自定义需求表单）
            Toggle(isOn: $custom) {
                Text("自定义需求")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.ink)
            }
            .tint(NBColors.ink)

            if custom {
                VStack(spacing: 10) {
                    TextField("例如：法式渐变美甲", text: $title)
                        .font(.system(size: 14))
                        .padding(.horizontal, 12)
                        .frame(height: 44)
                        .background(NBColors.page)
                        .cornerRadius(10)
                }
            } else {
                // 服务卡片多选（对齐 wxapp service-card）
                VStack(spacing: 10) {
                    ForEach(services) { service in
                        let selected = selectedServices.contains(service.id)
                        Button {
                            if selected { selectedServices.remove(service.id) }
                            else { selectedServices.insert(service.id) }
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                                    .font(.system(size: 18))
                                    .foregroundColor(selected ? NBColors.ink : NBColors.muted)
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(service.name)
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(NBColors.ink)
                                    Text("\(service.durationMinutes) 分钟")
                                        .font(.system(size: 11))
                                        .foregroundColor(NBColors.muted)
                                }
                                Spacer()
                                Text("¥\(service.price.min ?? 0, specifier: "%.0f")")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(NBColors.money)
                            }
                            .padding(12)
                            .background(selected ? NBColors.ink.opacity(0.05) : NBColors.page)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .strokeBorder(selected ? NBColors.ink : Color.clear, lineWidth: 1.5)
                            )
                            .cornerRadius(10)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    // MARK: - Booking Time Picker（对齐 wxapp booking-time-picker horizontal 模式）

    /// 可选日期窗口：今天起 14 天
    private var bookingDays: [BookingDate] {
        (0..<14).compactMap { BookingDate(offset: $0) }
    }

    /// 时段网格：10:00–20:30，每 30 分钟
    private var timeSlots: [String] {
        (20...41).map { slot in
            String(format: "%02d:%02d", slot / 2, slot % 2 == 0 ? 0 : 30)
        }
    }

    private var bookingTimePicker: some View {
        VStack(alignment: .leading, spacing: 12) {
            // 横向日期条
            Text("选择日期")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(NBColors.secondary)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(bookingDays) { day in
                        let selected = serviceDate == day.dateStr
                        Button {
                            if serviceDate != day.dateStr {
                                serviceDate = day.dateStr
                                startTime = ""
                            }
                        } label: {
                            VStack(spacing: 3) {
                                Text(day.weekdayLabel)
                                    .font(.system(size: 10))
                                    .foregroundColor(selected ? .white : NBColors.muted)
                                Text("\(day.day)")
                                    .font(.system(size: 17, weight: .bold))
                                    .foregroundColor(selected ? .white : NBColors.ink)
                            }
                            .frame(width: 52, height: 60)
                            .background(selected ? NBColors.ink : NBColors.page)
                            .cornerRadius(10)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 2)
            }

            // 时段网格
            Text("选择时间段")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(NBColors.secondary)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                ForEach(timeSlots, id: \.self) { slot in
                    let state = slotState(slot)
                    Button {
                        startTime = slot
                    } label: {
                        VStack(spacing: 2) {
                            Text(slot)
                                .font(.system(size: 12, weight: startTime == slot ? .semibold : .regular))
                            if state == .occupied {
                                Text("已预约")
                                    .font(.system(size: 8))
                            } else if state == .past {
                                Text("已过时")
                                    .font(.system(size: 8))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(minHeight: 40)
                        .foregroundColor(startTime == slot ? .white : state == .available ? NBColors.ink : NBColors.muted)
                        .background(startTime == slot ? NBColors.ink : NBColors.page)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .strokeBorder(startTime == slot ? NBColors.ink : Color.clear, lineWidth: 1.5)
                        )
                        .cornerRadius(8)
                        .opacity(state == .available || startTime == slot ? 1 : 0.55)
                    }
                    .buttonStyle(.plain)
                    .disabled(state != .available)
                }
            }
        }
    }

    private enum SlotState { case available, past, occupied }

    private func slotState(_ slot: String) -> SlotState {
        let slotDate = serviceDate + " " + slot
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Asia/Shanghai")
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        guard let slotTime = formatter.date(from: slotDate) else { return .available }
        // 已过时（当天时段早于当前时间 + 30 分钟缓冲）
        if slotTime < Date().addingTimeInterval(1800) { return .past }
        // 已预约：与冻结时段重叠
        for blocked in blockedSlots {
            let iso = ISO8601DateFormatter()
            iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let isoAlt = ISO8601DateFormatter()
            guard let start = iso.date(from: blocked.startTime) ?? isoAlt.date(from: blocked.startTime),
                  let end = iso.date(from: blocked.endTime) ?? isoAlt.date(from: blocked.endTime) else { continue }
            if slotTime >= start && slotTime < end { return .occupied }
        }
        return .available
    }

    private func remarkField(placeholder: String) -> some View {
        TextField(placeholder, text: $remark, axis: .vertical)
            .font(.system(size: 13))
            .lineLimit(3...5)
            .padding(12)
            .background(NBColors.page)
            .cornerRadius(10)
    }

    private var shopList: some View {
        VStack(spacing: 10) {
            if shops.isEmpty {
                Text("该美甲师暂未配置可用门店")
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.muted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else {
                ForEach(shops) { shop in
                    let selected = shopName == shop.name
                    Button {
                        shopName = shop.name
                    } label: {
                        HStack(alignment: .top, spacing: 10) {
                            // radio 圆点（对齐 wxapp service-option-radio）
                            ZStack {
                                Circle()
                                    .strokeBorder(selected ? NBColors.ink : NBColors.muted.opacity(0.5), lineWidth: 1.5)
                                    .frame(width: 18, height: 18)
                                if selected {
                                    Circle()
                                        .fill(NBColors.ink)
                                        .frame(width: 9, height: 9)
                                }
                            }
                            .padding(.top, 2)

                            VStack(alignment: .leading, spacing: 3) {
                                Text(shop.name)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(NBColors.ink)
                                Text(shop.address)
                                    .font(.system(size: 11))
                                    .foregroundColor(NBColors.muted)
                                    .lineLimit(2)
                            }
                            Spacer()
                        }
                        .padding(12)
                        .background(selected ? NBColors.ink.opacity(0.05) : NBColors.page)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .strokeBorder(selected ? NBColors.ink : Color.clear, lineWidth: 1.5)
                        )
                        .cornerRadius(10)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    /// 底部提交栏：价格汇总 + 提交按钮（对齐 wxapp submit-bar）
    private var submitBar: some View {
        HStack(spacing: 12) {
            // 价格列
            VStack(alignment: .leading, spacing: 2) {
                if sourceWork != nil {
                    if let price = sourceWork?.displayPrice {
                        Text(price)
                            .font(.system(size: 17, weight: .bold))
                            .foregroundColor(NBColors.ink)
                    }
                    Text("提交后由美甲师确认排期，款项在线下支付")
                        .font(.system(size: 10))
                        .foregroundColor(NBColors.muted)
                } else if custom {
                    Text("提交需求")
                        .font(.system(size: 11))
                        .foregroundColor(NBColors.muted)
                } else {
                    let total = services
                        .filter { selectedServices.contains($0.id) }
                        .reduce(0.0) { $0 + ($1.price.min ?? 0) }
                    Text("¥\(total, specifier: "%.0f")")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(NBColors.ink)
                    Text("已选 \(selectedServices.count) 项服务")
                        .font(.system(size: 10))
                        .foregroundColor(NBColors.muted)
                }
            }

            Spacer()

            // 提交按钮
            Button {
                Task { await submit() }
            } label: {
                HStack(spacing: 6) {
                    if busy { ProgressView().tint(.white) }
                    Text(sourceWork != nil ? "确认预约" : custom ? "提交需求" : "提交预约申请")
                        .font(.system(size: 14, weight: .semibold))
                }
                .foregroundColor(.white)
                .frame(minWidth: 120)
                .frame(height: 44)
                .background(
                    canSubmit ? NBColors.action : NBColors.muted.opacity(0.4)
                )
                .cornerRadius(22)
            }
            .disabled(!canSubmit)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) { Divider().opacity(0.5) }
    }

    private var canSubmit: Bool {
        !busy && loaded && !shopName.isEmpty && !startTime.isEmpty && !contentInvalid
    }

    /// 服务内容校验：作品模式下由作品承载内容；普通模式需选服务或填自定义标题
    private var contentInvalid: Bool {
        if sourceWork != nil { return false }
        return custom ? title.trimmingCharacters(in: .whitespaces).isEmpty : selectedServices.isEmpty
    }

    private func load() async {
        busy = true
        defer { busy = false }
        do {
            let me: ClientUser = try await APIClient.shared.request(.clientMe)
            guard let tech = me.technicians?.first(where: { $0.id == techId }) else {
                error = "请先绑定这位美甲师"; return
            }
            shops = (tech.shopAddresses ?? []).filter { $0.enabled != false }
            let servicePage: BookingServicePage = try await APIClient.shared.request(.publicResource(path: "brands/\(techId)/services?pageSize=50"))
            services = servicePage.items
            if shops.count == 1 { shopName = shops[0].name }
            // 冻结时段（已预约时间置灰）
            if let slots: [BlockedSlot] = try? await APIClient.shared.request(.blockedSlots(techId: techId)) {
                blockedSlots = slots
            }
            loaded = true
            error = shops.isEmpty ? "美甲师尚未开放到店预约" : nil
        } catch { self.error = error.localizedDescription }
    }

    private func submit() async {
        guard !busy, loaded, !shopName.isEmpty, !startTime.isEmpty else { return }
        busy = true
        defer { busy = false }
        var body: [String: Any] = ["techId": techId, "serviceDate": serviceDate, "startTime": startTime,
                                   "serviceType": "到店美甲", "shopAddress": ["name": shopName],
                                   "applicationKey": applicationKey, "remark": remark]
        if custom { body["customTitle"] = title; body["customDescription"] = remark }
        else { body["selectedServiceIds"] = Array(selectedServices).sorted() }
        if let work = sourceWork { body["sourceWorkId"] = work.id }
        do {
            var fingerprint = body
            fingerprint.removeValue(forKey: "applicationKey")
            let encoded = try JSONSerialization.data(withJSONObject: fingerprint, options: .sortedKeys)
            if let previous = lastSubmission, previous != encoded {
                applicationKey = UUID().uuidString
                body["applicationKey"] = applicationKey
            }
            lastSubmission = encoded
            try await APIClient.shared.requestVoid(.createClientOrder(params: body))
            dismiss()
        } catch { self.error = error.localizedDescription }
    }
}
