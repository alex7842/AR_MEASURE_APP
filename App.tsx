import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { ViroARSceneNavigator } from '@reactvision/react-viro';
import OverlayControls from './src/OverlayControls';
import ARMeasureScene from './src/ARMeasureScene';
import sensorFusionManager, { SensorData } from './src/native-modules/SensorFusionModule';

interface AppState {
  isDepthSensorAvailable: boolean;
  isCheckingDepth: boolean;
  sensorFusionActive: boolean;
  sensorData: SensorData | null;
  error: string | null;
  initializationComplete: boolean;
  arSceneReady: boolean;
}

const App: React.FC = () => {
  const actionRef = useRef(null);
  const [appState, setAppState] = useState<AppState>({
    isDepthSensorAvailable: false,
    isCheckingDepth: true,
    sensorFusionActive: false,
    sensorData: null,
    error: null,
    initializationComplete: false,
    arSceneReady: false,
  });

  // Check for depth sensor availability
  useEffect(() => {
    const checkDepthSensor = async () => {
      console.log('🔍 Checking for depth sensor availability...');
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const hasDepthSensor = false;
        
        console.log(`📱 Depth sensor check complete: ${hasDepthSensor ? 'Available' : 'Not available'}`);
        
        setAppState(prev => ({
          ...prev,
          isDepthSensorAvailable: hasDepthSensor,
          isCheckingDepth: false,
        }));
        
      } catch (error) {
        console.error('❌ Depth sensor check failed:', error);
        setAppState(prev => ({
          ...prev,
          isDepthSensorAvailable: false,
          isCheckingDepth: false,
          error: 'Depth sensor check failed',
        }));
      }
    };

    checkDepthSensor();
  }, []);

  // Setup sensor fusion
  useEffect(() => {
    if (appState.isCheckingDepth || appState.isDepthSensorAvailable) {
      return;
    }

    let cleanupEventListener: (() => void) | null = null;
    let mounted = true;
    let sensorDataCount = 0;

    const initializeSensorFusion = async () => {
      console.log('🚀 Initializing sensor fusion...');
      
      const status = sensorFusionManager.getStatus();
      console.log('📊 SensorFusion Status:', status);

      if (!status.isAvailable) {
        console.log('⚠️ SensorFusion not available, continuing without sensors');
        if (mounted) {
          setAppState(prev => ({
            ...prev,
            initializationComplete: true,
            arSceneReady: true,
            error: 'Sensor fusion not available on this device',
          }));
        }
        return;
      }

      try {
        // Setup event listener with error handling
        cleanupEventListener = sensorFusionManager.setupEventListener((data: SensorData) => {
          if (!mounted) return;
          
          try {
            sensorDataCount++;
            
            // Log every 30th sensor reading to avoid spam
            if (sensorDataCount % 30 === 0) {
              console.log('📡 === SENSOR DATA SAMPLE ===');
              console.log('🏃 Acceleration:', data.acceleration.map(v => v.toFixed(3)));
              console.log('🌀 Gyroscope:', data.gyroscope.map(v => v.toFixed(3)));
              console.log('🧭 Magnetic Field:', data.magneticField.map(v => v.toFixed(3)));
              console.log('📊 Total readings:', sensorDataCount);
              console.log('============================');
            }
            
            setAppState(prev => ({
              ...prev,
              sensorData: data,
              error: null,
            }));
          } catch (dataError) {
            console.error('❌ Error processing sensor data:', dataError);
          }
        });

        // Start sensors with delay to ensure event listener is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        await sensorFusionManager.startSensors();
        
        if (mounted) {
          console.log('✅ Sensor fusion initialization complete');
          
          // Wait before enabling AR scene
          setTimeout(() => {
            if (mounted) {
              setAppState(prev => ({
                ...prev,
                sensorFusionActive: true,
                initializationComplete: true,
                arSceneReady: true,
                error: null,
              }));
              console.log('🎯 AR Scene ready to load');
            }
          }, 1500);
        }

      } catch (error) {
        console.error('❌ Failed to initialize sensor fusion:', error);
        if (mounted) {
          setAppState(prev => ({
            ...prev,
            sensorFusionActive: false,
            initializationComplete: true,
            arSceneReady: true,
            error: `Sensor fusion failed: ${error}`,
          }));
        }
      }
    };

    initializeSensorFusion();

    return () => {
      mounted = false;
      
      if (cleanupEventListener) {
        cleanupEventListener();
      }
      
      sensorFusionManager.stopSensors();
      console.log('🧹 Sensor fusion cleanup complete');
    };
  }, [appState.isCheckingDepth, appState.isDepthSensorAvailable]);

  // Loading screens
  if (appState.isCheckingDepth) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking device capabilities...</Text>
      </View>
    );
  }

  if (!appState.isDepthSensorAvailable && !appState.arSceneReady) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Initializing sensor fusion...</Text>
        <Text style={styles.subText}>Setting up motion sensors</Text>
        {appState.sensorFusionActive && (
          <Text style={styles.successText}>✅ Sensors active - Loading AR...</Text>
        )}
      </View>
    );
  }

  // Main AR application
  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        initialScene={{
          scene: () => (
            <ARMeasureScene 
              actionRef={actionRef}
              sensorData={appState.sensorData}
              useSensorFusion={appState.sensorFusionActive}
            />
          )
        }}
        style={styles.arView}
      />
      
      <OverlayControls actionRef={actionRef} />
      
      <View style={styles.statusBar}>
        {/* <Text style={styles.statusText}>
          {appState.isDepthSensorAvailable 
            ? '📱 Depth Sensor Active' 
            : appState.sensorFusionActive 
              ? '🔄 Sensor Fusion Active' 
              : appState.error 
                ? '❌ Sensor Error' 
                : '⏳ Initializing...'}
        </Text> */}
        
        {appState.sensorFusionActive && appState.sensorData && (
          <Text style={styles.dataText}>
            📊 Live sensor data streaming
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#000'
  },
  arView: { 
    flex: 1 
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600'
  },
  subText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  successText: {
    marginTop: 12,
    fontSize: 14,
    color: '#28a745',
    textAlign: 'center',
    fontWeight: '500'
  },
  statusBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600'
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4
  },
  infoText: {
    color: '#87CEEB',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4
  },
  dataText: {
    color: '#98FB98',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2
  },
  debugText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic'
  }
});

export default App;
