import SwiftUI
import UserNotifications

@main
struct NailBookApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var appState = AppState.shared
    @StateObject private var deepLinkService = DeepLinkService.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .environmentObject(deepLinkService)
                .task {
                    await appState.restoreSession()
                    _ = await PushNotificationService.shared.requestPermission()
                }
                .onReceive(NotificationCenter.default.publisher(for: .deepLinkReceived)) { notification in
                    handleDeepLink(notification)
                }
        }
    }

    private func handleDeepLink(_ notification: Notification) {
        guard let userInfo = notification.userInfo else { return }
        if let type = userInfo["type"] as? String {
            switch type {
            case "invite":
                if let code = userInfo["code"] as? String {
                    // Navigate to register with code
                }
            case "work":
                if let id = userInfo["id"] as? Int {
                    // Navigate to work detail
                }
            default:
                break
            }
        }
    }
}

// MARK: - App Delegate

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        PushNotificationService.shared.registerDeviceToken(deviceToken)
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Push registration failed: \(error.localizedDescription)")
    }

    func application(_ app: UIApplication,
                     open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        let type = DeepLinkService.shared.parse(url: url)
        DeepLinkService.shared.handle(type)
        return true
    }

    func application(_ application: UIApplication,
                     continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
           let url = userActivity.webpageURL {
            let type = DeepLinkService.shared.parse(url: url)
            DeepLinkService.shared.handle(type)
            return true
        }
        return false
    }
}

// MARK: - Notification Center Delegate

extension AppDelegate: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .badge, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        PushNotificationService.shared.handleNotification(response.notification.request.content.userInfo)
        completionHandler()
    }
}
