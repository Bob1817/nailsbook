import Foundation

// MARK: - API Endpoint Definitions

enum Endpoint {
    case resource(role: UserRole, path: String, method: String = "GET", body: [String: Any]? = nil)
    case publicResource(path: String)

    // Auth
    case clientLogin(phone: String, password: String)
    case clientRegister(phone: String, password: String, inviteCode: String)
    case clientMe
    case technicianLogin(phone: String, password: String)
    case technicianRegister(key: String, phone: String, password: String)
    case technicianMe
    case refreshToken(role: UserRole)
    case checkPhone(role: UserRole, phone: String)
    case findTechnicianByInviteCode(code: String)
    case bindTechnician(inviteCode: String, note: String?, source: String?)
    case activateTechnician(activationKey: String)
    case updateClientProfile(params: [String: Any])
    case updateTechnicianProfile(params: [String: Any])
    case changePassword(role: UserRole, oldPassword: String, newPassword: String)
    case registerDeviceToken(token: String, role: UserRole)

    // Client Home
    case clientHome
    case featuredWorks(page: Int, limit: Int)
    case clientWorks(techId: Int?, sortBy: String?, sortDir: String?)
    case workDetail(id: Int)
    case likeWork(id: Int)
    case favoriteWork(id: Int)
    case workComments(id: Int, page: Int)
    case addComment(workId: Int, content: String, parentId: Int?)
    case updateComment(workId: Int, commentId: Int, content: String)
    case deleteComment(workId: Int, commentId: Int)
    case favoritesList(page: Int)
    case likesList(page: Int)

    // Orders
    case clientOrders
    case clientOrderDetail(id: Int)
    case createClientOrder(params: [String: Any])
    case updateOrderStatus(id: Int, status: String)
    case agreeOrder(id: Int, amount: Double?)
    case rejectQuote(id: Int, reason: String?)
    case markDepositPaid(id: Int)
    case blockedSlots(techId: Int)

    // Technician Orders
    case technicianOrders(status: String?, customerId: Int?)
    case techOrderDetail(id: Int)
    case quoteOrder(id: Int, price: Double, remark: String?)
    case confirmOrder(id: Int, depositConfirmed: Bool?)
    case completeOrder(id: Int, params: [String: Any]?)
    case cancelOrder(id: Int, reason: String?)
    case createTechOrder(params: [String: Any])

    // Designs
    case clientDesigns
    case designDetail(id: Int)
    case createDesign(params: [String: Any])
    case updateDesign(id: Int, params: [String: Any])
    case deleteDesign(id: Int)
    case acceptDesignQuote(id: Int)
    case rejectDesignQuote(id: Int)
    case technicianDesigns
    case quoteDesign(id: Int, price: Double, remark: String?)

    // Addresses
    case addresses
    case createAddress(params: [String: Any])
    case updateAddress(id: Int, params: [String: Any])
    case deleteAddress(id: Int)
    case setDefaultAddress(id: Int)

    // Chat / Messages
    case conversations(role: UserRole)
    case messages(conversationId: Int, role: UserRole)
    case sendMessage(params: [String: Any], role: UserRole)
    case markRead(conversationId: Int, role: UserRole)

    // Technician Customers
    case customers(search: String?, tags: String?)
    case customerDetail(id: Int)
    case updateCustomerTags(id: Int, tags: [String])
    case customerTags
    case createCustomerFollowUp(id: Int, content: String, plannedAt: String)
    case completeCustomerFollowUp(customerId: Int, followUpId: Int)

    // Technician Works
    case techWorks
    case techWorkDetail(id: Int)
    case createWork(params: [String: Any])
    case updateWork(id: Int, params: [String: Any])
    case deleteWork(id: Int)
    case toggleWorkVisible(id: Int)
    case toggleWorkPinned(id: Int)
    case toggleWorkFeatured(id: Int)

    // Services
    case services
    case createService(params: [String: Any])
    case updateService(id: String, params: [String: Any])
    case toggleService(id: String)
    case deleteService(id: String)

    // Shop Management
    case technicianShops
    case updateShopAddresses(shops: [[String: Any]], shopService: Bool)

    // Booking Days
    case bookingDaysList
    case bookingDayUpdate(date: String, accepting: Bool, version: Int)
    case bookingDaysSettingsUpdate(params: [String: Any])

    // Brand Profile
    case brandProfileGet
    case brandProfileUpdate(params: [String: Any])

    // Subscriptions
    case subscriptionPlans
    case subscriptionCurrent

    // Referrals
    case referralRelations

    // Insights
    case technicianInsights(month: String?)

    // Artist Interactions
    case artistInteractions

    // Beauty Archive
    case beautyArchive

    // Public Artist / Brand
    case publicArtistProfile(id: Int)
    case publicShopGuidance(id: Int, shopName: String?, address: String?)
    case publicBrandServices(id: Int)
    case publicBrandReviews(id: Int)
    case clientWorksPublic(techId: Int, page: Int)

    // Client Follow
    case clientFollowStatus(artistId: Int)
    case clientFollowArtist(artistId: Int)
    case clientUnfollowArtist(artistId: Int)

    // Uploads
    case uploadImage(role: UserRole)
    case uploadAudio(role: UserRole)

    // MARK: - Properties

    var requiresAuthentication: Bool {
        switch self {
        case .resource(_, let path, _, _): return !path.hasPrefix("auth/forgot-password/")
        case .publicResource, .clientLogin, .clientRegister, .technicianLogin, .technicianRegister,
             .refreshToken, .checkPhone, .findTechnicianByInviteCode,
             .publicArtistProfile, .publicShopGuidance, .publicBrandServices, .publicBrandReviews:
            return false
        default: return true
        }
    }

    var path: String {
        switch self {
        case .resource(let role, let path, _, _): return "/\(role.rawValue)/\(path)"
        case .publicResource(let path): return "/public/\(path)"
        // Auth
        case .clientLogin: return "/client/auth/login"
        case .blockedSlots(let techId): return "/client/orders/blocked-slots/\(techId)"
        case .clientRegister: return "/client/auth/register-by-invite"
        case .clientMe: return "/client/auth/me"
        case .technicianLogin: return "/technician/auth/login"
        case .technicianRegister: return "/technician/auth/register"
        case .technicianMe: return "/technician/auth/me"
        case .refreshToken(let role): return "/\(role.rawValue)/auth/refresh"
        case .checkPhone(let role, _): return "/\(role.rawValue)/auth/check-phone"
        case .findTechnicianByInviteCode: return "/client/auth/find-by-invite-code"
        case .bindTechnician: return "/client/auth/bind-technician"
        case .activateTechnician: return "/client/auth/activate-technician"
        case .updateClientProfile: return "/client/auth/me"
        case .updateTechnicianProfile: return "/technician/auth/profile"
        case .changePassword(let role, _, _): return "/\(role.rawValue)/auth/password"
        case .registerDeviceToken(_, let role): return "/\(role.rawValue)/auth/device-token"

        // Client Home
        case .clientHome: return "/client/home"
        case .featuredWorks: return "/client/featured-works"
        case .clientWorks: return "/client/works"
        case .workDetail(let id): return "/client/works/\(id)"
        case .likeWork(let id): return "/client/works/\(id)/like"
        case .favoriteWork(let id): return "/client/works/\(id)/favorite"
        case .workComments(let id, _): return "/client/works/\(id)/comments"
        case .addComment(let id, _, _): return "/client/works/\(id)/comments"
        case .updateComment(let wid, let cid, _): return "/client/works/\(wid)/comments/\(cid)"
        case .deleteComment(let wid, let cid): return "/client/works/\(wid)/comments/\(cid)"
        case .favoritesList: return "/client/favorites"
        case .likesList: return "/client/likes"

        // Orders
        case .clientOrders: return "/client/orders"
        case .clientOrderDetail(let id): return "/client/orders/\(id)"
        case .createClientOrder: return "/client/orders"
        case .updateOrderStatus(let id, _): return "/client/orders/\(id)/status"
        case .agreeOrder(let id, _): return "/client/orders/\(id)/agree"
        case .rejectQuote(let id, _): return "/client/orders/\(id)/reject-quote"
        case .markDepositPaid(let id): return "/client/orders/\(id)/mark-deposit-paid"
        case .blockedSlots(let id): return "/client/orders/blocked-slots/\(id)"

        // Technician Orders
        case .technicianOrders: return "/technician/orders"
        case .techOrderDetail(let id): return "/technician/orders/\(id)"
        case .quoteOrder(let id, _, _): return "/technician/orders/\(id)/review"
        case .confirmOrder(let id, _): return "/technician/orders/\(id)/confirm"
        case .completeOrder(let id, _): return "/technician/orders/\(id)/complete"
        case .cancelOrder(let id, _): return "/technician/orders/\(id)/cancel"
        case .createTechOrder: return "/technician/orders"

        // Designs
        case .clientDesigns: return "/client/designs"
        case .designDetail(let id): return "/client/designs/\(id)"
        case .createDesign: return "/client/designs"
        case .updateDesign(let id, _): return "/client/designs/\(id)"
        case .deleteDesign(let id): return "/client/designs/\(id)"
        case .acceptDesignQuote(let id): return "/client/designs/\(id)/accept-quote"
        case .rejectDesignQuote(let id): return "/client/designs/\(id)/reject-quote"
        case .technicianDesigns: return "/technician/designs"
        case .quoteDesign(let id, _, _): return "/technician/designs/\(id)/quote"

        // Addresses
        case .addresses: return "/client/addresses"
        case .createAddress: return "/client/addresses"
        case .updateAddress(let id, _): return "/client/addresses/\(id)"
        case .deleteAddress(let id): return "/client/addresses/\(id)"
        case .setDefaultAddress(let id): return "/client/addresses/\(id)/default"

        // Chat
        case .conversations(let role): return "/\(role.rawValue)/messages/conversations"
        case .messages(_, let role): return "/\(role.rawValue)/messages"
        case .sendMessage(_, let role): return "/\(role.rawValue)/messages"
        case .markRead(_, let role): return "/\(role.rawValue)/messages/read"

        // Customers
        case .customers: return "/technician/customers"
        case .customerDetail(let id): return "/technician/customers/\(id)"
        case .updateCustomerTags(let id, _): return "/technician/customers/\(id)/tags"
        case .customerTags: return "/technician/customers/tags"
        case .createCustomerFollowUp(let id, _, _): return "/technician/customers/\(id)/follow-ups"
        case .completeCustomerFollowUp(let customerId, let followUpId): return "/technician/customers/\(customerId)/follow-ups/\(followUpId)/complete"

        // Technician Works
        case .techWorks: return "/technician/works"
        case .techWorkDetail(let id): return "/technician/works/\(id)"
        case .createWork: return "/technician/works"
        case .updateWork(let id, _): return "/technician/works/\(id)"
        case .deleteWork(let id): return "/technician/works/\(id)"
        case .toggleWorkVisible(let id): return "/technician/works/\(id)/toggle-visible"
        case .toggleWorkPinned(let id): return "/technician/works/\(id)/toggle-pinned"
        case .toggleWorkFeatured(let id): return "/technician/works/\(id)/toggle-featured"

        // Services
        case .services: return "/technician/services"
        case .createService: return "/technician/services"
        case .updateService(let id, _): return "/technician/services/\(id)"
        case .toggleService(let id): return "/technician/services/\(id)/toggle"
        case .deleteService(let id): return "/technician/services/\(id)"

        // Shop Management
        case .technicianShops: return "/technician/auth/me"
        case .updateShopAddresses: return "/technician/auth/service-type"

        // Booking Days
        case .bookingDaysList: return "/technician/booking-days"
        case .bookingDayUpdate(let date, _, _): return "/technician/booking-days/\(date)"
        case .bookingDaysSettingsUpdate: return "/technician/booking-days/settings"

        // Brand Profile
        case .brandProfileGet: return "/technician/brand-profile"
        case .brandProfileUpdate: return "/technician/brand-profile"

        // Subscriptions
        case .subscriptionPlans: return "/technician/subscriptions/plans"
        case .subscriptionCurrent: return "/technician/subscriptions/current"

        // Referrals
        case .referralRelations: return "/technician/referrals"

        // Insights
        case .technicianInsights: return "/technician/insights/overview"

        // Artist Interactions
        case .artistInteractions: return "/technician/artist-interactions"

        // Beauty Archive
        case .beautyArchive: return "/client/beauty-archive"

        // Public Artist / Brand
        case .publicArtistProfile(let id): return "/public/artist/id/\(id)"
        case .publicShopGuidance(let id, _, _): return "/public/artist/id/\(id)/shop-guidance"
        case .publicBrandServices(let id): return "/public/brands/\(id)/services"
        case .publicBrandReviews(let id): return "/public/brands/\(id)/reviews"
        case .clientWorksPublic(let techId, _): return "/client/works"

        // Client Follow
        case .clientFollowStatus(let id): return "/client/artists/\(id)/follow"
        case .clientFollowArtist(let id): return "/client/artists/\(id)/follow"
        case .clientUnfollowArtist(let id): return "/client/artists/\(id)/follow"

        // Uploads
        case .uploadImage(let role): return "/\(role.rawValue)/uploads/image"
        case .uploadAudio(let role): return "/\(role.rawValue)/uploads/audio"
        }
    }

    var method: String {
        switch self {
        case .resource(_, _, let method, _): return method
        case .clientLogin, .clientRegister, .technicianLogin, .technicianRegister,
             .refreshToken, .checkPhone, .createClientOrder, .createTechOrder,
             .createDesign, .createWork, .createService, .createAddress,
             .sendMessage, .addComment, .likeWork, .favoriteWork,
             .agreeOrder, .markDepositPaid, .registerDeviceToken,
             .acceptDesignQuote, .rejectDesignQuote,
             .uploadImage, .uploadAudio, .createCustomerFollowUp,
             .bindTechnician, .activateTechnician:
            return "POST"

        case .updateClientProfile, .updateComment: return "PUT"

        case .updateTechnicianProfile, .changePassword,
             .updateOrderStatus, .quoteOrder, .confirmOrder, .completeOrder,
             .cancelOrder, .updateDesign, .updateAddress, .updateWork,
             .updateService, .updateCustomerTags, .markRead,
             .toggleService, .setDefaultAddress, .completeCustomerFollowUp,
             .bookingDayUpdate, .bookingDaysSettingsUpdate, .brandProfileUpdate:
            return "PATCH"

        case .deleteComment, .deleteDesign, .deleteAddress, .deleteWork, .deleteService:
            return "DELETE"

        case .clientFollowArtist:
            return "POST"

        case .clientUnfollowArtist:
            return "DELETE"

        case .toggleWorkVisible, .toggleWorkPinned, .toggleWorkFeatured,
             .rejectQuote:
            return "POST"

        case .updateShopAddresses:
            return "PATCH"

        default:
            return "GET"
        }
    }

    var queryItems: [URLQueryItem]? {
        switch self {
        case .featuredWorks(let page, let limit):
            return [URLQueryItem(name: "page", value: "\(page)"),
                    URLQueryItem(name: "limit", value: "\(limit)")]
        case .clientWorks(let techId, let sortBy, let sortDir):
            var items = [URLQueryItem]()
            if let t = techId { items.append(URLQueryItem(name: "techId", value: "\(t)")) }
            if let s = sortBy { items.append(URLQueryItem(name: "sortBy", value: s)) }
            if let d = sortDir { items.append(URLQueryItem(name: "sortDir", value: d)) }
            return items.isEmpty ? nil : items
        case .workComments(_, let page):
            return [URLQueryItem(name: "page", value: "\(page)")]
        case .favoritesList(let page), .likesList(let page):
            return [URLQueryItem(name: "page", value: "\(page)")]
        case .technicianOrders(let status, let customerId):
            var items = [URLQueryItem]()
            if let s = status { items.append(URLQueryItem(name: "status", value: s)) }
            if let c = customerId { items.append(URLQueryItem(name: "customerId", value: "\(c)")) }
            return items.isEmpty ? nil : items
        case .customers(let search, let tags):
            var items = [URLQueryItem]()
            if let s = search { items.append(URLQueryItem(name: "search", value: s)) }
            if let t = tags { items.append(URLQueryItem(name: "tags", value: t)) }
            return items.isEmpty ? nil : items
        case .findTechnicianByInviteCode(let code):
            return [URLQueryItem(name: "code", value: code)]
        case .messages(let cid, _):
            return [URLQueryItem(name: "conversation_id", value: "\(cid)")]
        case .technicianInsights(let month):
            if let m = month {
                return [URLQueryItem(name: "month", value: m)]
            }
            return nil
        case .clientWorksPublic(let techId, let page):
            return [URLQueryItem(name: "techId", value: "\(techId)"),
                    URLQueryItem(name: "page", value: "\(page)")]
        case .publicShopGuidance(_, let shopName, let address):
            var items = [URLQueryItem]()
            if let n = shopName { items.append(URLQueryItem(name: "shopName", value: n)) }
            if let a = address { items.append(URLQueryItem(name: "address", value: a)) }
            return items.isEmpty ? nil : items
        default:
            return nil
        }
    }

    var body: [String: Any]? {
        switch self {
        case .markRead(let id, _): return ["conversation_id": id]
        case .resource(_, _, _, let body): return body
        case .clientLogin(let phone, let password):
            return ["phone": phone, "password": password]
        case .clientRegister(let phone, let password, let code):
            return ["phone": phone, "password": password, "inviteCode": code]
        case .technicianLogin(let phone, let password):
            return ["phone": phone, "password": password]
        case .technicianRegister(let key, let phone, let password):
            return ["key": key, "phone": phone, "password": password]
        case .refreshToken:
            return nil // handled separately
        case .checkPhone(_, let phone):
            return ["phone": phone]
        case .updateClientProfile(let params), .updateTechnicianProfile(let params):
            return params
        case .changePassword(_, let old, let new):
            return ["oldPassword": old, "newPassword": new]
        case .registerDeviceToken(let token, _):
            return ["token": token, "platform": "ios"]
        case .createClientOrder(let params), .createTechOrder(let params):
            return params
        case .updateOrderStatus(_, let status):
            return ["status": status]
        case .agreeOrder(_, let amount):
            var d: [String: Any] = [:]
            if let a = amount { d["fundAmount"] = a }
            return d
        case .rejectQuote(_, let reason):
            var d: [String: Any] = [:]
            if let r = reason { d["reason"] = r }
            return d
        case .quoteOrder(_, let price, let remark):
            var d: [String: Any] = ["quotePrice": price]
            if let r = remark { d["quoteRemark"] = r }
            return d
        case .completeOrder(_, let params):
            return params
        case .confirmOrder(_, let deposit):
            var d: [String: Any] = [:]
            if let d2 = deposit { d["depositConfirmed"] = d2 }
            return d
        case .cancelOrder(_, let reason):
            var d: [String: Any] = [:]
            if let r = reason { d["cancelReason"] = r }
            return d
        case .createDesign(let params), .updateWork(_, let params), .updateService(_, let params):
            return params
        case .createAddress(let params), .updateAddress(_, let params):
            return params
        case .sendMessage(let params, _):
            return params
        case .addComment(_, let content, let parentId):
            var d: [String: Any] = ["content": content]
            if let p = parentId { d["parentId"] = p }
            return d
        case .updateComment(_, _, let content):
            return ["content": content]
        case .updateCustomerTags(_, let tags):
            return ["tags": tags]
        case .quoteDesign(_, let price, let remark):
            var d: [String: Any] = ["quotePrice": price]
            if let r = remark { d["quoteRemark"] = r }
            return d
        case .updateShopAddresses(let shops, let shopService):
            return ["shopAddresses": shops, "shopService": shopService]
        case .createCustomerFollowUp(_, let content, let plannedAt):
            return ["content": content, "plannedAt": plannedAt]
        case .bookingDayUpdate(_, let accepting, let version):
            return ["accepting": accepting, "version": version]
        case .bookingDaysSettingsUpdate(let params):
            return params
        case .brandProfileUpdate(let params):
            return params
        case .bindTechnician(let inviteCode, let note, let source):
            var d: [String: Any] = ["inviteCode": inviteCode]
            if let n = note { d["note"] = n }
            if let s = source { d["source"] = s }
            return d
        case .activateTechnician(let key):
            return ["activationKey": key]
        default:
            return nil
        }
    }
}
