import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../providers/property_provider.dart';
import 'property_detail_screen.dart';

class PropertySearchScreen extends StatefulWidget {
  const PropertySearchScreen({super.key});

  @override
  State<PropertySearchScreen> createState() => _PropertySearchScreenState();
}

class _PropertySearchScreenState extends State<PropertySearchScreen> {
  final _plateNumberController = TextEditingController();
  final _ownerPhoneController = TextEditingController();
  final _responsiblePhoneController = TextEditingController();
  
  List<Map<String, dynamic>> _searchResults = [];
  bool _isSearching = false;
  bool _hasSearched = false;
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    // Add listeners for real-time search on phone fields
    _ownerPhoneController.addListener(_onPhoneFieldChanged);
    _responsiblePhoneController.addListener(_onPhoneFieldChanged);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _ownerPhoneController.removeListener(_onPhoneFieldChanged);
    _responsiblePhoneController.removeListener(_onPhoneFieldChanged);
    _plateNumberController.dispose();
    _ownerPhoneController.dispose();
    _responsiblePhoneController.dispose();
    super.dispose();
  }

  void _onPhoneFieldChanged() {
    // Cancel previous timer
    _debounceTimer?.cancel();
    
    // Rebuild to show/hide clear buttons
    setState(() {});
    
    // Only search if at least one phone field has 3+ characters
    final ownerPhone = _ownerPhoneController.text.trim();
    final responsiblePhone = _responsiblePhoneController.text.trim();
    
    if (ownerPhone.length >= 3 || responsiblePhone.length >= 3) {
      // Wait 500ms after user stops typing before searching
      _debounceTimer = Timer(const Duration(milliseconds: 500), () {
        _performSearch(isAutoSearch: true);
      });
    } else if (ownerPhone.isEmpty && responsiblePhone.isEmpty && _hasSearched) {
      // Clear results if both phone fields are empty
      setState(() {
        _searchResults = [];
        _hasSearched = false;
      });
    }
  }

  Future<void> _performSearch({bool isAutoSearch = false}) async {
    // At least one field must be filled
    if (_plateNumberController.text.trim().isEmpty &&
        _ownerPhoneController.text.trim().isEmpty &&
        _responsiblePhoneController.text.trim().isEmpty) {
      if (!isAutoSearch) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter at least one search criteria'),
            backgroundColor: Colors.orange,
          ),
        );
      }
      return;
    }

    setState(() {
      _isSearching = true;
      _hasSearched = true;
    });

    try {
      final propertyProvider = Provider.of<PropertyProvider>(context, listen: false);
      
      // Build query parameters
      Map<String, String> filters = {};
      
      if (_plateNumberController.text.trim().isNotEmpty) {
        filters['plateNumber'] = _plateNumberController.text.trim();
      }
      if (_ownerPhoneController.text.trim().isNotEmpty) {
        filters['ownerPhone'] = _ownerPhoneController.text.trim();
      }
      if (_responsiblePhoneController.text.trim().isNotEmpty) {
        filters['responsiblePhone'] = _responsiblePhoneController.text.trim();
      }

      print('=== PROPERTY SEARCH ===');
      print('Filters: $filters');
      
      await propertyProvider.fetchProperties(filters: filters);
      
      setState(() {
        _searchResults = propertyProvider.properties;
        _isSearching = false;
      });

      print('Search results: ${_searchResults.length} properties found');
    } catch (e) {
      print('Search error: $e');
      setState(() {
        _isSearching = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Search failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _clearSearch() {
    setState(() {
      _plateNumberController.clear();
      _ownerPhoneController.clear();
      _responsiblePhoneController.clear();
      _searchResults = [];
      _hasSearched = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Search Properties'),
        actions: [
          if (_hasSearched)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: _clearSearch,
              tooltip: 'Clear',
            ),
        ],
      ),
      body: Column(
        children: [
          // Search Form - wrapped in SingleChildScrollView to prevent overflow
          SingleChildScrollView(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.grey.withOpacity(0.1),
                    spreadRadius: 1,
                    blurRadius: 3,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Search Criteria',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  
                  TextField(
                    controller: _plateNumberController,
                    decoration: const InputDecoration(
                      labelText: 'Plate Number',
                      hintText: 'Enter plate number',
                      prefixIcon: Icon(Icons.badge),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 10),
                  
                  TextField(
                    controller: _ownerPhoneController,
                    decoration: InputDecoration(
                      labelText: 'Owner Phone',
                      hintText: 'Type to search... (min 3 chars)',
                      prefixIcon: const Icon(Icons.phone),
                      border: const OutlineInputBorder(),
                      isDense: true,
                      suffixIcon: _ownerPhoneController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _ownerPhoneController.clear();
                              },
                            )
                          : null,
                    ),
                    keyboardType: TextInputType.phone,
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 10),
                  
                  TextField(
                    controller: _responsiblePhoneController,
                    decoration: InputDecoration(
                      labelText: 'Responsible Person Phone',
                      hintText: 'Type to search... (min 3 chars)',
                      prefixIcon: const Icon(Icons.contact_phone),
                      border: const OutlineInputBorder(),
                      isDense: true,
                      suffixIcon: _responsiblePhoneController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _responsiblePhoneController.clear();
                              },
                            )
                          : null,
                    ),
                    keyboardType: TextInputType.phone,
                    textInputAction: TextInputAction.search,
                    onSubmitted: (_) => _performSearch(),
                  ),
                  const SizedBox(height: 12),
                  
                  ElevatedButton.icon(
                    onPressed: _isSearching ? null : _performSearch,
                    icon: _isSearching
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.search),
                    label: Text(_isSearching ? 'Searching...' : 'Search'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Search Results
          Expanded(
            child: _buildSearchResults(),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResults() {
    if (_isSearching) {
      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 5,
        itemBuilder: (context, index) => _buildSkeletonCard(),
      );
    }

    if (!_hasSearched) {
      return SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 20),
              Icon(
                Icons.search,
                size: 48,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 12),
              Text(
                'Enter search criteria above',
                style: Theme.of(context).textTheme.titleSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Phone fields search in real-time (min 3 characters)',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.blue,
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                'Plate number requires clicking Search button',
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    if (_searchResults.isEmpty) {
      return SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 20),
              Icon(
                Icons.search_off,
                size: 48,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 12),
              Text(
                'No properties found',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 6),
              Text(
                'Try different search criteria',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _clearSearch,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Clear & Search Again'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: [
        // Results summary banner
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          color: Colors.green[50],
          child: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green[700], size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Found ${_searchResults.length} ${_searchResults.length == 1 ? 'property' : 'properties'}',
                  style: TextStyle(
                    color: Colors.green[700],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _searchResults.length,
      itemBuilder: (context, index) {
        final property = _searchResults[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: Theme.of(context).colorScheme.primaryContainer,
              child: Icon(
                Icons.home,
                color: Theme.of(context).colorScheme.onPrimaryContainer,
              ),
            ),
            title: Text(
              property['streetAddress'] ?? 'N/A',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                if (property['plateNumber'] != null)
                  Row(
                    children: [
                      const Icon(Icons.badge, size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        property['plateNumber'],
                        style: const TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                if (property['owner'] != null && property['owner']['phone'] != null)
                  Row(
                    children: [
                      const Icon(Icons.phone, size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        'Owner: ${property['owner']['phone']}',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                if (property['responsiblePerson'] != null && 
                    property['responsiblePerson']['phone'] != null)
                  Row(
                    children: [
                      const Icon(Icons.contact_phone, size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        'Resp: ${property['responsiblePerson']['phone']}',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
              ],
            ),
            trailing: _buildStatusChip(property['status']),
            isThreeLine: true,
            onTap: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => PropertyDetailScreen(property: property),
                ),
              );
              
              // If property was updated, refresh search results
              if (result == true) {
                _performSearch();
              }
            },
          ),
        );
      },
          ),
        ),
      ],
    );
  }

  Widget _buildSkeletonCard() {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Shimmer.fromColors(
        baseColor: Colors.grey[300]!,
        highlightColor: Colors.grey[100]!,
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: Colors.grey[300],
            radius: 20,
          ),
          title: Container(
            height: 16,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 8),
              Container(
                height: 12,
                width: 120,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(height: 6),
              Container(
                height: 12,
                width: 150,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(height: 6),
              Container(
                height: 12,
                width: 100,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ],
          ),
          trailing: Container(
            width: 60,
            height: 24,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          isThreeLine: true,
        ),
      ),
    );
  }

  Widget _buildStatusChip(dynamic status) {
    if (status == null) return const SizedBox.shrink();
    
    final statusName = status['name'] ?? status['Name'] ?? 'Draft';
    Color chipColor;
    
    switch (statusName.toLowerCase()) {
      case 'approved':
        chipColor = Colors.green;
        break;
      case 'pending':
        chipColor = Colors.orange;
        break;
      case 'rejected':
        chipColor = Colors.red;
        break;
      default:
        chipColor = Colors.grey;
    }

    return Chip(
      label: Text(
        statusName,
        style: const TextStyle(fontSize: 10, color: Colors.white),
      ),
      backgroundColor: chipColor,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    );
  }
}
