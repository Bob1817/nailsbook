import Foundation
import SocketIO

// MARK: - Socket.IO Chat Manager

@MainActor
class ChatSocketManager: ObservableObject {
    static let shared = ChatSocketManager()

    private var manager: SocketManager?
    private var socket: SocketIOClient?

    @Published var isConnected = false
    @Published var onNewMessage: ((ChatMessage) -> Void)?
    @Published var onTyping: ((Int, Bool) -> Void)? // conversationId, isTyping
    @Published var onConversationUpdate: ((Int) -> Void)? // conversationId that got a new message

    // Reconnection
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 8
    private var reconnectTimer: Timer?
    private var storedToken: String?
    private var storedRole: UserRole?

    private init() {}

    func connect(token: String, role: UserRole) {
        storedToken = token
        storedRole = role
        reconnectAttempts = 0

        let baseURL = APIClient.shared.baseURLString.replacingOccurrences(of: "/api", with: "")
        guard let url = URL(string: baseURL.hasPrefix("http") ? baseURL : "wss://api.lunails.cn") else { return }

        manager = SocketManager(socketURL: url, config: [
            .log(false),
            .compress,
            .forceWebsockets(true),
            .extraHeaders(["Authorization": "Bearer \(token)"]),
            .connectParams(["token": token]),
            .reconnects(false) // We handle reconnection manually
        ])
        socket = manager?.defaultSocket

        setupListeners()
        socket?.connect()
    }

    func disconnect() {
        reconnectTimer?.invalidate()
        reconnectTimer = nil
        storedToken = nil
        storedRole = nil
        socket?.disconnect()
        socket = nil
        manager = nil
        isConnected = false
        reconnectAttempts = 0
    }

    func sendMessage(conversationId: Int?, techId: Int?, clientId: Int?,
                     messageType: String, content: String? = nil,
                     imageUrl: String? = nil, relatedType: String? = nil,
                     relatedId: Int? = nil) {
        var data: [String: Any] = [
            "messageType": messageType
        ]
        if let cid = conversationId { data["conversationId"] = cid }
        if let tid = techId { data["techId"] = tid }
        if let clid = clientId { data["clientId"] = clid }
        if let c = content { data["content"] = c }
        if let img = imageUrl { data["imageUrl"] = img }
        if let rt = relatedType { data["relatedType"] = rt }
        if let rid = relatedId { data["relatedId"] = rid }

        socket?.emit("message:send", data)
    }

    func markRead(conversationId: Int) {
        socket?.emit("message:read", ["conversationId": conversationId])
    }

    func startTyping(conversationId: Int) {
        socket?.emit("typing:start", ["conversationId": conversationId])
    }

    func stopTyping(conversationId: Int) {
        socket?.emit("typing:stop", ["conversationId": conversationId])
    }

    // MARK: - Listeners

    private func setupListeners() {
        socket?.on(clientEvent: .connect) { [weak self] _, _ in
            Task { @MainActor in
                self?.isConnected = true
                self?.reconnectAttempts = 0
                self?.reconnectTimer?.invalidate()
                self?.reconnectTimer = nil
            }
        }

        socket?.on(clientEvent: .disconnect) { [weak self] _, _ in
            Task { @MainActor in
                self?.isConnected = false
                self?.scheduleReconnect()
            }
        }

        socket?.on(clientEvent: .error) { [weak self] data, _ in
            Task { @MainActor in
                self?.isConnected = false
                self?.scheduleReconnect()
            }
        }

        socket?.on("message:new") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let messageData = dict["message"] as? [String: Any] else { return }
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: messageData)
                let message = try JSONDecoder().decode(ChatMessage.self, from: jsonData)
                Task { @MainActor in
                    self?.onNewMessage?(message)
                    self?.onConversationUpdate?(message.conversationId)
                }
            } catch {}
        }

        socket?.on("typing:start") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let convId = dict["conversationId"] as? Int else { return }
            Task { @MainActor in
                self?.onTyping?(convId, true)
            }
        }

        socket?.on("typing:stop") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let convId = dict["conversationId"] as? Int else { return }
            Task { @MainActor in
                self?.onTyping?(convId, false)
            }
        }

        socket?.on("presence:online") { _, _ in }
        socket?.on("presence:offline") { _, _ in }
    }

    // MARK: - Reconnection

    private func scheduleReconnect() {
        guard reconnectAttempts < maxReconnectAttempts,
              let token = storedToken, let role = storedRole else { return }

        reconnectTimer?.invalidate()

        // Exponential backoff: 1s, 2s, 4s, 8s, ... capped at 30s
        let delay = min(pow(2.0, Double(reconnectAttempts)), 30.0)
        reconnectAttempts += 1

        reconnectTimer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            Task { @MainActor in
                self?.connect(token: token, role: role)
            }
        }
    }
}
