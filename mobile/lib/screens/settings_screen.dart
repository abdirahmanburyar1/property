import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/printer_service.dart';
import '../widgets/printer_selection_dialog.dart';
import 'api_config_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  dynamic _savedPrinter;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSavedPrinter();
  }

  Future<void> _loadSavedPrinter() async {
    setState(() => _isLoading = true);
    
    try {
      final prefs = await SharedPreferences.getInstance();
      final printerName = prefs.getString('saved_printer_name');
      final printerAddress = prefs.getString('saved_printer_address');
      
      // Check if PrinterService has a selected printer
      final currentPrinter = PrinterService.getSelectedPrinter();
      if (currentPrinter != null) {
        _savedPrinter = currentPrinter;
      } else if (printerName != null && printerAddress != null) {
        // Store printer info for display (we'll need to recreate it when selecting)
        _savedPrinter = {
          'name': printerName,
          'address': printerAddress,
        };
      }
    } catch (e) {
      print('Error loading saved printer: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _selectPrinter() async {
    // Request permissions first
    final hasPermission = await PrinterService.requestPermissions();
    if (!hasPermission) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Bluetooth permissions are required to select a printer'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    // Show printer selection dialog
    final selectedPrinter = await showDialog(
      context: context,
      builder: (context) => const PrinterSelectionDialog(),
    );

    if (selectedPrinter != null) {
      // PrinterService.selectPrinter already saves it
      setState(() {
        _savedPrinter = selectedPrinter;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Printer saved successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    }
  }

  Future<void> _removePrinter() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('saved_printer_name');
      await prefs.remove('saved_printer_address');
      
      await PrinterService.disconnect();
      
      setState(() {
        _savedPrinter = null;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Printer removed successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error removing printer: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Printer Settings Section
                Card(
                  elevation: 2,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.print, color: Theme.of(context).colorScheme.primary),
                            const SizedBox(width: 12),
                            Text(
                              'Printer Settings',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        if (_savedPrinter != null) ...[
                          // Current Printer Info
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.blue[50],
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.blue[200]!),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.check_circle, color: Colors.blue[700], size: 20),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Current Printer',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: Colors.blue[900],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _getPrinterName(_savedPrinter),
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _getPrinterAddress(_savedPrinter),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[700],
                                    fontFamily: 'monospace',
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _selectPrinter,
                                  icon: const Icon(Icons.refresh),
                                  label: const Text('Change Printer'),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _removePrinter,
                                  icon: const Icon(Icons.delete_outline),
                                  label: const Text('Remove'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.red,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ] else ...[
                          // No Printer Selected
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.orange[50],
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.orange[200]!),
                            ),
                            child: Column(
                              children: [
                                Icon(Icons.print_disabled, color: Colors.orange[700], size: 48),
                                const SizedBox(height: 12),
                                Text(
                                  'No Printer Selected',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.orange[900],
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Select a printer to enable receipt printing',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.orange[700],
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: _selectPrinter,
                              icon: const Icon(Icons.add),
                              label: const Text('Select Printer'),
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),
                        // Info Card
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(Icons.info_outline, color: Colors.grey[700], size: 20),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Make sure your printer is turned on and Bluetooth is enabled on your device before selecting.',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[700],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // API Configuration Section
                Card(
                  elevation: 2,
                  child: ListTile(
                    leading: Icon(Icons.settings_applications, color: Theme.of(context).colorScheme.primary),
                    title: const Text('API Configuration'),
                    subtitle: const Text('Configure backend server URL'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const ApiConfigScreen(),
                        ),
                      );
                    },
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // About Section
                Card(
                  elevation: 2,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.info, color: Theme.of(context).colorScheme.primary),
                            const SizedBox(width: 12),
                            Text(
                              'About',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _buildAboutItem('App Name', 'Property Collector'),
                        _buildAboutItem('Version', '1.0.0'),
                        _buildAboutItem('Purpose', 'Mobile app for property payment collection'),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  String _getPrinterName(dynamic printer) {
    if (printer == null) return 'Unknown Printer';
    if (printer is Map) return printer['name'] ?? 'Unknown Printer';
    try {
      return printer.name ?? 'Unknown Printer';
    } catch (e) {
      return 'Unknown Printer';
    }
  }

  String _getPrinterAddress(dynamic printer) {
    if (printer == null) return 'Unknown Address';
    if (printer is Map) return printer['address'] ?? 'Unknown Address';
    try {
      return printer.address ?? 'Unknown Address';
    } catch (e) {
      return 'Unknown Address';
    }
  }

  Widget _buildAboutItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 14,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w500,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}
