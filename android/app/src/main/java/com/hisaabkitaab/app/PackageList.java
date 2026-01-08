package com.hisaabkitaab.app;

import android.app.Application;
import android.content.Context;
import android.content.res.Resources;

import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainPackageConfig;
import com.facebook.react.shell.MainReactPackage;
import java.util.Arrays;
import java.util.ArrayList;

// --- EXISTING LIBRARIES ---
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage;
import cn.jystudio.bluetooth.RNBluetoothEscposPrinterPackage;
import com.rnfs.RNFSPackage;
import com.swmansion.gesturehandler.RNGestureHandlerPackage;
import com.christopherdro.RNPrint.RNPrintPackage;
import com.swmansion.reanimated.ReanimatedPackage;
import com.th3rdwave.safeareacontext.SafeAreaContextPackage;
import com.swmansion.rnscreens.RNScreensPackage;
import com.horcrux.svg.SvgPackage;

// --- NEW FIREBASE IMPORTS (ADD THESE) ---
import io.invertase.firebase.app.ReactNativeFirebaseAppPackage;
import io.invertase.firebase.auth.ReactNativeFirebaseAuthPackage;
import io.invertase.firebase.firestore.ReactNativeFirebaseFirestorePackage;

public class PackageList {
    private Application application;
    private ReactNativeHost reactNativeHost;
    private MainPackageConfig mConfig;

    public PackageList(ReactNativeHost reactNativeHost) {
        this(reactNativeHost, null);
    }

    public PackageList(Application application) {
        this(application, null);
    }

    public PackageList(ReactNativeHost reactNativeHost, MainPackageConfig config) {
        this.reactNativeHost = reactNativeHost;
        this.mConfig = config;
    }

    public PackageList(Application application, MainPackageConfig config) {
        this.reactNativeHost = null;
        this.application = application;
        this.mConfig = config;
    }

    public ArrayList<ReactPackage> getPackages() {
        return new ArrayList<>(Arrays.<ReactPackage>asList(
                new MainReactPackage(mConfig),
                
                // --- EXISTING PACKAGES ---
                new AsyncStoragePackage(),
                new RNBluetoothEscposPrinterPackage(),
                new RNFSPackage(),
                new RNGestureHandlerPackage(),
                new RNPrintPackage(),
                new ReanimatedPackage(),
                new SafeAreaContextPackage(),
                new RNScreensPackage(),
                new SvgPackage(),

                // --- NEW FIREBASE PACKAGES (ADD THESE) ---
                new ReactNativeFirebaseAppPackage(),
                new ReactNativeFirebaseAuthPackage(),
                new ReactNativeFirebaseFirestorePackage()
        ));
    }
}