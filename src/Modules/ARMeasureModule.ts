import { NativeModules } from 'react-native';

interface ARMeasureModuleInterface {
  initializeARCore(): Promise<{
    status: string;
    depthSupported: boolean;
    message: string;
  }>;
  
  updateFrame(): Promise<string>;
  
  measureDistance(
    screenX: number,
    screenY: number,
    viewWidth: number,
    viewHeight: number
  ): Promise<any>;
  
  clearMeasurements(): Promise<string>;
  getMeasurementHistory(): Promise<any[]>;
}

const { ARMeasureModule } = NativeModules;

export default ARMeasureModule as ARMeasureModuleInterface;
