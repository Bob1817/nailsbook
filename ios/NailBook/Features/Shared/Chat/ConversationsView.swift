import SwiftUI

// MARK: - Conversations List (Shared)

struct ConversationsView: View {
    let role: UserRole
    @State private var conversations: [Conversation] = []
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    NBLoadingView()
                } else if conversations.isEmpty {
                    NBEmptyState(icon: "bubble.left.and.bubble.right", title: "暂无消息")
                } else {
                    List(conversations) { conversation in
                        NavigationLink(destination: ChatView(
                            conversationId: conversation.id,
                            role: role,
                            partnerName: role == .client
                                ? (conversation.technician?.name ?? "美甲师")
                                : (conversation.client?.nickname ?? "客户")
                        )) {
                            ConversationRow(conversation: conversation, role: role)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("消息")
            .background(Color.nbBg)
            .task { await loadConversations() }
            .refreshable { await loadConversations() }
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

struct ConversationRow: View {
    let conversation: Conversation
    let role: UserRole

    var body: some View {
        HStack(spacing: Spacing.md) {
            // Avatar
            Circle()
                .fill(Color.nbPrimarySoft)
                .frame(width: 48, height: 48)
                .overlay(
                    Text(displayName.prefix(1).description)
                        .font(NBFont.titleMedium)
                        .foregroundColor(.nbPrimary)
                )

            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack {
                    Text(displayName)
                        .font(NBFont.bodyLarge)
                        .foregroundColor(.nbTextPrimary)
                        .lineLimit(1)
                    Spacer()
                    if let time = conversation.lastMessageAt {
                        Text(formatTime(time))
                            .font(NBFont.captionMedium)
                            .foregroundColor(.nbTextMuted)
                    }
                }

                HStack {
                    Text(conversation.lastMessage ?? "")
                        .font(NBFont.bodySmall)
                        .foregroundColor(.nbTextSecondary)
                        .lineLimit(1)
                    Spacer()
                    if let unread = conversation.unreadCount, unread > 0 {
                        Text("\(unread)")
                            .font(NBFont.captionSmall)
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.nbError)
                            .cornerRadius(Radius.full)
                    }
                }
            }
        }
        .padding(.vertical, Spacing.xs)
        .listRowBackground(Color.nbSurface)
    }

    private var displayName: String {
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
}
