import SwiftUI

struct HeroRecommendations: Decodable { let works: [NailWork] }

struct HeroRecommendationsView: View {
    @State private var works: [NailWork] = []
    @State private var selected: [NailWork] = []
    @State private var replacing: NailWork?
    @State private var removing: NailWork?
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        List {
            Section("客户首页推荐 · \(selected.count)/3") {
                ForEach(selected) { work in
                    VStack(alignment: .leading) {
                        TechWorkRow(work: work)
                        Button("取消推荐", role: .destructive) { removing = work }.frame(minHeight: 44)
                    }
                }
            }
            Section("可推荐作品") {
                ForEach(works.filter { candidate in !selected.contains(where: { $0.id == candidate.id }) }) { work in
                    Button {
                        if selected.count < 3 { save(selected.map(\.id) + [work.id]) }
                        else { replacing = work }
                    } label: { TechWorkRow(work: work) }
                }
            }
            if let error { Text(error); Button("重新加载") { Task { await load() } } }
            if busy { ProgressView() }
        }
        .navigationTitle("客户首页推荐")
        .disabled(busy)
        .task { await load() }
        .confirmationDialog("选择要替换的推荐作品", isPresented: Binding(get: { replacing != nil }, set: { if !$0 { replacing = nil } }), titleVisibility: .visible) {
            ForEach(selected) { old in
                Button("替换「\(old.title ?? "作品")」") {
                    guard let replacement = replacing else { return }
                    save(selected.map { $0.id == old.id ? replacement.id : $0.id })
                }
            }
        }
        .confirmationDialog("取消客户首页推荐？", isPresented: Binding(get: { removing != nil }, set: { if !$0 { removing = nil } }), titleVisibility: .visible) {
            Button("取消推荐", role: .destructive) { save(selected.filter { $0.id != removing?.id }.map(\.id)) }
        }
    }

    private func load() async {
        busy = true
        defer { busy = false }
        do {
            let all: [NailWork] = try await APIClient.shared.request(.techWorks)
            works = all.filter { $0.publicationStatus == "approved" && $0.isVisible == true && $0.visibilityScope == "public" && $0.archivedAt == nil && !($0.coverUrl ?? "").isEmpty }
            let response: HeroRecommendations = try await APIClient.shared.request(.resource(role: .technician, path: "works/hero-recommendations"))
            selected = response.works
            error = nil
        } catch { self.error = error.localizedDescription }
    }
    private func save(_ ids: [Int]) {
        guard !busy else { return }
        busy = true
        let expected = selected.map(\.id)
        Task {
            defer { busy = false }
            do {
                let response: HeroRecommendations = try await APIClient.shared.request(.resource(role: .technician, path: "works/hero-recommendations", method: "PUT", body: ["workIds": ids, "expectedWorkIds": expected]))
                selected = response.works
                error = nil
            } catch {
                self.error = error.localizedDescription
                if let response: HeroRecommendations = try? await APIClient.shared.request(.resource(role: .technician, path: "works/hero-recommendations")) { selected = response.works }
            }
        }
    }
}
