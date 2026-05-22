import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/maps/map_service.dart';

class TechnicianScheduleScreen extends StatefulWidget {
  const TechnicianScheduleScreen({super.key});

  @override
  State<TechnicianScheduleScreen> createState() => _TechnicianScheduleScreenState();
}

class _TechnicianScheduleScreenState extends State<TechnicianScheduleScreen> {
  List<Map<String, dynamic>> _trips = [];
  DateTime _selectedDate = DateTime.now();
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadTrips();
  }

  Future<void> _loadTrips() async {
    try {
      final apiClient = context.read<ApiClient>();
      final dateStr = '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';
      final items = await apiClient.getList('/orders/trips', queryParams: {'date': dateStr});
      if (mounted) setState(() { _trips = items.cast<Map<String, dynamic>>(); _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final dates = List.generate(14, (i) => today.add(Duration(days: i)));

    return Scaffold(
      appBar: AppBar(title: const Text('日程')),
      body: Column(children: [
        SizedBox(
          height: 56,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            children: [
              Padding(
                padding: const EdgeInsets.only(right: 4),
                child: ElevatedButton(
                  onPressed: () { setState(() { _selectedDate = today; _loading = true; }); _loadTrips(); },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _selectedDate == today ? const Color(0xFFE91E63) : Colors.grey.shade100,
                    foregroundColor: _selectedDate == today ? Colors.white : Colors.black87,
                    minimumSize: const Size(60, 40),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                  ),
                  child: const Text('今天'),
                ),
              ),
              ...dates.map((d) => Padding(
                padding: const EdgeInsets.only(right: 4),
                child: ChoiceChip(
                  label: Column(mainAxisSize: MainAxisSize.min, children: [
                    Text(_weekdayLabel(d.weekday), style: const TextStyle(fontSize: 10)),
                    Text('${d.day}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  ]),
                  selected: _selectedDate.year == d.year && _selectedDate.month == d.month && _selectedDate.day == d.day,
                  onSelected: (_) { setState(() { _selectedDate = d; _loading = true; }); _loadTrips(); },
                ),
              )),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _trips.isEmpty
                  ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.event_available, size: 48, color: Colors.grey),
                      const SizedBox(height: 8),
                      Text('当天无预约', style: Theme.of(context).textTheme.bodyLarge),
                    ]))
                  : RefreshIndicator(
                      onRefresh: _loadTrips,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _trips.length,
                        itemBuilder: (context, index) {
                          final trip = _trips[index];
                          return _buildTripCard(context, trip);
                        },
                      ),
                    ),
        ),
      ]),
    );
  }

  Widget _buildTripCard(BuildContext context, Map<String, dynamic> trip) {
    final status = trip['status'] as String? ?? '';
    final startTime = trip['startTime'] as String? ?? '';
    final endTime = trip['endTime'] as String? ?? '';
    final customer = trip['client'] as Map<String, dynamic>? ?? trip['customer'] as Map<String, dynamic>?;
    final customerName = customer?['nickname']?.toString() ?? customer?['name']?.toString() ?? '客户';
    final address = trip['address'] as String? ?? '';
    final serviceType = trip['serviceType'] as String? ?? '';
    final lat = (trip['latitude'] as num?)?.toDouble();
    final lng = (trip['longitude'] as num?)?.toDouble();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: _statusColor(status),
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Text(startTime, style: const TextStyle(fontWeight: FontWeight.w600)),
            if (endTime.isNotEmpty) Text(' - $endTime', style: const TextStyle(color: Color(0xFF757575))),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _statusColor(status).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(_statusLabel(status), style: TextStyle(fontSize: 12, color: _statusColor(status))),
            ),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: const Color(0xFFE91E63),
              child: Text(customerName.substring(0, 1), style: const TextStyle(color: Colors.white)),
            ),
            const SizedBox(width: 8),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(customerName, style: const TextStyle(fontWeight: FontWeight.w600)),
              if (serviceType.isNotEmpty) Text(serviceType, style: const TextStyle(fontSize: 12, color: Color(0xFF757575))),
            ])),
          ]),
          if (address.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(children: [
              const Icon(Icons.location_on, size: 16, color: Color(0xFF757575)),
              const SizedBox(width: 4),
              Expanded(child: Text(address, style: const TextStyle(fontSize: 13, color: Color(0xFF757575)), maxLines: 1, overflow: TextOverflow.ellipsis)),
            ]),
          ],
          if (lat != null && lng != null) ...[
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: SizedBox(
                  height: 36,
                  child: OutlinedButton.icon(
                    onPressed: () => _launchNav(lat, lng),
                    icon: const Icon(Icons.navigation, size: 16),
                    label: const Text('导航'),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: SizedBox(
                  height: 36,
                  child: OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.chat_bubble_outline, size: 16),
                    label: const Text('联系客户'),
                  ),
                ),
              ),
            ]),
          ],
        ]),
      ),
    );
  }

  String _weekdayLabel(int weekday) {
    const labels = ['一', '二', '三', '四', '五', '六', '日'];
    return labels[weekday - 1];
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'pending_home': return '待上门';
      case 'pending_shop': return '待到店';
      case 'in_progress': return '服务中';
      case 'completed': return '已完成';
      default: return status;
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'pending_home': return Colors.orange;
      case 'pending_shop': return Colors.blue;
      case 'in_progress': return Colors.green;
      case 'completed': return Colors.grey;
      default: return Colors.grey;
    }
  }

  Future<void> _launchNav(double lat, double lng) async {
    await MapService.launchNavigation(lat, lng);
  }
}