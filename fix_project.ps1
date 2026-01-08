# 1. Define Paths
$BasePath = "android\app\src\main\java\com"
$CorrectPath = "$BasePath\hisaabkitaab\app"
$ManifestPath = "android\app\src\main\AndroidManifest.xml"

# 2. Content for MainActivity.kt
$MainActivityContent = @"
package com.hisaabkitaab.app

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import android.os.Bundle

class MainActivity : ReactActivity() {
  override fun getMainComponentName(): String = "HisaabKitaabMobile"
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
"@

# 3. Content for MainApplication.kt
$MainApplicationContent = @"
package com.hisaabkitaab.app

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.facebook.react.flipper.ReactNativeFlipper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
    ReactNativeFlipper.initializeFlipper(this, reactNativeHost.reactInstanceManager)
  }
}
"@

# 4. Content for AndroidManifest.xml
$ManifestContent = @"
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.hisaabkitaab.app">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

    <application
      android:name=".MainApplication"
      android:requestLegacyExternalStorage="true"  android:label="@string/app_name"
      android:icon="@mipmap/ic_launcher"
      android:roundIcon="@mipmap/ic_launcher_round"
      android:allowBackup="false"
      android:theme="@style/AppTheme">
      <activity
        android:name=".MainActivity"
        android:label="@string/app_name"
        android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"
        android:launchMode="singleTask"
        android:windowSoftInputMode="adjustResize"
        android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
      </activity>
    </application>
</manifest>
"@

# 5. EXECUTE: Wipe and Recreate
Write-Host "Resetting Android folders..."
if (Test-Path $BasePath) { Remove-Item -Recurse -Force $BasePath }
New-Item -ItemType Directory -Force -Path $CorrectPath | Out-Null

# 6. Write Files
Write-Host "Writing clean files..."
Set-Content -Path "$CorrectPath\MainActivity.kt" -Value $MainActivityContent
Set-Content -Path "$CorrectPath\MainApplication.kt" -Value $MainApplicationContent
Set-Content -Path $ManifestPath -Value $ManifestContent

Write-Host "DONE. Folder structure is now strictly: com -> hisaabkitaab -> app"