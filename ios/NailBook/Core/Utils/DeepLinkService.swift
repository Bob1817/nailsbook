import Foundation

// MARK: - Deep Link Service

class DeepLinkService: ObservableObject {
    static let shared = DeepLinkService()

    enum DeepLinkType {
        case invite(code: String)
        case work(id: Int)
        case artist(code: String)
        case unknown
    }

    @Published var pendingInviteCode: String?
    @Published var pendingWorkId: Int?
    @Published var pendingArtistCode: String?

    private init() {}

    func parse(url: URL) -> DeepLinkType {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true) else {
            return .unknown
        }

        let path = components.path
        let queryItems = components.queryItems ?? []

        // Invite link: /invite?invite_code=xxx or ?invite=xxx
        if path.contains("invite") {
            if let code = queryItems.first(where: { $0.name == "invite_code" || $0.name == "invite" })?.value {
                return .invite(code: code)
            }
        }

        // Work share: /w/:id
        if path.hasPrefix("/w/") {
            let idString = path.replacingOccurrences(of: "/w/", with: "")
            if let id = Int(idString) {
                return .work(id: id)
            }
        }

        // Artist card: /artist/:code
        if path.hasPrefix("/artist/") {
            let code = path.replacingOccurrences(of: "/artist/", with: "")
            return .artist(code: code)
        }

        return .unknown
    }

    func handle(_ type: DeepLinkType) {
        switch type {
        case .invite(let code):
            pendingInviteCode = code
            NotificationCenter.default.post(
                name: .deepLinkReceived,
                object: nil,
                userInfo: ["type": "invite", "code": code]
            )
        case .work(let id):
            pendingWorkId = id
            NotificationCenter.default.post(
                name: .deepLinkReceived,
                object: nil,
                userInfo: ["type": "work", "id": id]
            )
        case .artist(let code):
            pendingArtistCode = code
            NotificationCenter.default.post(
                name: .deepLinkReceived,
                object: nil,
                userInfo: ["type": "artist", "code": code]
            )
        case .unknown:
            break
        }
    }

    func clearPending() {
        pendingInviteCode = nil
        pendingWorkId = nil
        pendingArtistCode = nil
    }
}
