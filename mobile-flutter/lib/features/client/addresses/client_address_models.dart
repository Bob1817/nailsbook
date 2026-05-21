class ClientAddress {
  final int id;
  final int clientId;
  final String? contactName;
  final String? contactPhone;
  final String? province;
  final String? city;
  final String? district;
  final String? detailAddress;
  final String? doorInfo;
  final double? latitude;
  final double? longitude;
  final bool isDefault;

  ClientAddress({
    required this.id,
    required this.clientId,
    this.contactName,
    this.contactPhone,
    this.province,
    this.city,
    this.district,
    this.detailAddress,
    this.doorInfo,
    this.latitude,
    this.longitude,
    required this.isDefault,
  });

  factory ClientAddress.fromJson(Map<String, dynamic> json) => ClientAddress(
        id: json['id'] as int,
        clientId: json['clientId'] as int,
        contactName: json['contactName'] as String?,
        contactPhone: json['contactPhone'] as String?,
        province: json['province'] as String?,
        city: json['city'] as String?,
        district: json['district'] as String?,
        detailAddress: json['detailAddress'] as String?,
        doorInfo: json['doorInfo'] as String?,
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
        isDefault: json['isDefault'] as bool? ?? false,
      );

  String get fullAddress => [province, city, district, detailAddress, doorInfo]
      .where((s) => s != null && s.isNotEmpty)
      .join(' ');
}
