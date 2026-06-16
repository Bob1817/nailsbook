import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';

/// 统一错误日志。
///
/// debug 下打印到控制台，并把非致命错误上报 Crashlytics，让线上失败可追踪。
/// 用于替换静默的 `catch (_) {}`：捕获后调用 `AppLog.error(e, st, reason)`。
class AppLog {
  AppLog._();

  static void error(Object error, [StackTrace? stack, String? reason]) {
    if (kDebugMode) {
      debugPrint('[AppLog]${reason != null ? ' $reason:' : ''} $error');
      if (stack != null) debugPrint(stack.toString());
    }
    try {
      FirebaseCrashlytics.instance
          .recordError(error, stack, reason: reason, fatal: false);
    } catch (_) {
      // Crashlytics 未初始化时静默忽略，不影响主流程。
    }
  }
}
