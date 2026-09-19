import XCTest
@testable import NailBook

@MainActor
final class PhaseOneTests: XCTestCase {
    func testMoneyBoundariesAndPrecision() {
        XCTAssertEqual(OrderMoney.fen("0.01"), 1)
        XCTAssertEqual(OrderMoney.fen("1000000.00"), 100000000)
        XCTAssertEqual(OrderMoney.fen("150.25"), 15025)
        XCTAssertNil(OrderMoney.fen("0"))
        XCTAssertEqual(OrderMoney.fen("0", allowZero: true), 0)
        for invalid in ["-1", "1.001", "1000000.01", "NaN", "1e2", "", "1,20"] {
            XCTAssertNil(OrderMoney.fen(invalid), invalid)
        }
    }

    func testNativePasswordMatchesServerRequirements() {
        XCTAssertTrue(AccountValidation.validPassword("nail1234"))
        XCTAssertFalse(AccountValidation.validPassword("12345678"))
        XCTAssertFalse(AccountValidation.validPassword("abcdefgh"))
        XCTAssertFalse(AccountValidation.validPassword("abc123"))
    }

    func testRoleRoutingAndPublicRequests() {
        XCTAssertEqual(Endpoint.resource(role: .technician, path: "orders/8/confirm", method: "PATCH").path, "/technician/orders/8/confirm")
        XCTAssertEqual(Endpoint.updateClientProfile(params: [:]).method, "PUT")
        XCTAssertFalse(Endpoint.clientLogin(phone: "", password: "").requiresAuthentication)
        XCTAssertFalse(Endpoint.publicResource(path: "brands/1/services").requiresAuthentication)
        XCTAssertFalse(Endpoint.resource(role: .client, path: "auth/forgot-password/reset", method: "POST").requiresAuthentication)
        XCTAssertTrue(Endpoint.clientMe.requiresAuthentication)
    }

    func testWorkPayloadWithoutPrivateTechnicianID() throws {
        let json = #"{"id":12,"title":"作品","imageUrls":["https://example.com/a.jpg"],"publicationStatus":"pending","isVisible":true,"visibilityScope":"public"}"#
        let work = try JSONDecoder().decode(NailWork.self, from: Data(json.utf8))
        XCTAssertEqual(work.images?.count, 1)
        XCTAssertNil(work.techId)
        XCTAssertEqual(work.publicationStatus, "pending")
    }

    func testTechnicianRawOrderImagesAndClientMappedImages() throws {
        for json in [
            #"{"id":1,"orderNo":"NB1","status":"pending_confirm","customImages":"[\"https://example.com/a.jpg\"]"}"#,
            #"{"id":1,"orderNo":"NB1","status":"pending_confirm","customImages":["https://example.com/a.jpg"]}"#
        ] {
            let order = try JSONDecoder().decode(Order.self, from: Data(json.utf8))
            XCTAssertEqual(order.customImages, ["https://example.com/a.jpg"])
        }
    }

    func testDatesWithAndWithoutFractionalSeconds() {
        XCTAssertNotNil(OrderActionView.parse("2026-09-10T01:00:00Z"))
        XCTAssertNotNil(OrderActionView.parse("2026-09-10T01:00:00.000Z"))
        XCTAssertNil(OrderActionView.parse("invalid"))
    }
}

private final class StubURLProtocol: URLProtocol {
    static var handler: ((URLRequest) throws -> (Int, Data))?
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let (code, data) = try Self.handler!(request)
            let response = HTTPURLResponse(url: request.url!, statusCode: code, httpVersion: nil, headerFields: nil)!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}

@MainActor
final class NetworkContractTests: XCTestCase {
    private func client() -> APIClient {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubURLProtocol.self]
        return APIClient(baseURL: "https://nailbook.invalid/api", session: URLSession(configuration: config))
    }
    func testWrongPasswordDoesNotAttemptTokenRefresh() async {
        var calls = 0
        StubURLProtocol.handler = { request in
            calls += 1
            XCTAssertEqual(request.url?.path, "/api/client/auth/login")
            return (401, Data(#"{"message":"密码错误"}"#.utf8))
        }
        do {
            try await client().requestVoid(.clientLogin(phone: "19900000001", password: "wrong"))
            XCTFail("Expected rejection")
        } catch { XCTAssertEqual(calls, 1) }
    }
    func testPublicServiceListEnvelopeAndQuery() async throws {
        StubURLProtocol.handler = { request in
            XCTAssertEqual(request.url?.query, "pageSize=50")
            XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
            return (200, Data(#"{"items":[{"id":"svc_1","name":"护理","durationMinutes":60,"price":{"min":100,"max":100}}]}"#.utf8))
        }
        let services: [BookingService] = try await client().request(.publicResource(path: "brands/1/services?pageSize=50"))
        XCTAssertEqual(services.first?.id, "svc_1")
    }
    func testTechnicianOrderListEnvelope() async throws {
        StubURLProtocol.handler = { request in
            XCTAssertEqual(request.url?.path, "/api/technician/orders")
            return (200, Data(#"{"data":[{"id":1,"orderNo":"NB1","status":"pending_confirm"}],"total":1}"#.utf8))
        }
        let orders: [Order] = try await client().request(.technicianOrders(status: nil, customerId: nil))
        XCTAssertEqual(orders.first?.status, "pending_confirm")
    }
}
