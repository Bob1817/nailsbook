import 'package:flutter/material.dart';

class TechnicianHomeScreen extends StatelessWidget {
  const TechnicianHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('NailBook')),
      body: const Center(child: Text('Technician Home - TODO')),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: 0,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: '首页'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_today), label: '日程'),
          BottomNavigationBarItem(icon: Icon(Icons.receipt_long), label: '订单'),
          BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), label: '消息'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: '我的'),
        ],
      ),
    );
  }
}
