# Add project specific ProGuard rules here.
# Keep the PDF Library
-keep class com.htmltopdf.** { *; }
-keep class com.christopherdro.htmltopdf.** { *; }

# --- React Native General ---
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }

# --- Firebase (Crucial) ---
-keep class io.invertase.firebase.** { *; }
-keep class com.google.firebase.** { *; }

# --- Lucide Icons (Uses React Native SVG) ---
-keep class com.horcrux.svg.** { *; }

# --- Vector Icons (If you still have this installed) ---
-keep class com.oblador.vectoricons.** { *; }

# --- React Navigation ---
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }

# --- Async Storage ---
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# --- Bluetooth Printer (FIXED for react-native-bluetooth-escpos-printer) ---
# The library uses "cn.jystudio" in its Android code
-keep class cn.jystudio.bluetooth.** { *; }
-keep class com.reactnative.ivelt.** { *; }