import { NativeModules, Platform, DeviceEventEmitter } from 'react-native';

const { SensorFusionModule } = NativeModules;

export interface SensorData {
  acceleration: [number, number, number];
  gyroscope: [number, number, number];
  magneticField: [number, number, number];
  timestamp: number;
}

export interface SensorFusionInterface {
  startSensors(): Promise<string>;
  stopSensors(): void;
  isAvailable(): boolean;
}

class SensorFusionManager implements SensorFusionInterface {
  private isActive = false;
  private subscription: any = null;

  isAvailable(): boolean {
    return Platform.OS === 'android' && !!SensorFusionModule;
  }

  async startSensors(): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('SensorFusion not available on this platform');
    }

    if (this.isActive) {
      return 'Sensors already active';
    }

    try {
      const result = await SensorFusionModule.startSensors();
      this.isActive = true;
      console.log('✅ SensorFusion: Sensors started successfully');
      return result || 'Sensors started successfully';
    } catch (error) {
      console.error('❌ SensorFusion: Failed to start sensors:', error);
      throw error;
    }
  }

  stopSensors(): void {
    if (!this.isAvailable() || !this.isActive) {
      return;
    }

    try {
      SensorFusionModule.stopSensors();
      this.isActive = false;
      console.log('🛑 SensorFusion: Sensors stopped');
    } catch (error) {
      console.error('❌ SensorFusion: Failed to stop sensors:', error);
    }
  }

  setupEventListener(callback: (data: SensorData) => void): () => void {
    if (!this.isAvailable()) {
      console.warn('⚠️ SensorFusion: Event listener not available');
      return () => {};
    }

    try {
      this.subscription = DeviceEventEmitter.addListener('onSensorData', (rawData: any) => {
        try {
          const sensorData: SensorData = {
            acceleration: [
              typeof rawData?.acceleration?.[0] === 'number' ? rawData.acceleration[0] : 0,
              typeof rawData?.acceleration?.[1] === 'number' ? rawData.acceleration[1] : 0,
              typeof rawData?.acceleration?.[2] === 'number' ? rawData.acceleration[2] : 0,
            ],
            gyroscope: [
              typeof rawData?.gyroscope?.[0] === 'number' ? rawData.gyroscope[0] : 0,
              typeof rawData?.gyroscope?.[1] === 'number' ? rawData.gyroscope[1] : 0,
              typeof rawData?.gyroscope?.[2] === 'number' ? rawData.gyroscope[2] : 0,
            ],
            magneticField: [
              typeof rawData?.magneticField?.[0] === 'number' ? rawData.magneticField[0] : 0,
              typeof rawData?.magneticField?.[1] === 'number' ? rawData.magneticField[1] : 0,
              typeof rawData?.magneticField?.[2] === 'number' ? rawData.magneticField[2] : 0,
            ],
            timestamp: Date.now(),
          };

          callback(sensorData);
        } catch (parseError) {
          console.error('❌ SensorFusion: Error parsing sensor data:', parseError);
        }
      });

      console.log('🎧 SensorFusion: Event listener setup complete');

      // Return cleanup function
      return () => {
        if (this.subscription) {
          this.subscription.remove();
          this.subscription = null;
          console.log('🧹 SensorFusion: Event listener cleaned up');
        }
      };
    } catch (error) {
      console.error('❌ SensorFusion: Failed to setup event listener:', error);
      return () => {};
    }
  }

  getStatus() {
    return {
      isAvailable: this.isAvailable(),
      isActive: this.isActive,
      platform: Platform.OS,
      moduleExists: !!SensorFusionModule,
    };
  }
}

// Export singleton instance
export const sensorFusionManager = new SensorFusionManager();
export default sensorFusionManager;
