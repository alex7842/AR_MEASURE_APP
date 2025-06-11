import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import DepthSensorModule from '../native-modules/DepthSensorModule';

const useDepthSensor = () => {
  const [isDepthSensorAvailable, setIsDepthSensorAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkDepthSensor();
  }, []);

  const checkDepthSensor = async () => {
    if (Platform.OS !== 'android') {
      setIsDepthSensorAvailable(false);
      return;
    }

    try {
      setIsChecking(true);
      const available = await DepthSensorModule.isDepthSensorAvailable();
      console.log('Depth sensor available:', available);
      setIsDepthSensorAvailable(available);
      
      if (!available) {
        Alert.alert(
          'Depth Sensor Not Available',
          'Your device does not have a depth sensor. The measurement accuracy might be limited.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error checking depth sensor:', error);
      setIsDepthSensorAvailable(false);
    } finally {
      setIsChecking(false);
    }
  };

  return {
    isDepthSensorAvailable,
    isChecking,
    error: isDepthSensorAvailable === false ? 'Depth sensor not available' : null,
    checkDepthSensor,
  };
};

export default useDepthSensor;
