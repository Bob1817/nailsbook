import SwiftUI

struct ClientTabView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            ClientHomeView()
                .tabItem {
                    Label("首页", systemImage: "house.fill")
                }
                .tag(0)

            ClientOrdersView()
                .tabItem {
                    Label("预约", systemImage: "calendar")
                }
                .tag(1)

            WorksListView()
                .tabItem {
                    Label("发现", systemImage: "sparkles")
                }
                .tag(2)

            ConversationsView(role: .client)
                .tabItem {
                    Label("消息", systemImage: "bubble.left.and.bubble.right.fill")
                }
                .tag(3)

            ClientProfileView()
                .tabItem {
                    Label("我的", systemImage: "person.fill")
                }
                .tag(4)
        }
        .tint(.nbPrimary)
    }
}
