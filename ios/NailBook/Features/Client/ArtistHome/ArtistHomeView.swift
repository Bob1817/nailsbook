import SwiftUI

// MARK: - Artist Home View (client-facing profile page)

struct ArtistHomeView: View {
    let artistId: Int
    @State private var response: PublicArtistResponse?
    @State private var works: [NailWork] = []
    @State private var isFollowing = false
    @State private var isLoading = true
    @State private var error: String?
    @State private var showBindSheet = false
    @State private var bindCode = ""
    @State private var bindVerifiedName: String?
    @State private var bindError: String?
    @State private var bindLoading = false
    @State private var navigateToOrders = false

    private var artist: PublicArtistProfile? { response?.artist }

    var body: some View {
        ZStack {
            NBColors.page.ignoresSafeArea()

            if isLoading {
                loadingView
            } else if let artist = artist {
                artistContent(artist)
            } else {
                errorRetryView
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle("美甲师主页")
        .toolbar(.hidden, for: .tabBar)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    shareArtist()
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .foregroundColor(NBColors.ink)
                }
            }
        }
        .task { await loadData() }
    }

    // MARK: - Loading / Error

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView().scaleEffect(1.2)
            Text("加载中...").font(.system(size: 14)).foregroundColor(NBColors.muted)
        }
    }

    private var errorRetryView: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 40))
                .foregroundColor(NBColors.muted)
            Text("加载失败").font(.system(size: 18, weight: .semibold)).foregroundColor(NBColors.ink)
            Button("重新加载") { Task { await loadData() } }
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .frame(minHeight: 44)
                .background(NBColors.action)
                .cornerRadius(Radius.xl)
            Spacer()
        }
    }

    // MARK: - Main Content

    private func artistContent(_ artist: PublicArtistProfile) -> some View {
        ScrollView {
            VStack(spacing: 0) {
                heroBanner(artist)
                statsCard(artist)
                    .offset(y: -24)
                    .padding(.horizontal, 20)
                aboutSection(artist)
                worksSection
                servicesSection(artist)
                shopSection(artist)
                reviewsSection
                Spacer().frame(height: 100)
            }
        }
        .overlay(alignment: .bottom) { bottomBar(artist) }
        .sheet(isPresented: $showBindSheet) { bindSheet(artist) }
    }

    // MARK: - Hero Banner

    private func heroBanner(_ artist: PublicArtistProfile) -> some View {
        ZStack(alignment: .bottomLeading) {
            LinearGradient(
                colors: [NBColors.action, NBColors.action.opacity(0.85)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(height: 240)

            // Decorative circles
            ZStack {
                Circle().fill(Color.white.opacity(0.08)).frame(width: 140, height: 140).offset(x: 90, y: -50)
                Circle().fill(Color.white.opacity(0.06)).frame(width: 100, height: 100).offset(x: -40, y: 30)
            }
            .frame(height: 240).clipped()

            HStack(spacing: Spacing.lg) {
                // Avatar
                ZStack {
                    Circle().fill(Color.white.opacity(0.3)).frame(width: 64, height: 64)
                    if let url = artist.avatarUrl, !url.isEmpty {
                        AsyncImage(url: URL(string: url)) { img in
                            img.resizable().aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Text(String(artist.name?.first ?? "?"))
                                .font(.system(size: 24, weight: .bold)).foregroundColor(.white)
                        }
                        .frame(width: 64, height: 64).clipShape(Circle())
                    } else {
                        Text(String(artist.name?.first ?? "?"))
                            .font(.system(size: 24, weight: .bold)).foregroundColor(.white)
                    }
                }
                .overlay(Circle().stroke(Color.white.opacity(0.4), lineWidth: 2))

                VStack(alignment: .leading, spacing: 4) {
                    Text(artist.name ?? "")
                        .font(.system(size: 20, weight: .bold)).foregroundColor(.white)

                    HStack(spacing: 8) {
                        if let city = artist.city, !city.isEmpty {
                            Text(city).font(.system(size: 12)).foregroundColor(.white.opacity(0.8))
                        }
                        if let years = artist.experienceYears, years > 0 {
                            Text("\(years)年经验").font(.system(size: 12)).foregroundColor(.white.opacity(0.8))
                        }
                        if let specs = artist.specialties, !specs.isEmpty {
                            Text(specs.prefix(2).joined(separator: "·"))
                                .font(.system(size: 12)).foregroundColor(.white.opacity(0.8))
                        }
                    }
                }
                Spacer()
            }
            .padding(.horizontal, Spacing.page)
            .padding(.bottom, 36)
        }
        .frame(height: 240)
    }

    // MARK: - Stats Card

    private func statsCard(_ artist: PublicArtistProfile) -> some View {
        HStack(spacing: 0) {
            statItem("服务客户", value: formatCount(artist.serviceCount ?? 0))
            Divider().frame(height: 36)
            statItem("好评率", value: String(format: "%.1f%%", artist.satisfactionRate ?? 0))
            Divider().frame(height: 36)
            statItem("精选作品", value: "\(works.count)")
        }
        .padding(.vertical, Spacing.md)
        .background(Color.white)
        .cornerRadius(Radius.lg)
        .shadow(color: Color.black.opacity(0.08), radius: 12, y: 4)
    }

    private func statItem(_ label: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(value).font(.system(size: 18, weight: .bold)).foregroundColor(NBColors.action)
            Text(label).font(.system(size: 12)).foregroundColor(NBColors.muted)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - About Section

    private func aboutSection(_ artist: PublicArtistProfile) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("关于我")

            if let bio = artist.bio, !bio.isEmpty {
                Text(bio)
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.ink)
                    .lineSpacing(1.6)
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white)
                    .cornerRadius(Radius.md)
            }

            if let intro = artist.brandProfile?.artistIntroduction, !intro.isEmpty {
                Text(intro)
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.secondary)
                    .lineSpacing(1.6)
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white)
                    .cornerRadius(Radius.md)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
    }

    // MARK: - Works Section

    private var worksSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                sectionHeader("精选作品")
                Spacer()
                NavigationLink(destination: WorksListView(techId: artistId).toolbar(.hidden, for: .tabBar)) {
                    HStack(spacing: 2) {
                        Text("查看全部").font(.system(size: 14, weight: .medium))
                        Image(systemName: "chevron.right").font(.system(size: 12))
                    }
                    .foregroundColor(NBColors.link)
                }
            }

            if works.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "photo").font(.system(size: 32)).foregroundColor(NBColors.muted)
                    Text("暂无作品").font(.system(size: 14)).foregroundColor(NBColors.muted)
                }
                .frame(maxWidth: .infinity).padding(.vertical, 30)
                .background(Color.white).cornerRadius(Radius.md)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(works.prefix(8)) { work in
                            NavigationLink(destination: WorkDetailView(workId: work.id)) {
                                workCard(work)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
    }

    private func workCard(_ work: NailWork) -> some View {
        ZStack(alignment: .bottomLeading) {
            AsyncImage(url: URL(string: work.coverUrl ?? "")) { img in
                img.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle().fill(NBColors.page)
                    .overlay(Image(systemName: "photo").foregroundColor(NBColors.muted))
            }
            .frame(width: 140, height: 186)
            .clipped()
            .cornerRadius(Radius.md)

            LinearGradient(colors: [.clear, .black.opacity(0.6)], startPoint: .center, endPoint: .bottom)
                .frame(height: 60)
                .frame(maxHeight: .infinity, alignment: .bottom)
                .cornerRadius(Radius.md)

            VStack(alignment: .leading, spacing: 2) {
                Text(work.title ?? "美甲作品")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white).lineLimit(1)
                HStack(spacing: 4) {
                    Image(systemName: "heart").font(.system(size: 9))
                    Text("\(work.likeCount ?? 0)").font(.system(size: 11))
                }
                .foregroundColor(.white.opacity(0.8))
            }
            .padding(8)
        }
        .frame(width: 140, height: 186)
    }

    // MARK: - Services Section

    private func servicesSection(_ artist: PublicArtistProfile) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("服务内容")

            if let services = artist.serviceItems, !services.isEmpty {
                VStack(spacing: 8) {
                    ForEach(services.filter { $0.isActive != false }) { service in
                        serviceRow(service)
                    }
                }
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "list.bullet.rectangle")
                        .font(.system(size: 32)).foregroundColor(NBColors.muted)
                    Text("暂未设置服务项目").font(.system(size: 14)).foregroundColor(NBColors.muted)
                }
                .frame(maxWidth: .infinity).padding(.vertical, 30)
                .background(Color.white).cornerRadius(Radius.md)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
    }

    private func serviceRow(_ service: PublicArtistService) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: Radius.md)
                    .fill(NBColors.page).frame(width: 40, height: 40)
                Image(systemName: serviceIcon(service.category))
                    .font(.system(size: 18)).foregroundColor(NBColors.action)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(service.name ?? "").font(.system(size: 15, weight: .medium)).foregroundColor(NBColors.ink)
                HStack(spacing: 8) {
                    if let desc = service.description, !desc.isEmpty {
                        Text(desc).font(.system(size: 12)).foregroundColor(NBColors.muted).lineLimit(1)
                    }
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text("¥\(Int(service.displayPrice))起")
                    .font(.system(size: 15, weight: .semibold)).foregroundColor(NBColors.action)
                if let d = service.durationMinutes, d > 0 {
                    Text("\(d)min").font(.system(size: 11)).foregroundColor(NBColors.muted)
                }
            }
        }
        .padding(12)
        .background(Color.white)
        .cornerRadius(Radius.md)
    }

    private func serviceIcon(_ category: String?) -> String {
        switch category {
        case "basic_care": return "hand.raised"
        case "color_style": return "paintbrush"
        case "extension_reinforcement": return "arrow.up.left.and.arrow.down.right"
        case "removal": return "xmark.circle"
        default: return "star"
        }
    }

    // MARK: - Shop Section

    private func shopSection(_ artist: PublicArtistProfile) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("店铺信息")

            VStack(alignment: .leading, spacing: 10) {
                if let name = artist.shopName, !name.isEmpty {
                    Text(name).font(.system(size: 16, weight: .semibold)).foregroundColor(NBColors.ink)
                }

                if let addr = artist.shopAddress, !addr.isEmpty {
                    HStack(alignment: .top, spacing: 6) {
                        Image(systemName: "mappin").font(.system(size: 14)).foregroundColor(NBColors.muted)
                        Text(addr).font(.system(size: 14)).foregroundColor(NBColors.ink).lineLimit(2)
                    }
                }

                if let hours = artist.businessHours, !hours.isEmpty {
                    HStack(spacing: 6) {
                        Image(systemName: "clock").font(.system(size: 14)).foregroundColor(NBColors.muted)
                        Text(hours).font(.system(size: 14)).foregroundColor(NBColors.muted)
                    }
                }

                HStack(spacing: 10) {
                    Button {
                        openMaps(artist)
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "location.fill").font(.system(size: 13))
                            Text("一键导航").font(.system(size: 14, weight: .medium))
                        }
                        .foregroundColor(NBColors.link)
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .background(NBColors.page)
                        .cornerRadius(Radius.md)
                    }

                    Button {
                        callPhone(artist.shopPhone ?? artist.phone)
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "phone.fill").font(.system(size: 13))
                            Text("一键拨号").font(.system(size: 14, weight: .medium))
                        }
                        .foregroundColor(NBColors.link)
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .background(NBColors.page)
                        .cornerRadius(Radius.md)
                    }
                    .disabled(artist.shopPhone == nil && artist.phone == nil)
                }
                .padding(.top, 4)
            }
            .padding(16)
            .background(Color.white)
            .cornerRadius(Radius.md)
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
    }

    // MARK: - Reviews Section

    private var reviewsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("客户评价")

            if let reviews = response?.featuredReviews, !reviews.isEmpty {
                VStack(spacing: 10) {
                    ForEach(reviews.prefix(3)) { review in
                        reviewCard(review)
                    }
                }
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "bubble.left").font(.system(size: 32)).foregroundColor(NBColors.muted)
                    Text("暂无评价").font(.system(size: 14)).foregroundColor(NBColors.muted)
                }
                .frame(maxWidth: .infinity).padding(.vertical, 30)
                .background(Color.white).cornerRadius(Radius.md)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
    }

    private func reviewCard(_ review: FeaturedReview) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                ZStack {
                    Circle().fill(NBColors.page).frame(width: 36, height: 36)
                    Text(String(review.clientName?.first ?? "?"))
                        .font(.system(size: 14, weight: .bold)).foregroundColor(NBColors.action)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(review.clientName ?? "").font(.system(size: 14, weight: .medium)).foregroundColor(NBColors.ink)
                    if let date = review.createdAt {
                        Text(formatDate(date)).font(.system(size: 12)).foregroundColor(NBColors.muted)
                    }
                }
                Spacer()
                // Stars
                HStack(spacing: 2) {
                    ForEach(1...5, id: \.self) { i in
                        Image(systemName: i <= (review.rating ?? 5) ? "star.fill" : "star")
                            .font(.system(size: 12))
                            .foregroundColor(i <= (review.rating ?? 5) ? NBColors.secondary : NBColors.muted)
                    }
                }
            }

            if let content = review.content, !content.isEmpty {
                Text(content)
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.ink)
                    .lineSpacing(1.5)
            }
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(Radius.md)
    }

    // MARK: - Bottom Bar

    private func bottomBar(_ artist: PublicArtistProfile) -> some View {
        HStack(spacing: 12) {
            // Follow button
            Button {
                Task { await toggleFollow() }
            } label: {
                VStack(spacing: 2) {
                    Image(systemName: isFollowing ? "heart.fill" : "heart")
                        .font(.system(size: 20))
                        .foregroundColor(isFollowing ? NBColors.danger : NBColors.muted)
                    Text("\(artist.followerCount ?? 0)")
                        .font(.system(size: 10))
                        .foregroundColor(NBColors.muted)
                }
                .frame(width: 52, height: 52)
                .background(Color.white)
                .cornerRadius(Radius.md)
                .shadow(color: Color.black.opacity(0.06), radius: 6, y: 2)
            }
            .accessibilityLabel(isFollowing ? "取消关注" : "关注美甲师")
            .accessibilityHint("\(artist.followerCount ?? 0) 人关注")

            // Book button
            Button {
                Task { await handleBooking(artist) }
            } label: {
                Text("立即预约")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(NBColors.action)
                    .cornerRadius(Radius.md)
                    .shadow(color: NBColors.action.opacity(0.3), radius: 8, y: 4)
            }
            .accessibilityLabel("预约 \(artist.name ?? "美甲师")")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.95).background(.ultraThinMaterial))
        .shadow(color: Color.black.opacity(0.06), radius: 10, y: -2)
    }

    // MARK: - Bind Sheet

    private func bindSheet(_ artist: PublicArtistProfile) -> some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("绑定 \(artist.name ?? "美甲师")")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(NBColors.ink)

                Text("请输入该美甲师的邀请码，提交绑定申请后即可预约。")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.muted)

                TextField("邀请码", text: $bindCode)
                    .font(.system(size: 15))
                    .textInputAutocapitalization(.characters)
                    .padding(12)
                    .background(NBColors.page)
                    .cornerRadius(Radius.sm)

                if let name = bindVerifiedName {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.circle.fill").foregroundColor(NBColors.success)
                        Text("已确认：\(name)").font(.system(size: 14)).foregroundColor(NBColors.success)
                    }
                }

                if let err = bindError {
                    Text(err).font(.system(size: 13)).foregroundColor(NBColors.danger)
                }

                Button {
                    Task { await verifyInviteCode() }
                } label: {
                    Text(bindLoading ? "验证中..." : "验证邀请码")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(NBColors.link)
                }
                .disabled(bindCode.isEmpty || bindLoading)

                Spacer()
            }
            .padding(20)
            .navigationTitle("绑定预约")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { showBindSheet = false; resetBind() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("提交申请") {
                        Task { await submitBind(artist) }
                    }
                    .foregroundColor(NBColors.action)
                    .disabled(bindVerifiedName == nil || bindLoading)
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - Section Header

    private func sectionHeader(_ title: String) -> some View {
        HStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 2).fill(NBColors.action).frame(width: 3, height: 16)
            Text(title).font(.system(size: 17, weight: .bold)).foregroundColor(NBColors.ink)
        }
    }

    // MARK: - Actions

    private func loadData() async {
        isLoading = true
        defer { isLoading = false }

        // Load artist profile (public, no auth required)
        do {
            response = try await APIClient.shared.request(.publicArtistProfile(id: artistId))
        } catch {
            self.error = error.localizedDescription
            return
        }

        // Load works (may require auth)
        do {
            works = try await APIClient.shared.request(.clientWorksPublic(techId: artistId, page: 1))
        } catch {
            // Fallback: use works from public API if available
            works = response?.works ?? []
        }

        // Load follow status (may fail if not logged in - that's OK)
        do {
            let status: FollowStatus = try await APIClient.shared.request(.clientFollowStatus(artistId: artistId))
            isFollowing = status.followed ?? false
        } catch {}
    }

    private func toggleFollow() async {
        let wasFollowing = isFollowing
        isFollowing.toggle() // Optimistic

        do {
            if wasFollowing {
                try await APIClient.shared.requestVoid(.clientUnfollowArtist(artistId: artistId))
            } else {
                try await APIClient.shared.requestVoid(.clientFollowArtist(artistId: artistId))
            }
        } catch {
            isFollowing = wasFollowing // Revert on failure
        }
    }

    private func handleBooking(_ artist: PublicArtistProfile) async {
        // Check if bound to this technician (try creating order - if not bound, show bind sheet)
        showBindSheet = true
    }

    private func verifyInviteCode() async {
        guard !bindCode.isEmpty else { return }
        bindLoading = true
        bindError = nil
        bindVerifiedName = nil
        defer { bindLoading = false }

        do {
            let tech: TechnicianProfile = try await APIClient.shared.request(.findTechnicianByInviteCode(code: bindCode))
            if tech.id == artistId {
                bindVerifiedName = tech.name
            } else {
                bindError = "邀请码不属于该美甲师"
            }
        } catch {
            bindError = "邀请码无效或已过期"
        }
    }

    private func submitBind(_ artist: PublicArtistProfile) async {
        guard !bindCode.isEmpty else { return }
        bindLoading = true
        bindError = nil
        defer { bindLoading = false }

        do {
            let body: [String: Any] = ["inviteCode": bindCode, "source": "artist_home"]
            try await APIClient.shared.requestVoid(.resource(role: .client, path: "auth/bind-technician", method: "POST", body: body))
            showBindSheet = false
            resetBind()
            // After binding, navigate to booking
            navigateToOrders = true
        } catch {
            bindError = error.localizedDescription
        }
    }

    private func resetBind() {
        bindCode = ""
        bindVerifiedName = nil
        bindError = nil
    }

    private func openMaps(_ artist: PublicArtistProfile) {
        let lat = artist.shopLatitude ?? 31.2304
        let lng = artist.shopLongitude ?? 121.4737
        let name = artist.shopName ?? "店铺"
        let url = URL(string: "https://maps.apple.com/?ll=\(lat),\(lng)&q=\(name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? name)")!
        UIApplication.shared.open(url)
    }

    private func callPhone(_ phone: String?) {
        guard let phone = phone, let url = URL(string: "tel://\(phone)") else { return }
        UIApplication.shared.open(url)
    }

    private func shareArtist() {
        guard let artist = artist else { return }
        let shareText = "\(artist.name ?? "美甲师") - OnlyNail"
        let shareURL = "https://lunails.cn/artist/\(artistId)"
        let items: [Any] = [shareText, URL(string: shareURL) as Any].compactMap { $0 }
        let av = UIActivityViewController(activityItems: items, applicationActivities: nil)
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let root = scene.windows.first?.rootViewController {
            root.present(av, animated: true)
        }
    }

    // MARK: - Formatters

    private func formatCount(_ count: Int) -> String {
        if count >= 10000 { return String(format: "%.1f万", Double(count) / 10000) }
        return "\(count)"
    }

    private func formatDate(_ isoString: String) -> String {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = f.date(from: isoString) else { return "" }
        let df = DateFormatter(); df.dateFormat = "yyyy-MM-dd"
        return df.string(from: date)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack { ArtistHomeView(artistId: 1) }
}
