import SwiftUI

// MARK: - Chat View (Messages)

struct ChatView: View {
    let conversationId: Int
    let role: UserRole
    let partnerName: String

    @State private var messages: [ChatMessage] = []
    @State private var messageText = ""
    @State private var isLoading = true
    @State private var scrollProxy: ScrollViewProxy?
    @State private var isTyping = false
    @FocusState private var isInputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Messages list
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: Spacing.sm) {
                        ForEach(messages) { message in
                            MessageBubble(message: message, role: role)
                                .id(message.id)
                        }
                    }
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm)
                }
                .onAppear { scrollProxy = proxy }
                .onChange(of: messages.count) { _ in
                    if let last = messages.last {
                        withAnimation {
                            scrollProxy?.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }

            // Typing indicator
            if isTyping {
                HStack(spacing: Spacing.sm) {
                    Text("\(partnerName) 正在输入")
                        .font(NBFont.captionMedium)
                        .foregroundColor(.nbTextTertiary)
                    ProgressView()
                        .scaleEffect(0.6)
                    Spacer()
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.xs)
            }

            Divider()

            // Input bar
            HStack(spacing: Spacing.md) {
                Button {
                    // TODO: image picker
                } label: {
                    Image(systemName: "photo")
                        .font(.system(size: 22))
                        .foregroundColor(.nbTextSecondary)
                }

                TextField("输入消息...", text: $messageText)
                    .font(NBFont.bodyMedium)
                    .padding(.horizontal, Spacing.md)
                    .frame(height: 40)
                    .background(Color.nbSurfaceAlt)
                    .cornerRadius(Radius.full)
                    .focused($isInputFocused)

                Button {
                    sendMessage()
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(messageText.isEmpty ? .nbTextTertiary : .nbPrimary)
                }
                .disabled(messageText.isEmpty)
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, Spacing.sm)
            .background(Color.nbSurface)
        }
        .navigationTitle(partnerName)
        .navigationBarTitleDisplayMode(.inline)
        .background(Color.nbBg)
        .task { await loadMessages() }
    }

    private func loadMessages() async {
        do {
            messages = try await APIClient.shared.request(.messages(conversationId: conversationId, role: role))
            isLoading = false
            // Mark as read
            try? await APIClient.shared.requestVoid(.markRead(conversationId: conversationId, role: role))
        } catch { isLoading = false }
    }

    private func sendMessage() {
        let text = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        messageText = ""

        // Optimistic add
        let tempMessage = ChatMessage(
            id: Int.random(in: 100000...999999),
            conversationId: conversationId,
            senderType: role.rawValue,
            senderId: 0,
            receiverType: role == .client ? "technician" : "client",
            receiverId: nil,
            messageType: "text",
            content: text,
            createdAt: ISO8601DateFormatter().string(from: Date())
        )
        messages.append(tempMessage)

        Task {
            do {
                let sent: ChatMessage = try await APIClient.shared.request(
                    .sendMessage(params: [
                        "conversationId": conversationId,
                        "messageType": "text",
                        "content": text
                    ], role: role)
                )
                // Replace temp with real
                if let index = messages.firstIndex(where: { $0.id == tempMessage.id }) {
                    messages[index] = sent
                }
            } catch {
                // Remove temp on failure
                messages.removeAll { $0.id == tempMessage.id }
            }
        }
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    let role: UserRole

    private var isMe: Bool {
        message.senderType == role.rawValue
    }

    var body: some View {
        HStack {
            if isMe { Spacer(minLength: 60) }

            VStack(alignment: isMe ? .trailing : .leading, spacing: 2) {
                Group {
                    switch message.messageType {
                    case "text":
                        Text(message.content ?? "")
                            .font(NBFont.bodyMedium)
                            .foregroundColor(isMe ? .white : .nbTextPrimary)
                            .padding(.horizontal, Spacing.md)
                            .padding(.vertical, Spacing.sm)
                            .background(isMe ? AnyView(NBGradient.bubbleSelf) : AnyView(Color.nbSurfaceGlass))
                            .cornerRadius(Radius.lg)
                            .shadow(color: isMe ? Color.nbPrimary.opacity(0.15) : .clear, radius: 8, y: 2)

                    case "image":
                        if let url = message.imageUrl {
                            AsyncImage(url: URL(string: url)) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Rectangle().fill(Color.nbSecondarySoft).overlay(ProgressView())
                            }
                            .frame(maxWidth: 200, maxHeight: 200)
                            .cornerRadius(Radius.md)
                            .clipped()
                        }

                    case "system":
                        Text(message.content ?? "")
                            .font(NBFont.captionMedium)
                            .foregroundColor(.nbTextTertiary)
                            .padding(.horizontal, Spacing.md)
                            .padding(.vertical, Spacing.xs)
                            .background(Color.nbSecondarySoft)
                            .cornerRadius(Radius.sm)

                    default:
                        Text(message.content ?? "[不支持的消息类型]")
                            .font(NBFont.captionLarge)
                            .foregroundColor(.nbTextTertiary)
                    }
                }

                if let time = message.createdAt {
                    Text(formatTime(time))
                        .font(NBFont.captionSmall)
                        .foregroundColor(.nbTextMuted)
                }
            }

            if !isMe { Spacer(minLength: 60) }
        }
    }

    private func formatTime(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return "" }
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        return f.string(from: date)
    }
}
