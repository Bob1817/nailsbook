import SwiftUI

// MARK: - Conversations List (aligned with wxapp design)

struct ConversationsView: View {
    let role: UserRole
    @State private var conversations: [Conversation] = []
    @State private var isLoading = true
    @StateObject private var socketManager = ChatSocketManager.shared

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if role == .client {
                    NBClientPageHeader(title: "消息", subtitle: "与美甲师沟通款式和预约细节")
                }

                // Content
                if isLoading {
                    // Skeleton loading
                    ScrollView {
                        VStack(spacing: 12) {
                            ForEach(0..<5, id: \.self) { _ in
                                skeletonCard
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, role == .client ? 0 : 16)
                    }
                } else if conversations.isEmpty {
                    // Empty state
                    emptyState
                } else {
                    // Conversation list
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(conversations) { conversation in
                                NavigationLink(destination: ChatView(
                                    conversationId: conversation.id,
                                    role: role,
                                    partnerName: displayName(conversation)
                                )) {
                                    conversationCard(conversation)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, role == .client ? 0 : 16)
                        .padding(.bottom, 100)
                    }
                }
            }
            .background(NBColors.page)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if role == .technician {
                    ToolbarItem(placement: .principal) {
                        Text("消息")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundColor(NBColors.ink)
                    }
                }
            }
            .task {
                await loadConversations()
                setupSocketListener()
            }
            .refreshable { await loadConversations() }
        }
    }

    // MARK: - Conversation Card

    private func conversationCard(_ conversation: Conversation) -> some View {
        HStack(spacing: 12) {
            // Avatar
            ZStack(alignment: .bottomTrailing) {
                if let avatarUrl = conversation.technician?.avatarUrl, let url = URL(string: avatarUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        avatarPlaceholder(conversation)
                    }
                    .frame(width: 48, height: 48)
                    .clipShape(RoundedRectangle(cornerRadius: Radius.sm))
                } else {
                    avatarPlaceholder(conversation)
                }

                // Online dot (placeholder)
                Circle()
                    .fill(NBColors.muted)
                    .frame(width: 7, height: 7)
            }

            // Body
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(displayName(conversation))
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(NBColors.ink)
                        .lineLimit(1)

                    Spacer()

                    if let time = conversation.lastMessageAt {
                        Text(formatTime(time))
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.muted)
                    }
                }

                HStack {
                    Text(conversation.lastMessage ?? "")
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.muted)
                        .lineLimit(2)

                    Spacer()

                    if let unread = conversation.unreadCount, unread > 0 {
                        Text(unread > 99 ? "99+" : "\(unread)")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 5)
                            .frame(minWidth: 18, minHeight: 18)
                            .background(NBColors.success)
                            .cornerRadius(9)
                    }
                }
            }
        }
        .padding(16)
        .background(Color.white.opacity(0.86))
        .cornerRadius(Radius.lg)
        .shadow(color: Color.black.opacity(0.08), radius: 20, y: 4)
    }

    private func avatarPlaceholder(_ conversation: Conversation) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: Radius.sm)
                .fill(NBColors.page)
                .frame(width: 48, height: 48)

            Text(String(displayName(conversation).prefix(1)))
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(NBColors.action)
        }
    }

    // MARK: - Skeleton Card

    private var skeletonCard: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: Radius.sm)
                .fill(NBColors.page)
                .frame(width: 48, height: 48)

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(NBColors.page)
                        .frame(width: 100, height: 16)
                    Spacer()
                    RoundedRectangle(cornerRadius: 4)
                        .fill(NBColors.page)
                        .frame(width: 40, height: 14)
                }

                RoundedRectangle(cornerRadius: 4)
                    .fill(NBColors.page)
                    .frame(height: 14)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(16)
        .background(Color.white.opacity(0.86))
        .cornerRadius(Radius.lg)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()

            ZStack {
                Circle()
                    .fill(NBColors.page)
                    .frame(width: 64, height: 64)

                RoundedRectangle(cornerRadius: 7)
                    .fill(NBColors.action.opacity(0.5))
                    .frame(width: 26, height: 26)
            }

            Text("消息会在这里聚合")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(NBColors.ink)

            Text("预约提醒和服务通知会统一显示在消息页")
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)
                .lineSpacing(1.4)

            Spacer()
        }
        .padding(.horizontal, 24)
        .background(Color.white.opacity(0.86))
        .cornerRadius(Radius.lg)
        .shadow(color: Color.black.opacity(0.08), radius: 20, y: 4)
        .padding(.horizontal, 20)
        .padding(.top, role == .client ? 0 : 16)
    }

    // MARK: - Socket Listener

    private func setupSocketListener() {
        socketManager.onNewMessage = { [self] message in
            if let index = conversations.firstIndex(where: { $0.id == message.conversationId }) {
                var updated = conversations[index]
                updated.lastMessage = message.messageType == "image" ? "[图片]" : message.content
                updated.lastMessageAt = message.createdAt
                if message.senderType != role.rawValue {
                    updated.unreadCount = (updated.unreadCount ?? 0) + 1
                }
                conversations.remove(at: index)
                conversations.insert(updated, at: 0)
            } else {
                Task { await loadConversations() }
            }
        }
    }

    // MARK: - Helpers

    private func displayName(_ conversation: Conversation) -> String {
        if role == .client {
            return conversation.technician?.name ?? "美甲师"
        } else {
            return conversation.client?.nickname ?? "客户"
        }
    }

    private func formatTime(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return "" }

        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            let timeFormatter = DateFormatter()
            timeFormatter.dateFormat = "HH:mm"
            return timeFormatter.string(from: date)
        } else if calendar.isDateInYesterday(date) {
            return "昨天"
        } else {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "MM/dd"
            return dateFormatter.string(from: date)
        }
    }

    private func loadConversations() async {
        do {
            conversations = try await APIClient.shared.request(.conversations(role: role))
            isLoading = false
        } catch {
            isLoading = false
        }
    }
}

// MARK: - Preview

#Preview {
    ConversationsView(role: .client)
}
