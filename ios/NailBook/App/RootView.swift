import SwiftUI

struct RootView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            switch appState.authStatus {
            case .unknown:
                NBLoadingView()
            case .unauthenticated:
                LoginView()
            case .client:
                ClientTabView()
            case .technician:
                TechnicianTabView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: appState.isAuthenticated)
    }
}
