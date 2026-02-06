import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

/// Provides connectivity status. When [isOnline] is false, the app can show [NoInternetScreen].
/// Uses both connectivity_plus and an API ping so mobile data works even when the plugin
/// incorrectly reports no connection (e.g. on some Android devices).
class ConnectivityProvider extends ChangeNotifier {
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  bool _isOnline = true;
  bool get isOnline => _isOnline;

  ConnectivityProvider() {
    _init();
  }

  Future<void> _init() async {
    // Brief delay so the system can report the correct state (avoids false offline on startup)
    await Future<void>.delayed(const Duration(milliseconds: 400));
    await _check();
    _subscription = _connectivity.onConnectivityChanged.listen(_updateFromResult);
  }

  /// connectivity_plus 4.x returns List<ConnectivityResult>. Consider online if any
  /// connection type is present other than none.
  void _updateFromResult(List<ConnectivityResult> result) {
    final wasOnline = _isOnline;
    final hasConnection = result.isNotEmpty &&
        !result.every((r) => r == ConnectivityResult.none);
    if (hasConnection) {
      _isOnline = true;
    } else {
      // Plugin says offline: verify with API ping (mobile data often misreported)
      _checkApiReachability();
      return;
    }
    if (wasOnline != _isOnline) notifyListeners();
  }

  /// When connectivity_plus says offline, try to reach the API. If we get any response,
  /// we're online (e.g. on mobile data that the plugin didn't detect).
  Future<void> _checkApiReachability() async {
    final ok = await ApiService.ping(timeout: const Duration(seconds: 6));
    final wasOnline = _isOnline;
    _isOnline = ok;
    if (wasOnline != _isOnline) notifyListeners();
  }

  Future<void> _check() async {
    try {
      final result = await _connectivity.checkConnectivity();
      final hasConnection = result.isNotEmpty &&
          !result.every((r) => r == ConnectivityResult.none);
      if (hasConnection) {
        _isOnline = true;
        notifyListeners();
        return;
      }
      // Plugin says no connection: try API ping before showing no-internet
      await _checkApiReachability();
    } catch (e) {
      if (kDebugMode) {
        print('Connectivity check error: $e');
      }
      await _checkApiReachability();
    }
  }

  /// Call to re-check connectivity (e.g. from Retry on no-internet screen).
  /// Runs both connectivity_plus and API ping so mobile data can recover.
  Future<void> checkAgain() async {
    try {
      final result = await _connectivity.checkConnectivity();
      final hasConnection = result.isNotEmpty &&
          !result.every((r) => r == ConnectivityResult.none);
      if (hasConnection) {
        _isOnline = true;
        notifyListeners();
        return;
      }
    } catch (_) {}
    await _checkApiReachability();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
