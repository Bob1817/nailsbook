import SwiftUI
import PhotosUI

// MARK: - Technician Profile Settings (aligned with wxapp design)

struct TechProfileSettingsView: View {
    @State private var name = ""
    @State private var city = ""
    @State private var serviceArea = ""
    @State private var bio = ""
    @State private var avatarUrl = ""
    @State private var isSaving = false
    @State private var isUploading = false
    @State private var showSuccess = false
    @State private var error: String?
    @State private var avatarItem: PhotosPickerItem?
    @Environment(\.dismiss) var dismiss

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Header
                    VStack(alignment: .leading, spacing: 4) {
                        Text("完善你的公开资料")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(NBColors.ink)
                        Text("这些信息会用于预约、客户沟通和个人主页展示。")
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.muted)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 16)

                    // Avatar card
                    VStack(spacing: 0) {
                        HStack(spacing: 12) {
                            // Avatar
                            PhotosPicker(selection: $avatarItem, matching: .images) {
                                ZStack {
                                    if avatarUrl.isEmpty {
                                        Circle()
                                            .fill(NBColors.softSurface)
                                            .frame(width: 52, height: 52)
                                        Image(systemName: "person.fill")
                                            .font(.system(size: 20))
                                            .foregroundColor(NBColors.muted)
                                    } else {
                                        AsyncImage(url: URL(string: avatarUrl)) { image in
                                            image
                                                .resizable()
                                                .aspectRatio(contentMode: .fill)
                                        } placeholder: {
                                            Circle()
                                                .fill(NBColors.softSurface)
                                        }
                                        .frame(width: 52, height: 52)
                                        .clipShape(Circle())
                                    }

                                    if isUploading {
                                        ZStack {
                                            Circle()
                                                .fill(Color.black.opacity(0.55))
                                                .frame(width: 52, height: 52)
                                            ProgressView()
                                                .tint(.white)
                                        }
                                    }
                                }
                            }

                            VStack(alignment: .leading, spacing: 4) {
                                Text("个人头像")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(NBColors.ink)
                                Text(isUploading ? "正在上传头像..." : "建议使用清晰、真实的正面照片")
                                    .font(.system(size: 11))
                                    .foregroundColor(NBColors.muted)
                            }

                            Spacer()

                            Text(isUploading ? "上传中" : "更换 ›")
                                .font(.system(size: 12))
                                .foregroundColor(NBColors.link)
                        }
                        .padding(14)
                    }
                    .background(Color.white)
                    .cornerRadius(12)
                    .padding(.horizontal, 16)

                    // Section heading
                    HStack {
                        Text("基本信息")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(NBColors.ink)
                        Spacer()
                        Text("用于客户识别你")
                            .font(.system(size: 12))
                            .foregroundColor(NBColors.muted)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    .padding(.bottom, 8)

                    // Form card
                    VStack(spacing: 0) {
                        // Name
                        formField(label: "姓名") {
                            TextField("请输入姓名", text: $name)
                                .font(.system(size: 15))
                                .foregroundColor(NBColors.ink)
                        }

                        Divider().padding(.leading, 14)

                        // City
                        formField(label: "所在城市") {
                            TextField("请选择城市", text: $city)
                                .font(.system(size: 15))
                                .foregroundColor(NBColors.ink)
                        }

                        Divider().padding(.leading, 14)

                        // Service Area
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("服务区域")
                                    .font(.system(size: 14))
                                    .foregroundColor(NBColors.ink)
                                Text("预约范围")
                                    .font(.system(size: 11))
                                    .foregroundColor(NBColors.secondary)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(NBColors.page)
                                    .cornerRadius(7)
                            }

                            TextField("请选择服务区域", text: $serviceArea)
                                .font(.system(size: 15))
                                .foregroundColor(NBColors.ink)

                            Text("客户预约时将根据此区域匹配服务范围")
                                .font(.system(size: 12))
                                .foregroundColor(NBColors.muted)
                        }
                        .padding(14)

                        Divider().padding(.leading, 14)

                        // Bio
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("个人简介")
                                    .font(.system(size: 14))
                                    .foregroundColor(NBColors.ink)
                                Spacer()
                                Text("\(bio.count)/200")
                                    .font(.system(size: 12))
                                    .foregroundColor(NBColors.muted)
                            }

                            TextEditor(text: $bio)
                                .font(.system(size: 15))
                                .frame(minHeight: 80)
                                .onChange(of: bio) { _ in
                                    if bio.count > 200 {
                                        bio = String(bio.prefix(200))
                                    }
                                }
                        }
                        .padding(14)
                    }
                    .background(Color.white)
                    .cornerRadius(12)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)

                    if let error {
                        Text(error)
                            .font(.system(size: 14))
                            .foregroundColor(.red)
                            .padding(.horizontal, 16)
                            .padding(.top, 8)
                    }
                }
                .padding(.bottom, 100)
            }

            // Footer
            VStack(spacing: 0) {
                Divider()
                Button {
                    Task { await save() }
                } label: {
                    HStack {
                        if isSaving {
                            ProgressView()
                                .tint(.white)
                        }
                        Text(isSaving ? "保存中..." : "保存个人资料")
                            .font(.system(size: 16, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .foregroundColor(.white)
                    .background(isSaving ? NBColors.muted : NBColors.action)
                    .cornerRadius(10)
                }
                .disabled(isSaving)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color.white)
            }
        }
        .background(NBColors.page)
        .navigationTitle("个人资料")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadProfile() }
        .onChange(of: avatarItem) { _ in
            Task { await uploadAvatar() }
        }
        .alert("保存成功", isPresented: $showSuccess) {
            Button("确定") { dismiss() }
        }
    }

    // MARK: - Form Field

    private func formField<Content: View>(label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 14))
                .foregroundColor(NBColors.ink)
            content()
        }
        .padding(14)
    }

    // MARK: - Actions

    private func loadProfile() async {
        do {
            let profile: TechnicianProfile = try await APIClient.shared.request(.technicianMe)
            name = profile.name
            city = profile.city ?? ""
            serviceArea = profile.serviceArea ?? ""
            avatarUrl = profile.avatarUrl ?? ""
        } catch {}
    }

    private func uploadAvatar() async {
        guard let avatarItem = avatarItem, !isUploading else { return }
        isUploading = true
        defer { isUploading = false }

        do {
            guard let data = try await avatarItem.loadTransferable(type: Data.self),
                  let image = UIImage(data: data),
                  let jpeg = image.jpegData(compressionQuality: 0.85) else { return }
            let uploaded = try await APIClient.shared.uploadImage(data: jpeg, filename: "\(UUID().uuidString).jpg", role: .technician)
            avatarUrl = uploaded.url
            _ = try await APIClient.shared.requestVoid(.updateTechnicianProfile(params: ["avatarUrl": avatarUrl]))
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func save() async {
        guard !isSaving else { return }
        isSaving = true
        defer { isSaving = false }

        do {
            _ = try await APIClient.shared.requestVoid(
                .updateTechnicianProfile(params: [
                    "name": name,
                    "city": city,
                    "serviceArea": serviceArea,
                    "bio": bio,
                    "avatarUrl": avatarUrl
                ])
            )
            showSuccess = true
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        TechProfileSettingsView()
    }
}
