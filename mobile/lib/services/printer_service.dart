import 'dart:async';
import 'dart:typed_data';
import 'package:flutter_thermal_printer/flutter_thermal_printer.dart';
import 'package:flutter_thermal_printer/utils/printer.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../widgets/receipt_template.dart';

class PrinterService {
  static final FlutterThermalPrinter _printer = FlutterThermalPrinter.instance;
  static Printer? _selectedPrinter;

  /// Initialize the printer service
  static Future<void> initialize() async {
    // Configure BLE connection stabilization delay for P58E
    _printer.bleConfig = BleConfig(
      connectionStabilizationDelay: const Duration(seconds: 2),
    );
    
    // Load saved printer if available
    await _loadSavedPrinter();
  }
  
  /// Refresh printer connection by attempting to reconnect
  static Future<bool> refreshConnection() async {
    if (_selectedPrinter == null) {
      return false;
    }
    
    try {
      // Disconnect if currently connected
      if (_selectedPrinter!.isConnected ?? false) {
        await _printer.disconnect(_selectedPrinter!);
        await Future.delayed(const Duration(milliseconds: 500));
      }
      
      // Attempt to reconnect
      await _printer.connect(
        _selectedPrinter!,
        connectionStabilizationDelay: const Duration(seconds: 2),
      );
      
      await Future.delayed(const Duration(seconds: 1));
      
      return _selectedPrinter!.isConnected ?? false;
    } catch (e) {
      print('Error refreshing connection: $e');
      return false;
    }
  }
  
  /// Load saved printer from SharedPreferences
  static Future<void> _loadSavedPrinter() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final printerName = prefs.getString('saved_printer_name');
      final printerAddress = prefs.getString('saved_printer_address');
      
      if (printerName != null && printerAddress != null) {
        // Always use BLE (Bluetooth Low Energy) - USB not supported
        _selectedPrinter = Printer(
          name: printerName,
          address: printerAddress,
          connectionType: ConnectionType.BLE,
        );
      }
    } catch (e) {
      print('Error loading saved printer: $e');
    }
  }

  /// Start scanning for Bluetooth printers
  static Future<void> startScan({Duration? refreshDuration}) async {
    try {
      // Start scanning - this populates the devicesStream
      await _printer.getPrinters(
        refreshDuration: refreshDuration ?? const Duration(seconds: 10),
        connectionTypes: [ConnectionType.BLE],
      );
    } catch (e) {
      throw Exception('Failed to scan for printers: $e');
    }
  }

  /// Scan for available Bluetooth printers (stream-based)
  static Stream<List<Printer>> scanForPrinters({Duration? refreshDuration}) {
    // Start scanning in the background
    startScan(refreshDuration: refreshDuration);
    
    // Return the devices stream
    return _printer.devicesStream;
  }

  /// Stop scanning for printers
  static Future<void> stopScan() async {
    await _printer.stopScan();
  }

  /// Select a printer
  static void selectPrinter(Printer printer) {
    _selectedPrinter = printer;
    // Save to SharedPreferences
    _savePrinter(printer);
  }
  
  /// Save printer to SharedPreferences
  static Future<void> _savePrinter(Printer printer) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('saved_printer_name', printer.name ?? 'Unknown');
      await prefs.setString('saved_printer_address', printer.address ?? '');
      // Connection type is always BLE, no need to save it
    } catch (e) {
      print('Error saving printer: $e');
    }
  }

  /// Get the currently selected printer
  static Printer? getSelectedPrinter() {
    return _selectedPrinter;
  }

  /// Check if a printer is selected (also checks SharedPreferences)
  static Future<bool> hasSelectedPrinter() async {
    // If printer is already loaded, return true
    if (_selectedPrinter != null) {
      return true;
    }
    
    // Check if printer exists in SharedPreferences
    try {
      final prefs = await SharedPreferences.getInstance();
      final printerName = prefs.getString('saved_printer_name');
      final printerAddress = prefs.getString('saved_printer_address');
      
      if (printerName != null && printerAddress != null) {
        // Load the printer if it exists in storage
        await _loadSavedPrinter();
        return _selectedPrinter != null;
      }
    } catch (e) {
      print('Error checking saved printer: $e');
    }
    
    return false;
  }
  
  /// Synchronous check (for backward compatibility)
  static bool hasSelectedPrinterSync() {
    return _selectedPrinter != null;
  }

  /// Check if currently connected
  static bool get isConnected {
    return _selectedPrinter?.isConnected ?? false;
  }

  /// Request Bluetooth permissions
  static Future<bool> requestPermissions() async {
    // Request location permission (required for Bluetooth scanning on Android)
    final locationStatus = await Permission.location.request();
    
    // Request Bluetooth permission (Android 12+)
    final bluetoothStatus = await Permission.bluetooth.request();
    
    // Request Bluetooth scan permission (Android 12+)
    final bluetoothScanStatus = await Permission.bluetoothScan.request();
    
    // Request Bluetooth connect permission (Android 12+)
    final bluetoothConnectStatus = await Permission.bluetoothConnect.request();

    return locationStatus.isGranted && 
           (bluetoothStatus.isGranted || bluetoothScanStatus.isGranted || bluetoothConnectStatus.isGranted);
  }

  /// Find printer in current scan results by address (with timeout)
  static Future<Printer?> _findPrinterByAddress(String? address, {Duration timeout = const Duration(seconds: 3)}) async {
    if (address == null || address.isEmpty) {
      return null;
    }
    try {
      print('Quick scan for printer: $address (timeout: ${timeout.inSeconds}s)');
      
      // Check permissions first
      final hasPermission = await requestPermissions();
      if (!hasPermission) {
        print('Bluetooth permissions not granted, skipping scan');
        return null;
      }
      
      // Start a quick scan with shorter duration
      await startScan(refreshDuration: const Duration(seconds: 3));
      
      // Listen to the stream for a short time to find the printer
      Printer? foundPrinter;
      StreamSubscription<List<Printer>>? subscription;
      bool scanComplete = false;
      
      subscription = _printer.devicesStream.listen(
        (printers) {
          for (var printer in printers) {
            // Only match BLE printers (USB not supported)
            if (printer.connectionType != ConnectionType.BLE) {
              continue;
            }
            final printerAddr = printer.address?.toLowerCase() ?? '';
            final targetAddr = address.toLowerCase();
            if (printerAddr == targetAddr) {
              foundPrinter = printer;
              print('Found printer in scan: ${printer.name} (${printer.address})');
              scanComplete = true;
              break;
            }
          }
        },
        onError: (error) {
          print('Scan stream error: $error');
          scanComplete = true;
        },
      );
      
      // Wait with timeout
      final startTime = DateTime.now();
      while (!scanComplete && foundPrinter == null) {
        if (DateTime.now().difference(startTime) > timeout) {
          print('Scan timeout reached');
          break;
        }
        await Future.delayed(const Duration(milliseconds: 200));
      }
      
      await subscription.cancel();
      await stopScan();
      
      return foundPrinter;
    } catch (e) {
      print('Error scanning for printer: $e');
      try {
        await stopScan();
      } catch (_) {
        // Ignore stop scan errors
      }
      return null;
    }
  }

  /// Print receipt using ESC/POS commands
  static Future<bool> printReceipt(Map<String, dynamic> paymentData) async {
    if (_selectedPrinter == null) {
      throw Exception('No printer selected. Please select a printer first.');
    }

    try {
      // Ensure printer service is initialized
      await initialize();
      
      // Generate ESC/POS print data string using our existing generator
      final printDataString = ReceiptPrintData.generatePrintData(paymentData);
      
      // Convert ESC/POS string commands to bytes
      // The string contains raw ESC/POS commands, so we convert to bytes
      final bytes = Uint8List.fromList(printDataString.codeUnits);
      
      // Get saved address for potential retry
      final savedAddress = _selectedPrinter!.address;
      if (savedAddress == null || savedAddress.isEmpty) {
        throw Exception('Printer address is missing. Please re-select the printer from Settings.');
      }
      
      // Connect to printer if not already connected
      bool isConnected = _selectedPrinter!.isConnected ?? false;
      
      if (!isConnected) {
        print('Attempting to connect to printer: ${_selectedPrinter!.name} ($savedAddress)');
        print('Connection type: BLE (Bluetooth Low Energy)');
        
        // Warn if device name doesn't look like a printer
        final deviceName = _selectedPrinter!.name?.toLowerCase() ?? '';
        if (deviceName.contains('watch') || deviceName.contains('phone') || deviceName.contains('tablet')) {
          print('⚠️ WARNING: Device name suggests this may not be a printer: ${_selectedPrinter!.name}');
          print('Please verify you selected the correct printer in Settings');
        }
        
        // Skip scan to save time - use saved printer directly
        // Only scan if connection fails
        print('Using saved printer object (skipping scan for speed)');
        
        // Ensure connection type is always BLE
        if (_selectedPrinter!.connectionType != ConnectionType.BLE) {
          _selectedPrinter = Printer(
            name: _selectedPrinter!.name,
            address: _selectedPrinter!.address,
            connectionType: ConnectionType.BLE,
          );
        }
        
        try {
          // Disconnect any existing connection first
          try {
            await _printer.disconnect(_selectedPrinter!);
            await Future.delayed(const Duration(milliseconds: 200));
          } catch (e) {
            // Ignore disconnect errors
            print('Disconnect error (ignored): $e');
          }
          
          print('Connecting to printer...');
          // Attempt connection with timeout
          try {
            await _printer.connect(
              _selectedPrinter!,
              connectionStabilizationDelay: const Duration(seconds: 2),
            ).timeout(
              const Duration(seconds: 8),
              onTimeout: () {
                throw Exception('Connection timeout - printer did not respond in 8 seconds');
              },
            );
          } catch (connectError) {
            print('Connect call error: $connectError');
            // If connection fails, try to find printer in scan and retry
            print('Connection failed, attempting to find printer in scan...');
            Printer? freshPrinter = await _findPrinterByAddress(savedAddress, timeout: const Duration(seconds: 2));
            if (freshPrinter != null) {
              print('Found printer in scan, retrying with fresh object...');
              _selectedPrinter = freshPrinter;
              _savePrinter(freshPrinter);
              // Retry connection with fresh printer
              await _printer.connect(
                _selectedPrinter!,
                connectionStabilizationDelay: const Duration(seconds: 2),
              ).timeout(const Duration(seconds: 8));
            } else {
              throw connectError;
            }
          }
          
          // Wait for connection to stabilize (reduced time)
          await Future.delayed(const Duration(milliseconds: 800));
          
          // Check connection status
          isConnected = _selectedPrinter!.isConnected ?? false;
          print('Connection check - isConnected: $isConnected');
          
          // For P58E, sometimes isConnected is false but connection works
          // We'll proceed and let the print attempt verify
          if (isConnected) {
            print('✅ Successfully connected to printer (confirmed)');
          } else {
            print('⚠️ isConnected is false, but will attempt print anyway');
          }
        } catch (e) {
          print('Connection error: $e');
          // If connect() throws an error, that's a real connection failure
          final errorMsg = e.toString();
          throw Exception('Failed to connect to printer: ${errorMsg}\n\nPlease ensure:\n1. The printer is turned on\n2. Bluetooth is enabled\n3. The printer is in range\n4. Try re-selecting the printer from Settings');
        }
      }
      
      // Send print data using printData method
      print('Sending print data to printer (${bytes.length} bytes)...');
      try {
        // Add timeout to print operation to prevent hanging
        await _printer.printData(_selectedPrinter!, bytes).timeout(
          const Duration(seconds: 10),
          onTimeout: () {
            throw Exception('Print timeout - printer did not respond within 10 seconds');
          },
        );
        print('✅ Print data sent successfully');
        return true;
      } catch (printError) {
        print('Print data error: $printError');
        final errorStr = printError.toString().toLowerCase();
        
        // Check for connection-related errors
        if (errorStr.contains('not connected') || 
            errorStr.contains('connection') || 
            errorStr.contains('gatt') ||
            errorStr.contains('133') ||
            errorStr.contains('timeout')) {
          // Connection issue - try one retry with fresh scan
          print('Connection issue detected, attempting retry with fresh scan...');
          try {
            // Try to find printer in scan first
            Printer? freshPrinter = await _findPrinterByAddress(savedAddress, timeout: const Duration(seconds: 2));
            if (freshPrinter != null) {
              _selectedPrinter = freshPrinter;
              _savePrinter(freshPrinter);
            }
            
            // Disconnect and reconnect
            try {
              await _printer.disconnect(_selectedPrinter!);
              await Future.delayed(const Duration(milliseconds: 300));
            } catch (_) {}
            
            await _printer.connect(
              _selectedPrinter!,
              connectionStabilizationDelay: const Duration(seconds: 2),
            ).timeout(const Duration(seconds: 8));
            
            await Future.delayed(const Duration(milliseconds: 800));
            
            // Try printing again with timeout
            await _printer.printData(_selectedPrinter!, bytes).timeout(
              const Duration(seconds: 10),
            );
            print('✅ Print data sent successfully after retry');
            return true;
          } catch (retryError) {
            print('Retry failed: $retryError');
            throw Exception('Failed to print after retry. Please ensure:\n1. The printer is turned on\n2. Bluetooth is enabled\n3. The printer is in range\n4. Try re-selecting the printer from Settings\n\nError: ${printError.toString()}');
          }
        } else {
          // Other print error
          throw Exception('Failed to print: ${printError.toString()}');
        }
      }
    } catch (e) {
      print('Print error details: $e');
      // Re-throw with more context
      if (e.toString().contains('Failed to connect')) {
        throw e; // Already has good message
      }
      throw Exception('Print error: ${e.toString()}');
    }
  }

  /// Disconnect from printer
  static Future<void> disconnect() async {
    if (_selectedPrinter != null && (_selectedPrinter!.isConnected ?? false)) {
      await _printer.disconnect(_selectedPrinter!);
    }
    _selectedPrinter = null;
  }

  /// Dispose resources
  static Future<void> dispose() async {
    await disconnect();
    _selectedPrinter = null;
  }
}
