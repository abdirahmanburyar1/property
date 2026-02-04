import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

/// Provides connectivity status. When [isOnline] is false, the app can show [NoInternetScreen].
class ConnectivityProvider extends ChangeNotifier {
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  bool _isOnline = true;
  bool get isOnline => _isOnline;

  ConnectivityProvider() {
    _init();
  }

  Future<void> _init() async {
    await _check();
    _subscription = _connectivity.onConnectivityChanged.listen((List<ConnectivityResult> results) {
      _updateFromResults(results);
    });
  }

  void _updateFromResults(List<ConnectivityResult> results) {
    final wasOnline = _isOnline;
    _isOnline = results.any((r) => r == ConnectivityResult.mobile || r == ConnectivityResult.wifi || r == ConnectivityResult.ethernet);
    if (wasOnline != _isOnline) notifyListeners();
  }

  Future<void> _check() async {
    try {
      final results = await _connectivity.checkConnectivity();
      _updateFromResults(results);
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
