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

    private init() {}

    func connect(token: String, role: UserRole) {
        let url = URL(string: "wss://api.lunails.cn")!
        manager = SocketManager(socketURL: url, config: [
            .log(false),
            .compress,
            .forceWebsockets(true),
            .extraHeaders(["Authorization": "Bearer \(token)"]),
            .connectParams(["token": token])
        ])
        socket = manager?.defaultSocket

        setupListeners()
        socket?.connect()
    }

    func disconnect() {
        socket?.disconnect()
        socket = nil
        manager = nil
        isConnected = false
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
            }
        }

        socket?.on(clientEvent: .disconnect) { [weak self] _, _ in
            Task { @MainActor in
                self?.isConnected = false
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
}
