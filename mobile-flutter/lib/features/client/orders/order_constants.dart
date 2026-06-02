import 'package:flutter/material.dart';

const orderStatusLabels = {
  'pending_quote': '待报价',
  'pending_agree': '待同意',
  'pending_confirm': '待确认',
  'pending_home': '待上门',
  'pending_shop': '待到店',
  'in_progress': '服务中',
  'completed': '已完成',
  'cancelled': '已取消',
};

const orderStatusColors = {
  'pending_quote': (Color(0xFFFFFBEB), Color(0xFFB45309)),
  'pending_agree': (Color(0xFFEFF6FF), Color(0xFF1D4ED8)),
  'pending_confirm': (Color(0xFFF5F3FF), Color(0xFF7C3AED)),
  'pending_home': (Color(0xFFF0FDF4), Color(0xFF15803D)),
  'pending_shop': (Color(0xFFF0FDF4), Color(0xFF15803D)),
  'in_progress': (Color(0xFFFFF7ED), Color(0xFFC2410C)),
  'completed': (Color(0xFFF3F4F6), Color(0xFF4B5563)),
  'cancelled': (Color(0xFFFEF2F2), Color(0xFFDC2626)),
};

const upcomingStatuses = {
  'pending_quote',
  'pending_agree',
  'pending_confirm',
  'pending_home',
  'pending_shop',
  'in_progress',
};
