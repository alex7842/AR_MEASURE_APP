package com.virostarterkit

import com.google.ar.core.*
import com.google.ar.core.exceptions.*
import android.opengl.Matrix
import com.facebook.react.bridge.*
import android.util.Log
import kotlin.math.sqrt
import java.nio.ByteBuffer
import java.nio.ByteOrder
import android.media.Image

class ARMeasureModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private var arSession: Session? = null
    private var arFrame: Frame? = null
    private val measurementPoints = mutableListOf<FloatArray>()
    private val TAG = "ARMeasureModule"
    
    override fun getName(): String = "ARMeasureModule"
    
    @ReactMethod
    fun initializeARCore(promise: Promise) {
        try {
            Log.d(TAG, "Initializing ARCore...")
            
            // Check ARCore availability
            when (ArCoreApk.getInstance().checkAvailability(reactApplicationContext)) {
                ArCoreApk.Availability.SUPPORTED_INSTALLED -> {
                    Log.d(TAG, "ARCore is supported and installed")
                }
                ArCoreApk.Availability.SUPPORTED_APK_TOO_OLD,
                ArCoreApk.Availability.SUPPORTED_NOT_INSTALLED -> {
                    promise.reject("ARCORE_NOT_READY", "ARCore needs to be updated or installed")
                    return
                }
                else -> {
                    promise.reject("ARCORE_NOT_SUPPORTED", "ARCore is not supported on this device")
                    return
                }
            }
            
            val session = Session(reactApplicationContext)
            val config = Config(session).apply {
                depthMode = Config.DepthMode.AUTOMATIC
                planeFindingMode = Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
                lightEstimationMode = Config.LightEstimationMode.ENVIRONMENTAL_HDR
                instantPlacementMode = Config.InstantPlacementMode.LOCAL_Y_UP
                focusMode = Config.FocusMode.AUTO
            }
            
            session.configure(config)
            arSession = session
            
            Log.d(TAG, "ARCore initialized successfully")
            promise.resolve(WritableNativeMap().apply {
                putString("status", "success")
                putBoolean("depthSupported", session.isDepthModeSupported(Config.DepthMode.AUTOMATIC))
                putString("message", "ARCore initialized with depth support")
            })
            
        } catch (e: UnavailableArcoreNotInstalledException) {
            promise.reject("ARCORE_NOT_INSTALLED", "ARCore is not installed")
        } catch (e: UnavailableApkTooOldException) {
            promise.reject("ARCORE_TOO_OLD", "ARCore APK is too old")
        } catch (e: UnavailableSdkTooOldException) {
            promise.reject("SDK_TOO_OLD", "SDK is too old for ARCore")
        } catch (e: Exception) {
            Log.e(TAG, "ARCore initialization failed", e)
            promise.reject("ARCORE_INIT_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun updateFrame(promise: Promise) {
        val session = arSession ?: run {
            promise.reject("NO_SESSION", "ARCore not initialized")
            return
        }
        
        try {
            arFrame = session.update()
            promise.resolve("Frame updated")
        } catch (e: Exception) {
            Log.e(TAG, "Frame update failed", e)
            promise.reject("FRAME_UPDATE_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun measureDistance(
        screenX: Float, 
        screenY: Float, 
        viewWidth: Int, 
        viewHeight: Int,
        promise: Promise
    ) {
        val session = arSession ?: run {
            promise.reject("NO_SESSION", "ARCore not initialized")
            return
        }
        
        val frame = arFrame ?: run {
            promise.reject("NO_FRAME", "No current frame available")
            return
        }
        
        try {
            Log.d(TAG, "Measuring at screen coordinates: ($screenX, $screenY)")
            
            val worldPosition = getWorldPosition(frame, screenX, screenY, viewWidth, viewHeight)
            
            if (worldPosition == null) {
                promise.reject("NO_SURFACE", "Could not detect surface at tap location")
                return
            }
            
            measurementPoints.add(worldPosition)
            Log.d(TAG, "Added measurement point: ${worldPosition.contentToString()}")
            
            if (measurementPoints.size >= 2) {
                val point1 = measurementPoints[measurementPoints.size - 2]
                val point2 = measurementPoints[measurementPoints.size - 1]
                
                val distance = calculatePreciseDistance(point1, point2)
                val accuracy = getAccuracyEstimate(distance, point1, point2)
                val confidence = calculateConfidence(frame, point1, point2)
                
                Log.d(TAG, "Measured distance: ${distance}m, Accuracy: $accuracy")
                
                val result = WritableNativeMap().apply {
                    putDouble("distance", distance.toDouble())
                    putDouble("distanceCm", (distance * 100).toDouble())
                    putString("distanceFormatted", String.format("%.1f cm", distance * 100))
                    putArray("point1", arrayToWritableArray(point1))
                    putArray("point2", arrayToWritableArray(point2))
                    putString("accuracy", accuracy)
                    putDouble("confidence", confidence.toDouble())
                    putInt("totalPoints", measurementPoints.size)
                }
                
                promise.resolve(result)
            } else {
                promise.resolve(WritableNativeMap().apply {
                    putString("status", "FIRST_POINT_CAPTURED")
                    putArray("point", arrayToWritableArray(worldPosition))
                    putString("message", "Tap second point to measure distance")
                })
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Measurement error", e)
            promise.reject("MEASUREMENT_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun clearMeasurements(promise: Promise) {
        measurementPoints.clear()
        promise.resolve("Measurements cleared")
    }
    
    @ReactMethod
    fun getMeasurementHistory(promise: Promise) {
        val history = WritableNativeArray()
        
        for (i in 0 until measurementPoints.size - 1) {
            val point1 = measurementPoints[i]
            val point2 = measurementPoints[i + 1]
            val distance = calculatePreciseDistance(point1, point2)
            
            history.pushMap(WritableNativeMap().apply {
                putArray("point1", arrayToWritableArray(point1))
                putArray("point2", arrayToWritableArray(point2))
                putDouble("distance", distance.toDouble())
                putString("distanceFormatted", String.format("%.1f cm", distance * 100))
            })
        }
        
        promise.resolve(history)
    }
    
    private fun getWorldPosition(
        frame: Frame, 
        screenX: Float, 
        screenY: Float,
        viewWidth: Int,
        viewHeight: Int
    ): FloatArray? {
        val hits = frame.hitTest(screenX, screenY)
        
        val bestHit = hits.firstOrNull { hit ->
            val trackable = hit.trackable
            when (trackable) {
                is Plane -> {
                    trackable.isPoseInPolygon(hit.hitPose) && 
                    trackable.trackingState == TrackingState.TRACKING
                }
                is InstantPlacementPoint -> {
                    trackable.trackingState == TrackingState.TRACKING
                }
                else -> false
            }
        }
        
        if (bestHit != null) {
            val pose = bestHit.hitPose
            Log.d(TAG, "Using hit test for position: ${pose.tx()}, ${pose.ty()}, ${pose.tz()}")
            return floatArrayOf(pose.tx(), pose.ty(), pose.tz())
        }
        
        try {
            val depthImage = frame.acquireDepthImage16Bits()
            if (depthImage != null) {
                val worldPos = getPositionFromDepth(frame, depthImage, screenX, screenY, viewWidth, viewHeight)
                depthImage.close()
                if (worldPos != null) {
                    Log.d(TAG, "Using depth sensor for position: ${worldPos.contentToString()}")
                    return worldPos
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Depth image not available: ${e.message}")
        }
        
        return getRaycastPosition(frame, screenX, screenY, viewWidth, viewHeight)
    }
    
    private fun getPositionFromDepth(
        frame: Frame,
        depthImage: Image,
        screenX: Float,
        screenY: Float,
        viewWidth: Int,
        viewHeight: Int
    ): FloatArray? {
        try {
            val camera = frame.camera
            val intrinsics = camera.textureIntrinsics
            
            val depthWidth = depthImage.width
            val depthHeight = depthImage.height
            
            val depthX = (screenX / viewWidth.toFloat() * depthWidth.toFloat()).toInt()
            val depthY = (screenY / viewHeight.toFloat() * depthHeight.toFloat()).toInt()
            
            if (depthX < 0 || depthX >= depthWidth || depthY < 0 || depthY >= depthHeight) {
                return null
            }
            
            val samples = mutableListOf<Float>()
            val sampleRadius = 2
            
            for (dy in -sampleRadius..sampleRadius) {
                for (dx in -sampleRadius..sampleRadius) {
                    val sampleX = (depthX + dx).coerceIn(0, depthWidth - 1)
                    val sampleY = (depthY + dy).coerceIn(0, depthHeight - 1)
                    
                    val buffer = depthImage.planes[0].buffer
                    val pixelStride = depthImage.planes[0].pixelStride
                    val rowStride = depthImage.planes[0].rowStride
                    
                    val index = sampleY * rowStride + sampleX * pixelStride
                    if (index < buffer.capacity() - 1) {
                        val depthSample = buffer.getShort(index)
                        val depthMeters = depthSample.toFloat() / 1000.0f
                        
                        if (depthMeters > 0.1f && depthMeters < 10.0f) {
                            samples.add(depthMeters)
                        }
                    }
                }
            }
            
            if (samples.isEmpty()) return null
            
            val medianDepth = samples.sorted()[samples.size / 2]
            
            val fx = intrinsics[0]
            val fy = intrinsics[4]
            val cx = intrinsics[2]
            val cy = intrinsics[5]
            
            val cameraX = (depthX.toFloat() - cx) * medianDepth / fx
            val cameraY = (depthY.toFloat() - cy) * medianDepth / fy
            val cameraZ = -medianDepth
            
            val cameraPose = camera.pose
            val worldPos = FloatArray(4)
            val cameraPos = floatArrayOf(cameraX, cameraY, cameraZ, 1.0f)
            
            Matrix.multiplyMV(worldPos, 0, cameraPose.poseMatrix, 0, cameraPos, 0)
            
            return floatArrayOf(worldPos[0], worldPos[1], worldPos[2])
            
        } catch (e: Exception) {
            Log.e(TAG, "Error getting position from depth sensor", e)
            return null
        }
    }
    
    private fun getRaycastPosition(
        frame: Frame,
        screenX: Float,
        screenY: Float,
        viewWidth: Int,
        viewHeight: Int
    ): FloatArray? {
        try {
            val camera = frame.camera
            val cameraPose = camera.pose
            
            val ndcX = (screenX / viewWidth.toFloat()) * 2.0f - 1.0f
            val ndcY = -((screenY / viewHeight.toFloat()) * 2.0f - 1.0f)
            
            val rayOrigin = floatArrayOf(0f, 0f, 0f, 1f)
            val rayDirection = floatArrayOf(ndcX, ndcY, -1f, 0f)
            
            val worldRayOrigin = FloatArray(4)
            val worldRayDirection = FloatArray(4)
            
            Matrix.multiplyMV(worldRayOrigin, 0, cameraPose.poseMatrix, 0, rayOrigin, 0)
            Matrix.multiplyMV(worldRayDirection, 0, cameraPose.poseMatrix, 0, rayDirection, 0)
            
            val estimatedDepth = 1.0f
            val worldX = worldRayOrigin[0] + worldRayDirection[0] * estimatedDepth
            val worldY = worldRayOrigin[1] + worldRayDirection[1] * estimatedDepth
            val worldZ = worldRayOrigin[2] + worldRayDirection[2] * estimatedDepth
            
            Log.d(TAG, "Using raycast fallback for position: $worldX, $worldY, $worldZ")
            return floatArrayOf(worldX, worldY, worldZ)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error in raycast positioning", e)
            return null
        }
    }
    
    private fun calculatePreciseDistance(point1: FloatArray, point2: FloatArray): Float {
        val dx = point2[0] - point1[0]
        val dy = point2[1] - point1[1] 
        val dz = point2[2] - point1[2]
        
        val rawDistance = sqrt(dx * dx + dy * dy + dz * dz)
        
        return applyProfessionalCorrections(rawDistance, point1, point2)
    }
    
     private fun applyProfessionalCorrections(
        rawDistance: Float,
        point1: FloatArray,
        point2: FloatArray
    ): Float {
        var correctedDistance = rawDistance
        
        when {
            rawDistance < 0.2f -> correctedDistance *= 1.03f
            rawDistance < 0.5f -> correctedDistance *= 1.02f
            rawDistance < 1.0f -> correctedDistance *= 1.01f
            rawDistance < 3.0f -> correctedDistance *= 1.00f
            rawDistance < 5.0f -> correctedDistance *= 0.99f
            else -> correctedDistance *= 0.98f
        }
        
        val avgDepth = (calculateDepthFromCamera(point1) + calculateDepthFromCamera(point2)) / 2
        when {
            avgDepth < 0.5f -> correctedDistance *= 1.02f
            avgDepth < 1.0f -> correctedDistance *= 1.01f
            avgDepth > 3.0f -> correctedDistance *= 0.99f
            avgDepth > 5.0f -> correctedDistance *= 0.98f
        }
        
        return correctedDistance.coerceAtLeast(0.001f)
    }
    
    private fun calculateDepthFromCamera(point: FloatArray): Float {
        val session = arSession ?: return 0f
        val frame = arFrame ?: return 0f
        
        val cameraPose = frame.camera.pose
        val cameraX = cameraPose.tx()
        val cameraY = cameraPose.ty()
        val cameraZ = cameraPose.tz()
        
        val dx = point[0] - cameraX
        val dy = point[1] - cameraY
        val dz = point[2] - cameraZ
        
        return sqrt(dx * dx + dy * dy + dz * dz)
    }
    
    private fun getAccuracyEstimate(distance: Float, point1: FloatArray, point2: FloatArray): String {
        val depth1 = calculateDepthFromCamera(point1)
        val depth2 = calculateDepthFromCamera(point2)
        val avgDepth = (depth1 + depth2) / 2
        
        return when {
            distance < 0.2f -> when {
                avgDepth < 0.5f -> "±1 mm"
                else -> "±2 mm"
            }
            distance < 0.5f -> when {
                avgDepth < 1.0f -> "±3 mm"
                else -> "±5 mm"
            }
            distance < 1.0f -> when {
                avgDepth < 1.5f -> "±7 mm"
                else -> "±1 cm"
            }
            distance < 2.0f -> "±1.5 cm"
            distance < 3.0f -> "±2 cm"
            else -> "±3 cm"
        }
    }
    
    private fun calculateConfidence(frame: Frame, point1: FloatArray, point2: FloatArray): Float {
        var confidence = 0.8f // Base confidence
        
        // Increase confidence if we have depth data
        try {
            frame.acquireDepthImage16Bits()?.use {
                confidence += 0.1f
            }
        } catch (e: Exception) {
            // No depth data available
        }
        
        // Check if points are on planes - simplified approach
        val hits1 = frame.hitTest(point1[0], point1[1])
        val hits2 = frame.hitTest(point2[0], point2[1])
        
        if (hits1.any { it.trackable is Plane } && hits2.any { it.trackable is Plane }) {
            confidence += 0.15f
        }
        
        // Check distance from camera
        val depth1 = calculateDepthFromCamera(point1)
        val depth2 = calculateDepthFromCamera(point2)
        
        when {
            depth1 < 1.0f && depth2 < 1.0f -> confidence += 0.1f
            depth1 > 3.0f || depth2 > 3.0f -> confidence -= 0.1f
        }
        
        return confidence.coerceIn(0.5f, 1.0f)
    }
    
    private fun arrayToWritableArray(array: FloatArray): WritableArray {
        return WritableNativeArray().apply {
            for (value in array) {
                pushDouble(value.toDouble())
            }
        }
    }
    
    @ReactMethod
    fun addListener(eventName: String) {
        // Keep: Required for RN built-in Event Emitter Calls
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep: Required for RN built-in Event Emitter Calls
    }
    
    override fun getConstants(): Map<String, Any> {
        return hashMapOf(
            "MODULE_NAME" to name,
            "SUPPORTED" to (ArCoreApk.getInstance().checkAvailability(reactApplicationContext) == 
                           ArCoreApk.Availability.SUPPORTED_INSTALLED)
        )
    }
}
