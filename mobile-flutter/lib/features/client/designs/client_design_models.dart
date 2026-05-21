class ClientDesign {
  final int id;
  final String? title;
  final String? description;
  final List<String>? imageUrls;
  final double? quotePrice;
  final String? quoteRemark;
  final String status;
  final Map<String, dynamic>? technician;
  final String createdAt;

  ClientDesign({
    required this.id,
    this.title,
    this.description,
    this.imageUrls,
    this.quotePrice,
    this.quoteRemark,
    required this.status,
    this.technician,
    required this.createdAt,
  });

  factory ClientDesign.fromJson(Map<String, dynamic> json) => ClientDesign(
        id: json['id'] as int,
        title: json['title'] as String?,
        description: json['description'] as String?,
        imageUrls: (json['imageUrls'] as List<dynamic>?)?.map((e) => e.toString()).toList(),
        quotePrice: (json['quotePrice'] as num?)?.toDouble(),
        quoteRemark: json['quoteRemark'] as String?,
        status: json['status'] as String,
        technician: json['technician'] as Map<String, dynamic>?,
        createdAt: json['createdAt'] as String,
      );

  String get statusLabel {
    switch (status) {
      case 'pending_quote': return '待报价';
      case 'quoted': return '已报价';
      case 'accepted': return '已接受';
      case 'rejected': return '已拒绝';
      default: return status;
    }
  }
}
