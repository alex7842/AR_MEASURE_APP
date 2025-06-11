package com.virostarterkit

import android.app.Activity
import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Build
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class DepthSensorModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DepthSensorModule"

    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    @ReactMethod
    fun isDepthSensorAvailable(promise: Promise) {
        try {
            val cameraManager = reactContext.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            val cameraIdList = cameraManager.cameraIdList
            
            for (cameraId in cameraIdList) {
                val characteristics = cameraManager.getCameraCharacteristics(cameraId)
                val capabilities = characteristics.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES)
                
                capabilities?.let { caps ->
                    for (cap in caps) {
                        if (cap == CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_DEPTH_OUTPUT) {
                            promise.resolve(true)
                            return@isDepthSensorAvailable
                        }
                    }
                }
            }
            promise.resolve(false)
        } catch (e: Exception) {
            promise.reject("DEPTH_SENSOR_ERROR", "Error checking depth sensor: ${e.message}")
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep: Required for RN built in Event Emitter Calls.
    }
}