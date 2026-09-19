import SwiftUI
import PhotosUI

// MARK: - Homepage Settings View

struct HomepageSettingsView: View {
    @State private var profile: TechnicianProfile?
    @State private var brandProfile: BrandProfile?
    @State private var isLoading = true
    @State private var saving = false
    @State private var error: String?

    // Form fields
    @State private var name = ""
    @State private var bio = ""
    @State private var city = ""
    @State private var serviceArea = ""
    @State private var tagline = ""
    @State private var experienceYears = 1
    @State private var specialties: [String] = []
    @State private var certificationTitle = ""
    @State private var artistIntroduction = ""
    @State private var publicationStatus = "draft"

    // Avatar
    @State private var avatarItem: PhotosPickerItem?
    @State private var avatarUrl = ""

    let specialtyOptions = ["韩系温柔风", "轻奢法式", "简约日式", "高级手绘", "氛围感晕染", "新中式", "婚礼美甲", "极简风", "甜酷风", "问题甲护理"]

    var body: some View {
        Form {
            // Basic Info
            Section("基本信息") {
                HStack {
                    Text("头像")
                        .foregroundColor(.nbTextSecondary)
                    Spacer()
                    PhotosPicker(selection: $avatarItem, matching: .images) {
                        if avatarUrl.isEmpty {
                            Circle()
                                .fill(Color.nbPrimarySoft)
                                .frame(width: 44, height: 44)
                                .overlay(
                                    Image(systemName: "camera")
                                        .foregroundColor(.nbPrimary)
                                )
                        } else {
                            AsyncImage(url: URL(string: avatarUrl)) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Circle()
                                    .fill(Color.nbSecondarySoft)
                                    .overlay(ProgressView())
                            }
                            .frame(width: 44, height: 44)
                            .clipShape(Circle())
                        }
                    }
                }

                TextField("主页名称", text: $name)
                TextField("个人简介", text: $bio)
                TextField("城市", text: $city)
                TextField("服务区域", text: $serviceArea)
            }

            // Brand Info
            Section("品牌信息") {
                TextField("标语", text: $tagline)
                Stepper("从业年限: \(experienceYears)年", value: $experienceYears, in: 1...30)
                TextField("资质认证", text: $certificationTitle)
            }

            // Specialties
            Section("擅长风格（最多5项）") {
                ForEach(specialtyOptions, id: \.self) { option in
                    Button {
                        toggleSpecialty(option)
                    } label: {
                        HStack {
                            Text(option)
                                .foregroundColor(.nbTextPrimary)
                            Spacer()
                            if specialties.contains(option) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.nbPrimary)
                            }
                        }
                    }
                }
            }

            // Introduction
            Section("艺术家介绍") {
                TextEditor(text: $artistIntroduction)
                    .frame(minHeight: 100)
            }

            // Publication
            Section("发布状态") {
                Toggle("发布主页", isOn: Binding(
                    get: { publicationStatus == "published" },
                    set: { publicationStatus = $0 ? "published" : "draft" }
                ))
            }

            // Save button
            Section {
                Button {
                    Task { await save() }
                } label: {
                    HStack {
                        Spacer()
                        Text(saving ? "保存中..." : "保存设置")
                            .fontWeight(.medium)
                        Spacer()
                    }
                }
                .disabled(saving || name.isEmpty)
            }
        }
        .navigationTitle("主页设置")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadData() }
        .onChange(of: avatarItem) { _ in
            Task { await uploadAvatar() }
        }
        .alert("错误", isPresented: .constant(error != nil)) {
            Button("确定") { error = nil }
        } message: {
            Text(error ?? "")
        }
    }

    private func toggleSpecialty(_ specialty: String) {
        if let index = specialties.firstIndex(of: specialty) {
            specialties.remove(at: index)
        } else if specialties.count < 5 {
            specialties.append(specialty)
        }
    }

    private func loadData() async {
        do {
            async let profileRequest: TechnicianProfile = APIClient.shared.request(.technicianMe)
            async let brandRequest: BrandProfile = APIClient.shared.request(.brandProfileGet)

            profile = try await profileRequest
            brandProfile = try? await brandRequest

            // Fill form fields
            if let profile = profile {
                name = profile.name
                city = profile.city ?? ""
                serviceArea = profile.serviceArea ?? ""
                avatarUrl = profile.avatarUrl ?? ""
            }

            if let brand = brandProfile {
                tagline = brand.tagline ?? ""
                experienceYears = brand.experienceYears ?? 1
                specialties = brand.specialties ?? []
                certificationTitle = brand.certificationTitle ?? ""
                artistIntroduction = brand.artistIntroduction ?? ""
                publicationStatus = brand.publicationStatus ?? "draft"
            }

            isLoading = false
        } catch {
            isLoading = false
            self.error = error.localizedDescription
        }
    }

    private func uploadAvatar() async {
        guard let avatarItem = avatarItem else { return }
        do {
            guard let data = try await avatarItem.loadTransferable(type: Data.self),
                  let image = UIImage(data: data),
                  let jpeg = image.jpegData(compressionQuality: 0.85) else { return }
            let uploaded = try await APIClient.shared.uploadImage(data: jpeg, filename: "\(UUID().uuidString).jpg", role: .technician)
            avatarUrl = uploaded.url
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func save() async {
        guard !saving else { return }
        saving = true
        error = nil

        do {
            // Update profile
            let profileParams: [String: Any] = [
                "name": name.trimmingCharacters(in: .whitespaces),
                "bio": bio.trimmingCharacters(in: .whitespaces),
                "city": city,
                "serviceArea": serviceArea,
                "avatarUrl": avatarUrl,
                "styleTags": specialties
            ]
            _ = try await APIClient.shared.requestVoid(.updateTechnicianProfile(params: profileParams))

            // Update brand profile
            let brandParams: [String: Any] = [
                "brandName": name.trimmingCharacters(in: .whitespaces),
                "tagline": tagline,
                "experienceYears": experienceYears,
                "specialties": specialties,
                "certificationTitle": certificationTitle,
                "artistIntroduction": artistIntroduction,
                "publicationStatus": publicationStatus
            ]
            _ = try await APIClient.shared.requestVoid(.brandProfileUpdate(params: brandParams))

            saving = false
        } catch {
            saving = false
            self.error = error.localizedDescription
        }
    }
}
