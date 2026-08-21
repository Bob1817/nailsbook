import SwiftUI

// MARK: - Create Order View

struct CreateOrderView: View {
    let techId: Int
    let techName: String

    @Environment(\.dismiss) var dismiss
    @State private var serviceType = "home"
    @State private var selectedDate = Date()
    @State private var selectedAddress: ClientAddress?
    @State private var addresses: [ClientAddress] = []
    @State private var remark = ""
    @State private var customTitle = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // Service type
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("服务类型")
                                .font(NBFont.titleSmall)
                            HStack(spacing: Spacing.md) {
                                serviceTypeButton("home", title: "上门服务", icon: "house.fill")
                                serviceTypeButton("shop", title: "到店服务", icon: "storefront.fill")
                            }
                        }
                    }

                    // Service title
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("服务项目")
                                .font(NBFont.titleSmall)
                            NBTextField(placeholder: "请输入服务项目名称", text: $customTitle)
                        }
                    }

                    // Date picker
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("预约时间")
                                .font(NBFont.titleSmall)
                            DatePicker("选择时间", selection: $selectedDate, in: Date()...)
                                .datePickerStyle(.graphical)
                        }
                    }

                    // Address (for home service)
                    if serviceType == "home" {
                        NBCard {
                            VStack(alignment: .leading, spacing: Spacing.md) {
                                HStack {
                                    Text("服务地址")
                                        .font(NBFont.titleSmall)
                                    Spacer()
                                    NavigationLink { Text("管理地址") } label: {
                                        Text("管理")
                                            .font(NBFont.captionLarge)
                                            .foregroundColor(.nbPrimary)
                                    }
                                }

                                if addresses.isEmpty {
                                    Text("暂无地址，请先添加")
                                        .font(NBFont.bodyMedium)
                                        .foregroundColor(.nbTextTertiary)
                                } else {
                                    ForEach(addresses) { address in
                                        addressRow(address)
                                    }
                                }
                            }
                        }
                    }

                    // Remark
                    NBCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("备注")
                                .font(NBFont.titleSmall)
                            TextEditor(text: $remark)
                                .font(NBFont.bodyMedium)
                                .frame(height: 80)
                                .padding(Spacing.sm)
                                .background(Color.nbSurfaceAlt)
                                .cornerRadius(Radius.sm)
                        }
                    }

                    // Error
                    if let error = errorMessage {
                        Text(error)
                            .font(NBFont.captionLarge)
                            .foregroundColor(.nbError)
                    }

                    // Submit
                    NBButton(title: "提交预约", style: .primary, isLoading: isSubmitting) {
                        submit()
                    }
                }
                .padding(Spacing.lg)
            }
            .navigationTitle("新建预约")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color.nbBg)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { dismiss() }
                }
            }
            .task { await loadAddresses() }
        }
    }

    private func serviceTypeButton(_ type: String, title: String, icon: String) -> some View {
        Button {
            serviceType = type
        } label: {
            HStack(spacing: Spacing.sm) {
                Image(systemName: icon)
                Text(title)
                    .font(NBFont.bodyMedium)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .foregroundColor(serviceType == type ? .white : .nbTextSecondary)
            .background(serviceType == type ? Color.nbPrimary : Color.nbSecondarySoft)
            .cornerRadius(Radius.md)
        }
    }

    private func addressRow(_ address: ClientAddress) -> some View {
        Button {
            selectedAddress = address
        } label: {
            HStack(spacing: Spacing.md) {
                Image(systemName: selectedAddress?.id == address.id ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(selectedAddress?.id == address.id ? .nbPrimary : .nbTextTertiary)
                VStack(alignment: .leading, spacing: 2) {
                    Text(address.contactName)
                        .font(NBFont.bodyMedium)
                        .foregroundColor(.nbTextPrimary)
                    Text("\(address.province ?? "")\(address.city ?? "")\(address.district ?? "")\(address.detailAddress)")
                        .font(NBFont.captionLarge)
                        .foregroundColor(.nbTextSecondary)
                        .lineLimit(2)
                }
                Spacer()
                if address.isDefault {
                    NBChip(title: "默认", color: .nbSuccess)
                }
            }
            .padding(Spacing.md)
            .background(Color.nbSurfaceAlt)
            .cornerRadius(Radius.sm)
        }
        .buttonStyle(.plain)
    }

    private func loadAddresses() async {
        do {
            addresses = try await APIClient.shared.request(.addresses)
            selectedAddress = addresses.first { $0.isDefault } ?? addresses.first
        } catch {}
    }

    private func submit() {
        guard !customTitle.isEmpty else {
            errorMessage = "请填写服务项目"
            return
        }

        isSubmitting = true
        errorMessage = nil

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        let startTime = formatter.string(from: selectedDate)
        let endTime = formatter.string(from: selectedDate.addingTimeInterval(3600 * 2))

        var params: [String: Any] = [
            "technicianId": techId,
            "serviceType": serviceType,
            "startTime": startTime,
            "endTime": endTime,
            "customTitle": customTitle
        ]
        if !remark.isEmpty { params["remark"] = remark }
        if let addr = selectedAddress { params["addressId"] = addr.id }

        Task {
            do {
                _ = try await APIClient.shared.requestVoid(.createClientOrder(params: params))
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                isSubmitting = false
            }
        }
    }
}

