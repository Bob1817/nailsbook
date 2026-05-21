class ClientOrder {
  final int id;
  final String orderNo;
  final String status;
  final String? serviceType;
  final String? remark;
  final double? quotePrice;
  final String? quoteRemark;
  final String? address;
  final String? startTime;
  final String? endTime;
  final Map<String, dynamic>? technician;
  final Map<String, dynamic>? customer;
  final Map<String, dynamic>? clientAddress;
  final String createdAt;

  ClientOrder({
    required this.id,
    required this.orderNo,
    required this.status,
    this.serviceType,
    this.remark,
    this.quotePrice,
    this.quoteRemark,
    this.address,
    this.startTime,
    this.endTime,
    this.technician,
    this.customer,
    this.clientAddress,
    required this.createdAt,
  });

  factory ClientOrder.fromJson(Map<String, dynamic> json) => ClientOrder(
        id: json['id'] as int,
        orderNo: json['orderNo'] as String,
        status: json['status'] as String,
        serviceType: json['serviceType'] as String?,
        remark: json['remark'] as String?,
        quotePrice: (json['quotePrice'] as num?)?.toDouble(),
        quoteRemark: json['quoteRemark'] as String?,
        address: json['address'] as String?,
        startTime: json['startTime'] as String?,
        endTime: json['endTime'] as String?,
        technician: json['technician'] as Map<String, dynamic>?,
        customer: json['customer'] as Map<String, dynamic>?,
        clientAddress: json['clientAddress'] as Map<String, dynamic>?,
        createdAt: json['createdAt'] as String,
      );

  String get statusLabel {
    switch (status) {
      case 'pending_quote': return '待报价';
      case 'pending_agree': return '待确认';
      case 'pending_confirm': return '待接单';
      case 'pending_home': return '待上门';
      case 'pending_shop': return '待到店';
      case 'in_progress': return '服务中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  }
}
