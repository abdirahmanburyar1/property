//
//  Generated file. Do not edit.
//

// clang-format off

#import "GeneratedPluginRegistrant.h"

#if __has_include(<bluetooth_print_plus/BluetoothPrintPlusPlugin.h>)
#import <bluetooth_print_plus/BluetoothPrintPlusPlugin.h>
#else
@import bluetooth_print_plus;
#endif

#if __has_include(<flutter_thermal_printer/FlutterThermalPrinterPlugin.h>)
#import <flutter_thermal_printer/FlutterThermalPrinterPlugin.h>
#else
@import flutter_thermal_printer;
#endif

#if __has_include(<geolocator_apple/GeolocatorPlugin.h>)
#import <geolocator_apple/GeolocatorPlugin.h>
#else
@import geolocator_apple;
#endif

#if __has_include(<image_picker_ios/FLTImagePickerPlugin.h>)
#import <image_picker_ios/FLTImagePickerPlugin.h>
#else
@import image_picker_ios;
#endif

#if __has_include(<permission_handler_apple/PermissionHandlerPlugin.h>)
#import <permission_handler_apple/PermissionHandlerPlugin.h>
#else
@import permission_handler_apple;
#endif

#if __has_include(<shared_preferences_foundation/SharedPreferencesPlugin.h>)
#import <shared_preferences_foundation/SharedPreferencesPlugin.h>
#else
@import shared_preferences_foundation;
#endif

#if __has_include(<sqflite_darwin/SqflitePlugin.h>)
#import <sqflite_darwin/SqflitePlugin.h>
#else
@import sqflite_darwin;
#endif

#if __has_include(<universal_ble/UniversalBlePlugin.h>)
#import <universal_ble/UniversalBlePlugin.h>
#else
@import universal_ble;
#endif

@implementation GeneratedPluginRegistrant

+ (void)registerWithRegistry:(NSObject<FlutterPluginRegistry>*)registry {
  [BluetoothPrintPlusPlugin registerWithRegistrar:[registry registrarForPlugin:@"BluetoothPrintPlusPlugin"]];
  [FlutterThermalPrinterPlugin registerWithRegistrar:[registry registrarForPlugin:@"FlutterThermalPrinterPlugin"]];
  [GeolocatorPlugin registerWithRegistrar:[registry registrarForPlugin:@"GeolocatorPlugin"]];
  [FLTImagePickerPlugin registerWithRegistrar:[registry registrarForPlugin:@"FLTImagePickerPlugin"]];
  [PermissionHandlerPlugin registerWithRegistrar:[registry registrarForPlugin:@"PermissionHandlerPlugin"]];
  [SharedPreferencesPlugin registerWithRegistrar:[registry registrarForPlugin:@"SharedPreferencesPlugin"]];
  [SqflitePlugin registerWithRegistrar:[registry registrarForPlugin:@"SqflitePlugin"]];
  [UniversalBlePlugin registerWithRegistrar:[registry registrarForPlugin:@"UniversalBlePlugin"]];
}

@end
