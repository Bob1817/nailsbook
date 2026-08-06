import Foundation
import UserNotifications
import UIKit

// MARK: - Push Notification Service

class PushNotificationService: NSObject, ObservableObject {
    static let shared = PushNotificationService()

    @Published var isRegistered = false
    private var deviceToken: String?

    private override init() {
        super.init()
    }

    func requestPermission() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .badge, .sound])
            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
            return granted
        } catch {
            return false
        }
    }

    func registerDeviceToken(_ token: Data) {
        let tokenString = token.map { String(format: "%02.2hhx", $0) }.joined()
        deviceToken = tokenString

        Task {
            guard let role = await TokenManager.shared.getCurrentRole() else { return }
            do {
                _ = try await APIClient.shared.requestVoid(.registerDeviceToken(token: tokenString, role: role))
                await MainActor.run { isRegistered = true }
            } catch {}
        }
    }

    func handleNotification(_ userInfo: [AnyHashable: Any]) {
        // Handle deep link from push notification
        if let deepLink = userInfo["deepLink"] as? String {
            NotificationCenter.default.post(name: .deepLinkReceived, object: deepLink)
        }
    }
}

extension Notification.Name {
    static let deepLinkReceived = Notification.Name("deepLinkReceived")
}
