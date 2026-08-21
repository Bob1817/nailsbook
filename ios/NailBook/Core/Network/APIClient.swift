import Foundation

class APIClient: ObservableObject {
    static let shared = APIClient()

    private let baseURL = "https://api.lunails.cn/api"
    private let session: URLSession
    private let decoder: JSONDecoder
    private var isRefreshing = false
    private var refreshContinuations: [CheckedContinuation<Void, Error>] = []

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 30
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.decoder.dateDecodingStrategy = .iso8601
    }

    // MARK: - Public API

    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        let data = try await performRequest(endpoint)
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    func requestVoid(_ endpoint: Endpoint) async throws {
        _ = try await performRequest(endpoint)
    }

    func uploadImage(data: Data, filename: String, role: UserRole) async throws -> UploadResponse {
        let boundary = UUID().uuidString
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        let url = URL(string: baseURL + Endpoint.uploadImage(role: role).path)!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        if let token = await TokenManager.shared.getAccessToken(for: role) {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (responseData, response) = try await session.upload(for: request, from: body)
        try checkResponse(response, data: responseData)
        return try decoder.decode(UploadResponse.self, from: responseData)
    }

    // MARK: - Private

    private func performRequest(_ endpoint: Endpoint) async throws -> Data {
        var urlComponents = URLComponents(string: baseURL + endpoint.path)!
        if let queryItems = endpoint.queryItems {
            urlComponents.queryItems = queryItems
        }

        var request = URLRequest(url: urlComponents.url!)
        request.httpMethod = endpoint.method

        // Add auth token
        let role: UserRole = endpoint.path.hasPrefix("/client") ? .client : .technician
        if let token = await TokenManager.shared.getAccessToken(for: role) {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Add body
        if let body = endpoint.body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        // Special: refresh token body
        if case .refreshToken(let r) = endpoint {
            if let rt = await TokenManager.shared.getRefreshToken(for: r) {
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.httpBody = try JSONSerialization.data(withJSONObject: ["refreshToken": rt])
            }
        }

        let (data, response) = try await session.data(for: request)

        // Handle 401 with token refresh
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 401 {
            try await refreshTokenIfNeeded(role: role)
            // Retry original request
            return try await performRequest(endpoint)
        }

        try checkResponse(response, data: data)
        return data
    }

    private func checkResponse(_ response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            var message: String?
            if let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data) {
                message = errorResponse.message ?? errorResponse.error
            }
            throw APIError.httpError(statusCode: httpResponse.statusCode, message: message)
        }
    }

    private func refreshTokenIfNeeded(role: UserRole) async throws {
        if isRefreshing {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                refreshContinuations.append(continuation)
            }
            return
        }

        isRefreshing = true
        defer {
            isRefreshing = false
            let continuations = refreshContinuations
            refreshContinuations = []
            continuations.forEach { $0.resume() }
        }

        guard let refreshToken = await TokenManager.shared.getRefreshToken(for: role) else {
            throw APIError.tokenRefreshFailed
        }

        let endpoint = Endpoint.refreshToken(role: role)
        var urlComponents = URLComponents(string: baseURL + endpoint.path)!
        var request = URLRequest(url: urlComponents.url!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["refreshToken": refreshToken])

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.tokenRefreshFailed
        }

        let tokenResponse = try decoder.decode(TokenResponse.self, from: data)
        await TokenManager.shared.saveTokens(
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken,
            role: role
        )
    }
}

// MARK: - Response Models

struct TokenResponse: Codable {
    let accessToken: String
    let refreshToken: String
}

struct UploadResponse: Codable {
    let url: String
    let filename: String?
}
