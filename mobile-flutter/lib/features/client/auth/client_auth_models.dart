class Technician {
  final int id;
  final String name;
  final String? phone;
  final String? avatarUrl;
  final String? city;
  final String? serviceArea;
  final String? status;
  final bool? isDefault;
  final String? bindSource;
  final int? bindId;
  final bool? homeService;
  final bool? shopService;
  final List<dynamic>? shopAddresses;
  final List<dynamic>? serviceItems;

  Technician({
    required this.id,
    required this.name,
    this.phone,
    this.avatarUrl,
    this.city,
    this.serviceArea,
    this.status,
    this.isDefault,
    this.bindSource,
    this.bindId,
    this.homeService,
    this.shopService,
    this.shopAddresses,
    this.serviceItems,
  });

  factory Technician.fromJson(Map<String, dynamic> json) => Technician(
        id: json['id'] as int,
        name: json['name'] as String,
        phone: json['phone'] as String?,
        avatarUrl: json['avatarUrl'] as String?,
        city: json['city'] as String?,
        serviceArea: json['serviceArea'] as String?,
        status: json['status'] as String?,
        isDefault: json['isDefault'] as bool?,
        bindSource: json['bindSource'] as String?,
        bindId: json['bindId'] as int?,
        homeService: json['homeService'] as bool?,
        shopService: json['shopService'] as bool?,
        shopAddresses: json['shopAddresses'] as List<dynamic>?,
        serviceItems: json['serviceItems'] as List<dynamic>?,
      );
}

class ClientUser {
  final int id;
  final String? nickname;
  final String phone;
  final String? avatarUrl;
  final String status;

  ClientUser({
    required this.id,
    this.nickname,
    required this.phone,
    this.avatarUrl,
    required this.status,
  });

  factory ClientUser.fromJson(Map<String, dynamic> json) => ClientUser(
        id: json['id'] as int,
        nickname: json['nickname'] as String?,
        phone: json['phone'] as String,
        avatarUrl: json['avatarUrl'] as String?,
        status: json['status'] as String,
      );
}

class AuthResponse {
  final String accessToken;
  final String? refreshToken;
  final ClientUser client;
  final Technician? technician;
  final List<Technician>? technicians;

  AuthResponse({
    required this.accessToken,
    this.refreshToken,
    required this.client,
    this.technician,
    this.technicians,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) => AuthResponse(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String?,
        client: ClientUser.fromJson(json['client'] as Map<String, dynamic>),
        technician: json['technician'] != null
            ? Technician.fromJson(json['technician'] as Map<String, dynamic>)
            : null,
        technicians: (json['technicians'] as List<dynamic>?)
            ?.map((e) => Technician.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
