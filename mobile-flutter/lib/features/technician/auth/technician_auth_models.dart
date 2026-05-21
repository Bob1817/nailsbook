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
  });

  factory TechnicianProfile.fromJson(Map<String, dynamic> json) => TechnicianProfile(
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
      );
}

class TechnicianAuthResponse {
  final String accessToken;
  final String? refreshToken;
  final TechnicianProfile technician;

  TechnicianAuthResponse({
    required this.accessToken,
    this.refreshToken,
    required this.technician,
  });

  factory TechnicianAuthResponse.fromJson(Map<String, dynamic> json) => TechnicianAuthResponse(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String?,
        technician: TechnicianProfile.fromJson(json),
      );
}