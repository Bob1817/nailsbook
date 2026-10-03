import Foundation

@MainActor
class APIClient: ObservableObject {
    static let shared = APIClient()

    private let baseURL: String
    private let session: URLSession
    private let decoder: JSONDecoder
    private var refreshTasks: [UserRole: Task<Void, Error>] = [:]

    var baseURLString: String { baseURL }

    init(baseURL: String = ProcessInfo.processInfo.environment["NAILBOOK_API_URL"] ?? "https://api.lunails.cn/api", session: URLSession? = nil) {
        self.baseURL = baseURL
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 30
        self.session = session ?? URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.decoder.dateDecodingStrategy = .iso8601
    }

    // MARK: - Public API

    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        let data = try await performRequest(endpoint)
        do {
            if T.self is APIList.Type,
               let object = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let list = object["data"] as? [Any] ?? object["list"] as? [Any] ?? object["items"] as? [Any] ?? object["works"] as? [Any] ?? object["messages"] as? [Any] {
                return try decoder.decode(T.self, from: JSONSerialization.data(withJSONObject: list))
            }
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

    private func performRequest(_ endpoint: Endpoint, mayRefresh: Bool = true) async throws -> Data {
        var urlComponents = URLComponents(string: baseURL + endpoint.path)!
        if let queryItems = endpoint.queryItems {
            urlComponents.queryItems = queryItems
        }

        var request = URLRequest(url: urlComponents.url!)
        request.httpMethod = endpoint.method

        // Add auth token
        let role: UserRole = endpoint.path.hasPrefix("/client") ? .client : .technician
        if endpoint.requiresAuthentication, let token = await TokenManager.shared.getAccessToken(for: role) {
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
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 401, mayRefresh, endpoint.requiresAuthentication {
            try await refreshTokenIfNeeded(role: role)
            // Retry original request
            return try await performRequest(endpoint, mayRefresh: false)
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
        if let task = refreshTasks[role] { return try await task.value }
        let task = Task { @MainActor in
            guard let refreshToken = await TokenManager.shared.getRefreshToken(for: role) else {
                throw APIError.tokenRefreshFailed
            }
            let endpoint = Endpoint.refreshToken(role: role)
            guard let url = URL(string: baseURL + endpoint.path) else { throw APIError.invalidURL }
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: ["refreshToken": refreshToken])
            let (data, response) = try await session.data(for: request)
            if let http = response as? HTTPURLResponse, [400, 401, 403].contains(http.statusCode) {
                throw APIError.tokenRefreshFailed
            }
            try checkResponse(response, data: data)
            let tokens = try decoder.decode(TokenResponse.self, from: data)
            try await TokenManager.shared.saveTokens(accessToken: tokens.accessToken,
                                                refreshToken: tokens.refreshToken, role: role)
        }
        refreshTasks[role] = task
        defer { refreshTasks[role] = nil }
        try await task.value
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

private protocol APIList {}
extension Array: APIList {}
