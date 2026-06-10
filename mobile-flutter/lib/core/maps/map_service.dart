import 'dart:io';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';

class MapService {
  static String buildAmapNavUrl(double lat, double lng) {
    return 'iosamap://navi?sourceApplication=nailbook&poiname=&lat=$lat&lon=$lng&dev=0';
  }

  static String buildGoogleMapsNavUrl(double lat, double lng) {
    return 'google.maps://?daddr=$lat,$lng&directionsmode=transit';
  }

  static String buildWebMapsUrl(double lat, double lng) {
    return 'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng';
  }

  static Future<LocationResult> requestPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return LocationResult(serviceDisabled: true);
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return LocationResult(permissionDenied: true);
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return LocationResult(permissionDeniedForever: true);
    }

    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.medium,
      timeLimit: const Duration(seconds: 10),
    );

    return LocationResult(
      latitude: position.latitude,
      longitude: position.longitude,
    );
  }

  static Future<bool> launchNavigation(double lat, double lng) async {
    if (Platform.isIOS) {
      final amapUrl = buildAmapNavUrl(lat, lng);
      if (await canLaunchUrl(Uri.parse(amapUrl))) {
        return await launchUrl(Uri.parse(amapUrl));
      }
      final googleUrl = buildGoogleMapsNavUrl(lat, lng);
      if (await canLaunchUrl(Uri.parse(googleUrl))) {
        return await launchUrl(Uri.parse(googleUrl));
      }
    }

    if (Platform.isAndroid) {
      final amapUrl = buildAmapNavUrl(lat, lng);
      if (await canLaunchUrl(Uri.parse(amapUrl))) {
        return await launchUrl(Uri.parse(amapUrl));
      }
    }

    final webUrl = buildWebMapsUrl(lat, lng);
    return await launchUrl(Uri.parse(webUrl));
  }

  /// 按地址文本唤起导航（对齐 webapp：高德地图关键字搜索 + callnative）。
  static Future<bool> launchAddressNavigation(String address) async {
    final encoded = Uri.encodeComponent(address);
    // 优先尝试高德 App 的搜索路由
    final amapAppUri = Uri.parse('iosamap://poi?sourceApplication=nailbook&keywords=$encoded&dev=0');
    if (await canLaunchUrl(amapAppUri)) {
      return launchUrl(amapAppUri);
    }
    // 回退到高德通用 URL（系统会尝试拉起 App，未安装则浏览器）
    final amapWeb = Uri.parse('https://uri.amap.com/search?keyword=$encoded&callnative=1');
    return launchUrl(amapWeb, mode: LaunchMode.externalApplication);
  }

  /// 拨打电话。
  static Future<bool> launchPhoneCall(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) return launchUrl(uri);
    return false;
  }
}

class LocationResult {
  final bool serviceDisabled;
  final bool permissionDenied;
  final bool permissionDeniedForever;
  final double? latitude;
  final double? longitude;

  LocationResult({
    this.serviceDisabled = false,
    this.permissionDenied = false,
    this.permissionDeniedForever = false,
    this.latitude,
    this.longitude,
  });

  bool get hasLocation => latitude != null && longitude != null;
  bool get blocked => serviceDisabled || permissionDenied || permissionDeniedForever;
}