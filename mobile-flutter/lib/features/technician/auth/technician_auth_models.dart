class TechnicianProfile {
  final int id;
  final String name;
  final String? phone;
  final String? avatarUrl;
  final String? city;
  final String? serviceArea;
  final String status;
  final bool? homeService;
  final bool? shopService;
  final List<dynamic>? shopAddresses;
  final List<dynamic>? serviceItems;
  final Map<String, dynamic>? serviceSchedule;
  final String? invitationCode;
  final List<dynamic>? customTags;

  TechnicianProfile({
    required this.id,
    required this.name,
    this.phone,
    this.avatarUrl,
    this.city,
    this.serviceArea,
    required this.status,
    this.homeService,
    this.shopService,
    this.shopAddresses,
    this.serviceItems,
    this.serviceSchedule,
    this.invitationCode,
    this.customTags,
  });

  factory TechnicianProfile.fromJson(Map<String, dynamic> json) =>
      TechnicianProfile(
        id: json['id'] as int,
        name: json['name'] as String,
        phone: json['phone'] as String?,
        avatarUrl: json['avatarUrl'] as String?,
        city: json['city'] as String?,
        serviceArea: json['serviceArea'] as String?,
        status: json['status'] as String,
        homeService: json['homeService'] as bool?,
        shopService: json['shopService'] as bool?,
        shopAddresses: json['shopAddresses'] as List<dynamic>?,
        serviceItems: json['serviceItems'] as List<dynamic>?,
        serviceSchedule: json['serviceSchedule'] as Map<String, dynamic>?,
        invitationCode: json['invitationCode'] as String?,
        customTags: json['customTags'] as List<dynamic>?,
      );

  /// 接单就绪：至少开启一种服务类型。未就绪则锁定邀请码/邀请链接。
  bool get bookingReady => (homeService ?? false) || (shopService ?? false);
}

class TechnicianAuthResponse {
  final String accessToken;
  final String? refreshToken;
  final TechnicianProfile technician;
  final bool mustChangePassword;

  TechnicianAuthResponse({
    required this.accessToken,
    this.refreshToken,
    required this.technician,
    this.mustChangePassword = false,
  });

  factory TechnicianAuthResponse.fromJson(Map<String, dynamic> json) =>
      TechnicianAuthResponse(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String?,
        technician: TechnicianProfile.fromJson(
            json['technician'] as Map<String, dynamic>),
        mustChangePassword: json['mustChangePassword'] as bool? ?? false,
      );
}

class TechnicianPhoneStatus {
  final bool exists;
  final bool activated;

  TechnicianPhoneStatus({required this.exists, required this.activated});

  factory TechnicianPhoneStatus.fromJson(Map<String, dynamic> json) =>
      TechnicianPhoneStatus(
        exists: json['exists'] as bool? ?? false,
        activated: json['activated'] as bool? ?? false,
      );
}
