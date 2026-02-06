import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

/// Provides connectivity status. When [isOnline] is false, the app can show [NoInternetScreen].
class ConnectivityProvider extends ChangeNotifier {
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<ConnectivityResult>? _subscription;

  bool _isOnline = true;
  bool get isOnline => _isOnline;

  ConnectivityProvider() {
    _init();
  }

  Future<void> _init() async {
    await _check();
    _subscription = _connectivity.onConnectivityChanged.listen((dynamic result) {
      _updateFromResult(result);
    });
  }

  /// connectivity_plus 4.x returns List<ConnectivityResult> (multiple connection types).
  /// Consider online if any connection type is present other than none.
  void _updateFromResult(dynamic result) {
    final wasOnline = _isOnline;
    if (result is List<ConnectivityResult>) {
      final list = result as List<ConnectivityResult>;
      _isOnline = list.isNotEmpty && !list.every((r) => r == ConnectivityResult.none);
    } else if (result is ConnectivityResult) {
      _isOnline = result == ConnectivityResult.mobile ||
          result == ConnectivityResult.wifi ||
          result == ConnectivityResult.ethernet ||
          result == ConnectivityResult.vpn ||
          result == ConnectivityResult.other;
    } else {
      _isOnline = true;
    }
    if (wasOnline != _isOnline) notifyListeners();
  }

  Future<void> _check() async {
    try {
      final result = await _connectivity.checkConnectivity();
      _updateFromResult(result);
    } catch (e) {
      // If check fails, assume online to avoid blocking the app
      if (!_isOnline) {
        _isOnline = true;
        notifyListeners();
      }
    }
  }

  /// Call to re-check connectivity (e.g. from Retry on no-internet screen).
  Future<void> checkAgain() async {
    await _check();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
