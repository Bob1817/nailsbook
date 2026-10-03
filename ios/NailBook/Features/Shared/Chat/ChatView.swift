import SwiftUI
import PhotosUI

// MARK: - Chat View (aligned with wxapp design)

struct ChatView: View {
    let conversationId: Int
    let role: UserRole
    let partnerName: String

    @State private var photo: PhotosPickerItem?
    @State private var sending = false
    @State private var error: String?
    @State private var messages: [ChatMessage] = []
    @State private var messageText = ""
    @State private var isLoading = true
    @State private var scrollProxy: ScrollViewProxy?
    @State private var isTyping = false
    @State private var showAddMenu = false
    @FocusState private var isInputFocused: Bool
    @StateObject private var socketManager = ChatSocketManager.shared

    var body: some View {
        VStack(spacing: 0) {
            // Messages list
            if isLoading {
                loadingView
            } else if messages.isEmpty {
                emptyChatView
            } else {
                messagesList
            }

            // Typing indicator
            if isTyping {
                HStack(spacing: 4) {
                    Text("\(partnerName) 正在输入")
                        .font(.system(size: 12))
                        .foregroundColor(NBColors.muted)
                    ProgressView()
                        .scaleEffect(0.6)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 4)
            }

            // Input bar
            inputBar
        }
        .navigationTitle(partnerName)
        .toolbar(.hidden, for: .tabBar)
        .navigationBarTitleDisplayMode(.inline)
        .background(NBColors.page)
        .task {
            await loadMessages()
            setupSocketListeners()
        }
        .onDisappear {
            socketManager.onNewMessage = nil
            socketManager.onTyping = nil
        }
        .onTapGesture {
            isInputFocused = false
            showAddMenu = false
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
            Spacer()
        }
    }

    // MARK: - Empty Chat View

    private var emptyChatView: some View {
        VStack(spacing: 16) {
            Spacer()

            VStack(spacing: 12) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(NBColors.softSurface)
                        .frame(width: 48, height: 48)
                    Text(String(partnerName.prefix(1)))
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(NBColors.action)
                }

                Text("开始和\(partnerName)沟通")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(NBColors.ink)

                Text("可以发送款式图片、沟通服务细节，或直接发起预约")
                    .font(.system(size: 12))
                    .foregroundColor(NBColors.muted)
                    .lineSpacing(1.4)
            }

            // Actions
            HStack(spacing: 8) {
                Button {
                    // Pick image
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "photo")
                            .font(.system(size: 14))
                        Text("发送图片")
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(NBColors.secondary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(NBColors.softSurface)
                    .cornerRadius(Radius.md)
                }

                Button {
                    // Create booking
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "calendar")
                            .font(.system(size: 14))
                        Text("发起预约")
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(NBColors.ink)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(NBColors.activeSurface)
                    .cornerRadius(Radius.md)
                }
            }
            .padding(.horizontal, 24)

            Spacer()
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Messages List

    private var messagesList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(groupedMessages, id: \.date) { group in
                        // Date separator
                        dateSeparator(group.dateLabel)

                        // Messages
                        ForEach(group.messages) { message in
                            messageRow(message)
                                .id(message.id)
                        }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
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
    }

    // MARK: - Date Separator

    private func dateSeparator(_ label: String) -> some View {
        HStack {
            Spacer()
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(NBColors.muted)
                .padding(.horizontal, 12)
                .padding(.vertical, 3)
                .background(Color.white.opacity(0.8))
                .cornerRadius(Radius.md)
                .shadow(color: Color.black.opacity(0.04), radius: 4, y: 1)
            Spacer()
        }
        .padding(.vertical, 14)
    }

    // MARK: - Message Row

    private func messageRow(_ message: ChatMessage) -> some View {
        let isMe = message.senderType == role.rawValue

        return HStack(alignment: .bottom, spacing: 6) {
            if isMe {
                Spacer(minLength: 48)
            }

            // Avatar (for others)
            if !isMe {
                ZStack {
                    Circle()
                        .fill(NBColors.softSurface)
                        .frame(width: 32, height: 32)
                    Text(String(partnerName.prefix(1)))
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(NBColors.action)
                }
            }

            // Content
            VStack(alignment: isMe ? .trailing : .leading, spacing: 2) {
                if message.messageType == "system" {
                    systemMessage(message)
                } else if message.messageType == "image" {
                    imageMessage(message, isMe: isMe)
                } else {
                    textMessage(message, isMe: isMe)
                }

                // Time
                if let time = message.createdAt {
                    Text(formatTime(time))
                        .font(.system(size: 10))
                        .foregroundColor(isMe ? Color.white.opacity(0.7) : NBColors.muted)
                }
            }

            // Avatar (for self)
            if isMe {
                ZStack {
                    Circle()
                        .fill(NBColors.action)
                        .frame(width: 32, height: 32)
                    Text("我")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                }
            }
        }
        .padding(.vertical, 5)
    }

    // MARK: - Text Message

    private func textMessage(_ message: ChatMessage, isMe: Bool) -> some View {
        Text(message.content ?? "")
            .font(.system(size: 15))
            .foregroundColor(isMe ? .white : NBColors.ink)
            .lineSpacing(1.4)
            .padding(.horizontal, 11)
            .padding(.vertical, 8)
            .background(isMe ? NBColors.action : Color.white.opacity(0.9))
            .cornerRadius(10)
            .shadow(color: Color.black.opacity(0.06), radius: 8, y: 2)
    }

    // MARK: - Image Message

    private func imageMessage(_ message: ChatMessage, isMe: Bool) -> some View {
        Group {
            if let url = message.imageUrl, let imageUrl = URL(string: url) {
                AsyncImage(url: imageUrl) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(NBColors.page)
                        .overlay(ProgressView())
                }
                .frame(maxWidth: 180, maxHeight: 180)
                .cornerRadius(Radius.sm)
                .clipped()
            }
        }
        .padding(4)
        .background(Color.white.opacity(0.9))
        .cornerRadius(10)
    }

    // MARK: - System Message

    private func systemMessage(_ message: ChatMessage) -> some View {
        Text(message.content ?? "")
            .font(.system(size: 12))
            .foregroundColor(NBColors.muted)
            .padding(.horizontal, 16)
            .padding(.vertical, 4)
            .background(Color.white.opacity(0.7))
            .cornerRadius(Radius.md)
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        VStack(spacing: 0) {
            Divider()

            HStack(spacing: 6) {
                // More button
                Button {
                    showAddMenu.toggle()
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 20))
                        .foregroundColor(NBColors.muted)
                        .frame(width: 44, height: 44)
                        .background(NBColors.softSurface)
                        .cornerRadius(11)
                }

                // Input field
                HStack(spacing: 4) {
                    PhotosPicker(selection: $photo, matching: .images) {
                        Image(systemName: "photo")
                            .font(.system(size: 16))
                            .foregroundColor(NBColors.muted)
                    }

                    TextField("发消息...", text: $messageText)
                        .font(.system(size: 15))
                        .focused($isInputFocused)
                }
                .frame(height: 44)
                .padding(.horizontal, 8)
                .background(NBColors.page)
                .cornerRadius(11)

                // Send button
                Button {
                    sendMessage()
                } label: {
                    Text("发送")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(messageText.isEmpty ? NBColors.muted : .white)
                        .frame(minWidth: 48, minHeight: 44)
                        .background(messageText.isEmpty ? NBColors.page : NBColors.action)
                        .cornerRadius(11)
                }
                .disabled(messageText.isEmpty)

                // Booking button
                Button {
                    // Create booking
                } label: {
                    Image(systemName: "calendar")
                        .font(.system(size: 20))
                        .foregroundColor(NBColors.muted)
                        .frame(width: 44, height: 44)
                        .background(NBColors.softSurface)
                        .cornerRadius(11)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(Color.white.opacity(0.88))
        }
        .disabled(sending)
        .onChange(of: photo) { _ in Task { await sendPhoto() } }
    }

    // MARK: - Grouped Messages

    private var groupedMessages: [(date: String, dateLabel: String, messages: [ChatMessage])] {
        let calendar = Calendar.current
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        var groups: [(date: String, dateLabel: String, messages: [ChatMessage])] = []
        var currentGroup: (date: String, messages: [ChatMessage])?

        for message in messages {
            guard let createdAt = message.createdAt,
                  let date = formatter.date(from: createdAt) else { continue }

            let dateKey = calendar.startOfDay(for: date).description
            let dateLabel = formatDateLabel(date)

            if let group = currentGroup, group.date == dateKey {
                currentGroup?.messages.append(message)
            } else {
                if let group = currentGroup {
                    groups.append((date: group.date, dateLabel: formatDateLabelFromKey(group.date), messages: group.messages))
                }
                currentGroup = (date: dateKey, messages: [message])
            }
        }

        if let group = currentGroup {
            groups.append((date: group.date, dateLabel: formatDateLabelFromKey(group.date), messages: group.messages))
        }

        return groups
    }

    private func formatDateLabel(_ date: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return "今天"
        } else if calendar.isDateInYesterday(date) {
            return "昨天"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy年M月d日"
            return formatter.string(from: date)
        }
    }

    private func formatDateLabelFromKey(_ key: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss Z"
        guard let date = formatter.date(from: key) else { return key }
        return formatDateLabel(date)
    }

    // MARK: - Socket Listeners

    private func setupSocketListeners() {
        socketManager.onNewMessage = { [self] message in
            if message.conversationId == conversationId {
                messages.append(message)
                Task {
                    try? await APIClient.shared.requestVoid(.markRead(conversationId: conversationId, role: role))
                }
            }
        }
        socketManager.onTyping = { [self] convId, typing in
            if convId == conversationId {
                isTyping = typing
            }
        }
    }

    // MARK: - Actions

    private func loadMessages() async {
        do {
            messages = try await APIClient.shared.request(.messages(conversationId: conversationId, role: role))
            isLoading = false
            try? await APIClient.shared.requestVoid(.markRead(conversationId: conversationId, role: role))
        } catch {
            isLoading = false
            self.error = error.localizedDescription
        }
    }

    private func sendMessage() {
        let text = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !sending else { return }
        sending = true
        Task {
            defer { sending = false }
            do {
                try await APIClient.shared.requestVoid(.sendMessage(params: ["conversationId": conversationId, "messageType": "text", "content": text], role: role))
                messageText = ""
                error = nil
            } catch {
                self.error = error.localizedDescription
            }
        }
    }

    private func sendPhoto() async {
        guard !sending, let photo else { return }
        sending = true
        defer { sending = false; self.photo = nil }
        do {
            guard let data = try await photo.loadTransferable(type: Data.self),
                  let image = UIImage(data: data),
                  let jpeg = image.jpegData(compressionQuality: 0.85) else {
                throw APIError.invalidResponse
            }
            let uploaded = try await APIClient.shared.uploadImage(data: jpeg, filename: "\(UUID().uuidString).jpg", role: role)
            try await APIClient.shared.requestVoid(.sendMessage(params: ["conversationId": conversationId, "messageType": "image", "imageUrl": uploaded.url], role: role))
            error = nil
        } catch {
            self.error = error.localizedDescription
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

// MARK: - Preview

#Preview {
    NavigationStack {
        ChatView(conversationId: 1, role: .client, partnerName: "美甲师")
    }
}
