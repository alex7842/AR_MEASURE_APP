import { NativeModules } from 'react-native';

const { DepthSensorModule } = NativeModules;

interface DepthSensorModuleInterface {
  isDepthSensorAvailable(): Promise<boolean>;
}

export default DepthSensorModule as DepthSensorModuleInterface;
