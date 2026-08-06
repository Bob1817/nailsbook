import SwiftUI

struct ForgotPasswordView: View {
    @Environment(\.dismiss) var dismiss
    @State private var phone = ""
    @State private var isLoading = false
    @State private var message: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: Spacing.xxl) {
                Text("忘记密码")
                    .font(NBFont.displaySmall)
                    .foregroundColor(.nbTextPrimary)
                    .padding(.top, 40)

                Text("请联系客服重置密码")
                    .font(NBFont.bodyMedium)
                    .foregroundColor(.nbTextSecondary)

                if let msg = message {
                    Text(msg)
                        .font(NBFont.captionLarge)
                        .foregroundColor(.nbInfo)
                }

                Spacer()
            }
            .padding(.horizontal, Spacing.xxl)
            .background(Color.nbBg)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { dismiss() }
                }
            }
        }
    }
}
