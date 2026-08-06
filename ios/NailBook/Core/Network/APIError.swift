import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int, message: String?)
    case decodingError(Error)
    case networkError(Error)
    case unauthorized
    case tokenRefreshFailed

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "无效的请求地址"
        case .invalidResponse: return "服务器响应异常"
        case .httpError(_, let msg): return msg ?? "请求失败"
        case .decodingError: return "数据解析失败"
        case .networkError(let err): return err.localizedDescription
        case .unauthorized: return "登录已过期，请重新登录"
        case .tokenRefreshFailed: return "登录已过期，请重新登录"
        }
    }
}

struct APIErrorResponse: Codable {
    let message: String?
    let error: String?
    let statusCode: Int?
}
