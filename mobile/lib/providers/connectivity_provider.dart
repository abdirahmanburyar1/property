import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

/// Provides connectivity status. When [isOnline] is false, the app can show [NoInternetScreen].
/// Supports both connectivity_plus APIs: single [ConnectivityResult] (older) and
/// [List<ConnectivityResult>] (newer). Uses API ping when plugin says offline so mobile data works.
class ConnectivityProvider extends ChangeNotifier {
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<dynamic>? _subscription;

  bool _isOnline = true;
  bool get isOnline => _isOnline;

  ConnectivityProvider() {
    _init();
  }

  Future<void> _init() async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    await _check();
    _subscription = _connectivity.onConnectivityChanged.listen((dynamic result) {
      _updateFromResult(result);
    });
  }

  /// Accept single ConnectivityResult (older plugin) or List<ConnectivityResult> (newer).
  void _updateFromResult(dynamic result) {
    final wasOnline = _isOnline;
    final hasConnection = _hasConnection(result);
    if (hasConnection) {
      _isOnline = true;
    } else {
      _checkApiReachability();
      return;
    }
    if (wasOnline != _isOnline) notifyListeners();
  }

  bool _hasConnection(dynamic result) {
    if (result is List<ConnectivityResult>) {
      return result.isNotEmpty && !result.every((r) => r == ConnectivityResult.none);
    }
    if (result is ConnectivityResult) {
      return result == ConnectivityResult.mobile ||
          result == ConnectivityResult.wifi ||
          result == ConnectivityResult.ethernet ||
          result == ConnectivityResult.vpn ||
          result == ConnectivityResult.other;
    }
    return true;
  }

  Future<void> _checkApiReachability() async {
    final ok = await ApiService.ping(timeout: const Duration(seconds: 6));
    final wasOnline = _isOnline;
    _isOnline = ok;
    if (wasOnline != _isOnline) notifyListeners();
  }

  Future<void> _check() async {
    try {
      final result = await _connectivity.checkConnectivity();
      final hasConnection = result is List<ConnectivityResult>
          ? (result.isNotEmpty && !result.every((r) => r == ConnectivityResult.none))
          : _hasConnection(result);
      if (hasConnection) {
        _isOnline = true;
        notifyListeners();
        return;
      }
      await _checkApiReachability();
    } catch (e) {
      if (kDebugMode) {
        print('Connectivity check error: $e');
      }
      await _checkApiReachability();
    }
  }

  Future<void> checkAgain() async {
    try {
      final result = await _connectivity.checkConnectivity();
      final hasConnection = result is List<ConnectivityResult>
          ? (result.isNotEmpty && !result.every((r) => r == ConnectivityResult.none))
          : _hasConnection(result);
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
