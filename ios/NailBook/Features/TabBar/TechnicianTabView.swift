import SwiftUI

struct TechnicianTabView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            TechnicianHomeView()
                .tabItem {
                    Label("首页", systemImage: "house.fill")
                }
                .tag(0)

            TechnicianScheduleView()
                .tabItem {
                    Label("行程", systemImage: "calendar.badge.clock")
                }
                .tag(1)

            TechnicianCustomersView()
                .tabItem {
                    Label("客户", systemImage: "person.2.fill")
                }
                .tag(2)

            ConversationsView(role: .technician)
                .tabItem {
                    Label("消息", systemImage: "bubble.left.and.bubble.right.fill")
                }
                .tag(3)

            TechnicianProfileView()
                .tabItem {
                    Label("我的", systemImage: "person.fill")
                }
                .tag(4)
        }
        .tint(.nbPrimary)
    }
}
