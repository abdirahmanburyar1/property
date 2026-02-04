import 'package:signalr_netcore/signalr_client.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

class SignalRService {
  static HubConnection? _hubConnection;
  static bool _isConnected = false;
  static String? _currentPropertyId;
  static final List<Function(Map<String, dynamic>)> _listeners = [];
  static bool _eventHandlerRegistered = false;

  static bool get isConnected => _isConnected;

  static Future<void> initialize() async {
    try {
      print('=== INITIALIZING SIGNALR ===');

      final baseUrl = ApiService.getBaseUrl();
      final hubUrl = baseUrl.replaceAll('/api', '/hubs/property');

      print('SignalR Hub URL: $hubUrl');

      // Get auth token
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      if (token == null) {
        print('No auth token found, skipping SignalR connection');
        return;
      }

      // Create hub connection
      _hubConnection = HubConnectionBuilder()
          .withUrl(
            hubUrl,
            options: HttpConnectionOptions(
              accessTokenFactory: () async => token,
              transport: HttpTransportType.WebSockets,
              skipNegotiation: false,
            ),
          )
          .withAutomaticReconnect()
          .build();

      // Handle connection events
      _hubConnection?.onclose(({error}) {
        print('=== SIGNALR DISCONNECTED ===');
        if (error != null) {
          print('Error: $error');
        }
        _isConnected = false;
      });

      _hubConnection?.onreconnecting(({error}) {
        print('=== SIGNALR RECONNECTING ===');
        if (error != null) {
          print('Error: $error');
        }
        _isConnected = false;
      });

      _hubConnection?.onreconnected(({connectionId}) async {
        print('=== SIGNALR RECONNECTED ===');
        print('Connection ID: $connectionId');
        _isConnected = true;
        
        // Resubscribe to current property if any
        if (_currentPropertyId != null) {
          await subscribeToProperty(_currentPropertyId!);
        }
      });

      // Register PropertyUpdated event handler once
      if (!_eventHandlerRegistered) {
        _hubConnection?.on('PropertyUpdated', (arguments) {
          try {
            print('=== RECEIVED PROPERTY UPDATE ===');
            print('Arguments: $arguments');

            if (arguments != null && arguments.isNotEmpty) {
              final message = arguments[0] as Map<String, dynamic>;
              print('Property ID: ${message['propertyId']}');
              print('Update Type: ${message['updateType']}');
              
              // Notify all registered listeners
              for (var listener in _listeners) {
                try {
                  listener(message);
                } catch (e) {
                  print('Error in listener: $e');
                }
              }
            }
          } catch (e) {
            print('Error processing PropertyUpdated event: $e');
          }
        });
        _eventHandlerRegistered = true;
      }

      // Connect
      await _hubConnection?.start();
      _isConnected = true;

      print('=== SIGNALR CONNECTED SUCCESSFULLY ===');
    } catch (e) {
      print('=== SIGNALR CONNECTION ERROR ===');
      print('Error: $e');
      _isConnected = false;
    }
  }

  static void addListener(Function(Map<String, dynamic>) callback) {
    if (!_listeners.contains(callback)) {
      _listeners.add(callback);
      print('=== SIGNALR LISTENER ADDED ===');
      print('Total listeners: ${_listeners.length}');
    }
  }

  static void removeListener(Function(Map<String, dynamic>) callback) {
    _listeners.remove(callback);
    print('=== SIGNALR LISTENER REMOVED ===');
    print('Total listeners: ${_listeners.length}');
  }

  static Future<void> subscribeToProperty(String propertyId) async {
    if (_hubConnection == null || !_isConnected) {
      print('Cannot subscribe: SignalR not connected');
      return;
    }

    try {
      print('=== SUBSCRIBING TO PROPERTY ===');
      print('Property ID: $propertyId');

      await _hubConnection?.invoke('SubscribeToProperty', args: [propertyId]);
      _currentPropertyId = propertyId;

      print('=== SUBSCRIBED TO PROPERTY SUCCESSFULLY ===');
    } catch (e) {
      print('Error subscribing to property: $e');
    }
  }

  static Future<void> unsubscribeFromProperty(String propertyId) async {
    if (_hubConnection == null || !_isConnected) {
      return;
    }

    try {
      print('=== UNSUBSCRIBING FROM PROPERTY ===');
      print('Property ID: $propertyId');

      await _hubConnection?.invoke('UnsubscribeFromProperty', args: [propertyId]);
      
      if (_currentPropertyId == propertyId) {
        _currentPropertyId = null;
      }

      print('=== UNSUBSCRIBED FROM PROPERTY SUCCESSFULLY ===');
    } catch (e) {
      print('Error unsubscribing from property: $e');
    }
  }

  static Future<void> dispose() async {
    try {
      print('=== DISPOSING SIGNALR ===');
      
      if (_currentPropertyId != null) {
        await unsubscribeFromProperty(_currentPropertyId!);
      }
      
      await _hubConnection?.stop();
      _isConnected = false;
      _currentPropertyId = null;
      _listeners.clear();
      _eventHandlerRegistered = false;
      
      print('=== SIGNALR DISPOSED ===');
    } catch (e) {
      print('Error disposing SignalR: $e');
    }
  }
}
