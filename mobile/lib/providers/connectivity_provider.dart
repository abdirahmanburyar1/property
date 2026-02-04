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
    _subscription = _connectivity.onConnectivityChanged.listen((ConnectivityResult result) {
      _updateFromResult(result);
    });
  }

  void _updateFromResult(ConnectivityResult result) {
    final wasOnline = _isOnline;
    _isOnline = result == ConnectivityResult.mobile || result == ConnectivityResult.wifi || result == ConnectivityResult.ethernet;
    if (wasOnline != _isOnline) notifyListeners();
  }

  Future<void> _check() async {
    try {
      final result = await _connectivity.checkConnectivity();
      _updateFromResult(result);
    } catch (e) {
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
