package com.virostarterkit

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.virostarterkit.DepthSensorPackage
import com.virostarterkit.SensorFusionPackage
import com.viromedia.bridge.ReactViroPackage
// Uncomment the line below if you have debug/java/com/virostarterkit/ReactNativeFlipper.java
// import com.virostarterkit.ReactNativeFlipper

class MainApplication : Application(), ReactApplication {

    // ✅ Proper override of the abstract property required by ReactApplication
    override val reactNativeHost: ReactNativeHost = object : DefaultReactNativeHost(this) {

        override fun getPackages(): List<ReactPackage> {
            val packages = PackageList(this@MainApplication).packages.toMutableList()
            packages.add(DepthSensorPackage())
            packages.add(SensorFusionPackage())
            packages.add(ReactViroPackage(ReactViroPackage.ViroPlatform.GVR))
            packages.add(ReactViroPackage(ReactViroPackage.ViroPlatform.AR))
            return packages
        }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean
            get() = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED.toString().toBoolean()

        override val isHermesEnabled: Boolean
            get() = BuildConfig.IS_HERMES_ENABLED
    }

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, false)

        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED.toString().toBoolean()) {
            load()
        }

        // If you created this file: android/app/src/debug/java/com/virostarterkit/ReactNativeFlipper.java
        // Then uncomment the line below:
       // ReactNativeFlipper.initializeFlipper(this, reactNativeHost.reactInstanceManager)
    }
}
