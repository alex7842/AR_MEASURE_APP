package com.virostarterkit

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class SensorFusionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), SensorEventListener {

    private var sensorManager: SensorManager? = null
    private var accelerometer: Sensor? = null
    private var gyroscope: Sensor? = null
    private var magnetometer: Sensor? = null
    private var isActive = false

    // Store latest sensor values as DoubleArray (not FloatArray)
    private var accelerometerValues = DoubleArray(3) { 0.0 }
    private var gyroscopeValues = DoubleArray(3) { 0.0 }
    private var magnetometerValues = DoubleArray(3) { 0.0 }

    init {
        sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        gyroscope = sensorManager?.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
        magnetometer = sensorManager?.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
    }

    override fun getName(): String {
        return "SensorFusionModule"
    }

    @ReactMethod
    fun startSensors(promise: Promise) {
        try {
            if (isActive) {
                promise.resolve("Sensors already active")
                return
            }

            var sensorsRegistered = 0

            accelerometer?.let { sensor ->
                val registered = sensorManager?.registerListener(this, sensor, SensorManager.SENSOR_DELAY_GAME) ?: false
                if (registered) sensorsRegistered++
            }

            gyroscope?.let { sensor ->
                val registered = sensorManager?.registerListener(this, sensor, SensorManager.SENSOR_DELAY_GAME) ?: false
                if (registered) sensorsRegistered++
            }

            magnetometer?.let { sensor ->
                val registered = sensorManager?.registerListener(this, sensor, SensorManager.SENSOR_DELAY_GAME) ?: false
                if (registered) sensorsRegistered++
            }

            if (sensorsRegistered > 0) {
                isActive = true
                promise.resolve("Sensors started successfully - $sensorsRegistered sensors active")
            } else {
                promise.reject("SENSOR_ERROR", "Failed to register any sensors")
            }

        } catch (e: Exception) {
            promise.reject("SENSOR_ERROR", "Failed to start sensors: ${e.message}")
        }
    }

    @ReactMethod
    fun stopSensors() {
        try {
            sensorManager?.unregisterListener(this)
            isActive = false
        } catch (e: Exception) {
            // Ignore errors when stopping
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        event?.let { sensorEvent ->
            try {
                // Convert FloatArray to DoubleArray to avoid React Native conversion issues
                when (sensorEvent.sensor.type) {
                    Sensor.TYPE_ACCELEROMETER -> {
                        accelerometerValues[0] = sensorEvent.values[0].toDouble()
                        accelerometerValues[1] = sensorEvent.values[1].toDouble()
                        accelerometerValues[2] = sensorEvent.values[2].toDouble()
                    }
                    Sensor.TYPE_GYROSCOPE -> {
                        gyroscopeValues[0] = sensorEvent.values[0].toDouble()
                        gyroscopeValues[1] = sensorEvent.values[1].toDouble()
                        gyroscopeValues[2] = sensorEvent.values[2].toDouble()
                    }
                    Sensor.TYPE_MAGNETIC_FIELD -> {
                        magnetometerValues[0] = sensorEvent.values[0].toDouble()
                        magnetometerValues[1] = sensorEvent.values[1].toDouble()
                        magnetometerValues[2] = sensorEvent.values[2].toDouble()
                    }
                }

                // Send combined sensor data
                processSensorData()

            } catch (e: Exception) {
                // Log error but don't crash
                android.util.Log.e("SensorFusionModule", "Error processing sensor data: ${e.message}")
            }
        }
    }

    private fun processSensorData() {
        try {
            if (!isActive || reactApplicationContext == null) return

            // Create WritableMap with proper data types
            val sensorData = Arguments.createMap().apply {
                // Use putArray with WritableArray (not direct array conversion)
                putArray("acceleration", Arguments.createArray().apply {
                    pushDouble(accelerometerValues[0])
                    pushDouble(accelerometerValues[1])
                    pushDouble(accelerometerValues[2])
                })
                
                putArray("gyroscope", Arguments.createArray().apply {
                    pushDouble(gyroscopeValues[0])
                    pushDouble(gyroscopeValues[1])
                    pushDouble(gyroscopeValues[2])
                })
                
                putArray("magneticField", Arguments.createArray().apply {
                    pushDouble(magnetometerValues[0])
                    pushDouble(magnetometerValues[1])
                    pushDouble(magnetometerValues[2])
                })
                
                putDouble("timestamp", System.currentTimeMillis().toDouble())
            }

            // Send event to React Native
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onSensorData", sensorData)

        } catch (e: Exception) {
            android.util.Log.e("SensorFusionModule", "Error sending sensor data: ${e.message}")
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Handle accuracy changes if needed
        when (accuracy) {
            SensorManager.SENSOR_STATUS_ACCURACY_HIGH -> {
                android.util.Log.d("SensorFusionModule", "Sensor accuracy: HIGH")
            }
            SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM -> {
                android.util.Log.d("SensorFusionModule", "Sensor accuracy: MEDIUM")
            }
            SensorManager.SENSOR_STATUS_ACCURACY_LOW -> {
                android.util.Log.d("SensorFusionModule", "Sensor accuracy: LOW")
            }
            SensorManager.SENSOR_STATUS_UNRELIABLE -> {
                android.util.Log.w("SensorFusionModule", "Sensor accuracy: UNRELIABLE")
            }
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        stopSensors()
    }
}
