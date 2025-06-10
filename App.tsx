import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { ViroARSceneNavigator } from '@reactvision/react-viro';
import OverlayControls from './src/OverlayControls';
import ARMeasureScene from './src/ARMeasureScene';

const App = () => {
  const actionRef = useRef<any>(null); // shared control object

  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        initialScene={{ scene: () => <ARMeasureScene actionRef={actionRef} /> }}
        style={styles.arView}
      />
      <OverlayControls actionRef={actionRef} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  arView: { flex: 1 },
});


export default App;