import SwiftUI

// MARK: - Addresses List

struct AddressesListView: View {
    @State private var addresses: [ClientAddress] = []
    @State private var isLoading = true
    @State private var showAdd = false

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    NBLoadingView()
                } else if addresses.isEmpty {
                    NBEmptyState(icon: "location", title: "暂无地址", message: "添加地址后可预约上门服务")
                } else {
                    List {
                        ForEach(addresses) { address in
                            AddressRow(address: address,
                                      onSetDefault: { Task { await setDefault(address.id) } },
                                      onDelete: { Task { await deleteAddress(address.id) } })
                        }
                        .onDelete { indexSet in
                            for index in indexSet {
                                Task { await deleteAddress(addresses[index].id) }
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("地址管理")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { showAdd = true } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .background(Color.nbBg)
            .sheet(isPresented: $showAdd) {
                EditAddressView(address: nil) { await loadAddresses() }
            }
            .task { await loadAddresses() }
            .refreshable { await loadAddresses() }
        }
    }

    private func loadAddresses() async {
        do {
            addresses = try await APIClient.shared.request(.addresses)
            isLoading = false
        } catch { isLoading = false }
    }

    private func setDefault(_ id: Int) async {
        do {
            _ = try await APIClient.shared.requestVoid(.setDefaultAddress(id: id))
            await loadAddresses()
        } catch {}
    }

    private func deleteAddress(_ id: Int) async {
        do {
            _ = try await APIClient.shared.requestVoid(.deleteAddress(id: id))
            await loadAddresses()
        } catch {}
    }
}

struct AddressRow: View {
    let address: ClientAddress
    var onSetDefault: (() -> Void)?
    var onDelete: (() -> Void)?

    var body: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: address.isDefault ? "checkmark.circle.fill" : "location.circle")
                .foregroundColor(address.isDefault ? .nbPrimary : .nbTextTertiary)
                .font(.system(size: 20))

            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack {
                    Text(address.contactName)
                        .font(NBFont.bodyLarge)
                        .foregroundColor(.nbTextPrimary)
                    Text(address.contactPhone)
                        .font(NBFont.bodyMedium)
                        .foregroundColor(.nbTextSecondary)
                    if address.isDefault {
                        NBChip(title: "默认", color: .nbSuccess)
                    }
                }
                Text(fullAddress)
                    .font(NBFont.captionLarge)
                    .foregroundColor(.nbTextSecondary)
                    .lineLimit(2)
                if let door = address.doorInfo, !door.isEmpty {
                    Text("门禁: \(door)")
                        .font(NBFont.captionMedium)
                        .foregroundColor(.nbTextTertiary)
                }
            }

            Spacer()

            if !address.isDefault {
                Button { onSetDefault?() } label: {
                    Text("设为默认")
                        .font(NBFont.captionLarge)
                        .foregroundColor(.nbPrimary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, Spacing.xs)
        .listRowBackground(Color.nbSurface)
    }

    private var fullAddress: String {
        "\(address.province ?? "")\(address.city ?? "")\(address.district ?? "")\(address.detailAddress)"
    }
}

// MARK: - Edit Address

struct EditAddressView: View {
    let address: ClientAddress?
    var onSave: (() async -> Void)?

    @Environment(\.dismiss) var dismiss
    @State private var contactName = ""
    @State private var contactPhone = ""
    @State private var province = ""
    @State private var city = ""
    @State private var district = ""
    @State private var detailAddress = ""
    @State private var doorInfo = ""
    @State private var isDefault = false
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("联系人信息")
                                .font(NBFont.titleSmall)
                            NBTextField(placeholder: "姓名", text: $contactName)
                            NBTextField(placeholder: "手机号", text: $contactPhone, keyboardType: .phonePad)
                        }
                    }

                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("地址信息")
                                .font(NBFont.titleSmall)
                            NBTextField(placeholder: "省", text: $province)
                            NBTextField(placeholder: "市", text: $city)
                            NBTextField(placeholder: "区", text: $district)
                            NBTextField(placeholder: "详细地址", text: $detailAddress)
                            NBTextField(placeholder: "门禁信息（选填）", text: $doorInfo)
                        }
                    }

                    Toggle(isOn: $isDefault) {
                        Text("设为默认地址")
                            .font(NBFont.bodyMedium)
                    }
                    .padding(.horizontal, Spacing.lg)

                    NBButton(title: "保存", style: .primary, isLoading: isSaving) {
                        save()
                    }
                    .padding(.horizontal, Spacing.lg)
                }
                .padding(.vertical, Spacing.lg)
            }
            .navigationTitle(address == nil ? "新增地址" : "编辑地址")
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
        guard let addr = address else { return }
        contactName = addr.contactName
        contactPhone = addr.contactPhone
        province = addr.province ?? ""
        city = addr.city ?? ""
        district = addr.district ?? ""
        detailAddress = addr.detailAddress
        doorInfo = addr.doorInfo ?? ""
        isDefault = addr.isDefault
    }

    private func save() {
        guard !contactName.isEmpty, !contactPhone.isEmpty, !detailAddress.isEmpty else { return }
        isSaving = true

        let params: [String: Any] = [
            "contactName": contactName,
            "contactPhone": contactPhone,
            "province": province,
            "city": city,
            "district": district,
            "detailAddress": detailAddress,
            "doorInfo": doorInfo,
            "isDefault": isDefault
        ]

        Task {
            do {
                if let addr = address {
                    _ = try await APIClient.shared.requestVoid(.updateAddress(id: addr.id, params: params))
                } else {
                    _ = try await APIClient.shared.requestVoid(.createAddress(params: params))
                }
                await onSave?()
                dismiss()
            } catch {
                isSaving = false
            }
        }
    }
}
