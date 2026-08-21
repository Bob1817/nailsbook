import SwiftUI

// MARK: - Technician Profile Settings (Edit Profile)

struct TechProfileSettingsView: View {
    @State private var name = ""
    @State private var city = ""
    @State private var serviceArea = ""
    @State private var bio = ""
    @State private var isSaving = false
    @State private var showSuccess = false

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Avatar
                VStack(spacing: Spacing.md) {
                    Circle()
                        .fill(Color.nbPrimarySoft)
                        .frame(width: 80, height: 80)
                        .overlay(
                            Image(systemName: "camera")
                                .font(.system(size: 24))
                                .foregroundColor(.nbPrimary)
                        )
                    Text("点击更换头像")
                        .font(NBFont.captionLarge)
                        .foregroundColor(.nbPrimary)
                }
                .padding(.top, Spacing.lg)

                NBCard {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("基本信息")
                            .font(NBFont.titleSmall)
                        NBTextField(placeholder: "姓名", text: $name)
                        NBTextField(placeholder: "城市", text: $city)
                        NBTextField(placeholder: "服务区域", text: $serviceArea)
                    }
                }

                NBCard {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("个人简介")
                            .font(NBFont.titleSmall)
                        TextEditor(text: $bio)
                            .font(NBFont.bodyMedium)
                            .frame(height: 100)
                            .padding(Spacing.sm)
                            .background(Color.nbSurfaceAlt)
                            .cornerRadius(Radius.sm)
                    }
                }

                NBButton(title: "保存", style: .primary, isLoading: isSaving) {
                    save()
                }
            }
            .padding(Spacing.lg)
        }
        .navigationTitle("个人资料")
        .background(Color.nbBg)
        .task { await loadProfile() }
        .alert("保存成功", isPresented: $showSuccess) {
            Button("确定") {}
        }
    }

    private func loadProfile() async {
        do {
            let profile: TechnicianProfile = try await APIClient.shared.request(.technicianMe)
            name = profile.name
            city = profile.city ?? ""
            serviceArea = profile.serviceArea ?? ""
        } catch {}
    }

    private func save() {
        isSaving = true
        Task {
            do {
                _ = try await APIClient.shared.requestVoid(
                    .updateTechnicianProfile(params: [
                        "name": name,
                        "city": city,
                        "serviceArea": serviceArea
                    ])
                )
                isSaving = false
                showSuccess = true
            } catch {
                isSaving = false
            }
        }
    }
}
