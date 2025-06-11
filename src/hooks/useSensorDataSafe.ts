// import { useEffect, useState, useCallback } from 'react';
// import { NativeModules, Platform, DeviceEventEmitter } from 'react-native';

// type SensorData = {
//   acceleration: [number, number, number];
//   gyroscope: [number, number, number];
//   magneticField: [number, number, number];
//   timestamp: number;
// };

// const useSensorDataSafe = (enabled = true) => {
//   const [sensorData, setSensorData] = useState<SensorData | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [isActive, setIsActive] = useState(false);

//   const startSensors = useCallback(async () => {
//     if (Platform.OS !== 'android') {
//       setError('Only available on Android');
//       return false;
//     }

//     const { SensorFusionModule } = NativeModules;
//     if (!SensorFusionModule) {
//       setError('SensorFusionModule not available');
//       return false;
//     }

//     try {
//       await SensorFusionModule.startSensors();
//       setIsActive(true);
//       setError(null);
//       console.log('Sensors started successfully');
//       return true;
//     } catch (e) {
//       console.error('Failed to start sensors:', e);
//       setError('Failed to start sensors');
//       setIsActive(false);
//       return false;
//     }
//   }, []);

//   const stopSensors = useCallback(() => {
//     if (Platform.OS !== 'android') return;

//     const { SensorFusionModule } = NativeModules;
//     if (!SensorFusionModule) return;

//     try {
//       SensorFusionModule.stopSensors();
//       setIsActive(false);
//       console.log('Sensors stopped');
//     } catch (e) {
//       console.error('Failed to stop sensors:', e);
//     }
//   }, []);

//   useEffect(() => {
//     if (!enabled) {
//       stopSensors();
//       return;
//     }

//     let mounted = true;
//     let subscription: any = null;

//     const setupSensors = async () => {
//       try {
//         // Use DeviceEventEmitter to avoid NativeEventEmitter issues
//         subscription = DeviceEventEmitter.addListener('onSensorData', (data: any) => {
//           if (!mounted) return;

//           try {
//             // Safely parse the sensor data to avoid array type errors
//             const safeSensorData: SensorData = {
//               acceleration: [
//                 typeof data?.acceleration?.[0] === 'number' ? data.acceleration[0] : 0,
//                 typeof data?.acceleration?.[1] === 'number' ? data.acceleration[1] : 0,
//                 typeof data?.acceleration?.[2] === 'number' ? data.acceleration[2] : 0,
//               ],
//               gyroscope: [
//                 typeof data?.gyroscope?.[0] === 'number' ? data.gyroscope[0] : 0,
//                 typeof data?.gyroscope?.[1] === 'number' ? data.gyroscope[1] : 0,
//                 typeof data?.gyroscope?.[2] === 'number' ? data.gyroscope[2] : 0,
//               ],
//               magneticField: [
//                 typeof data?.magneticField?.[0] === 'number' ? data.magneticField[0] : 0,
//                 typeof data?.magneticField?.[1] === 'number' ? data.magneticField[1] : 0,
//                 typeof data?.magneticField?.[2] === 'number' ? data.magneticField[2] : 0,
//               ],
//               timestamp: Date.now(),
//             };

//             setSensorData(safeSensorData);
//           } catch (parseError) {
//             console.error('Error parsing sensor data:', parseError);
//           }
//         });

//         // Start sensors
//         await startSensors();
//       } catch (e) {
//         console.error('Setup error:', e);
//         if (mounted) {
//           setError('Setup failed');
//         }
//       }
//     };

//     setupSensors();

//     return () => {
//       mounted = false;
//       if (subscription) {
//         try {
//           subscription.remove();
//         } catch (e) {
//           console.error('Error removing subscription:', e);
//         }
//       }
//       stopSensors();
//     };
//   }, [enabled, startSensors, stopSensors]);

//   return {
//     sensorData,
//     error,
//     isActive,
//     startSensors,
//     stopSensors,
//   };
// };

// export default useSensorDataSafe;