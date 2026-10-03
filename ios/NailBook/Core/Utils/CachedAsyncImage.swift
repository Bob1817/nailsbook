import SwiftUI

// MARK: - Image Cache

actor ImageCache {
    static let shared = ImageCache()
    private let cache = NSCache<NSString, UIImage>()

    func get(_ key: String) -> UIImage? {
        cache.object(forKey: key as NSString)
    }

    func set(_ key: String, image: UIImage) {
        cache.setObject(image, forKey: key as NSString)
    }
}

// MARK: - Cached Async Image

struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    private let url: String?
    private let content: (Image) -> Content
    private let placeholder: () -> Placeholder

    @State private var image: UIImage?
    @State private var isLoading = false

    init(
        url: String?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
    }

    var body: some View {
        Group {
            if let uiImage = image {
                content(Image(uiImage: uiImage))
            } else {
                placeholder()
            }
        }
        .task { await loadImage() }
    }

    @MainActor
    private func loadImage() async {
        guard let url = url, !url.isEmpty, image == nil else { return }

        // Check cache first
        if let cached = await ImageCache.shared.get(url) {
            self.image = cached
            return
        }

        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            guard let imageURL = URL(string: url) else { return }
            let (data, _) = try await URLSession.shared.data(from: imageURL)
            guard let uiImage = UIImage(data: data) else { return }
            await ImageCache.shared.set(url, image: uiImage)
            self.image = uiImage
        } catch {}
    }
}

// MARK: - Convenience init for simple AsyncImage replacement

extension CachedAsyncImage where Content == Image {
    init(url: String?, @ViewBuilder placeholder: @escaping () -> Placeholder) {
        self.init(url: url, content: { $0.resizable() }, placeholder: placeholder)
    }
}