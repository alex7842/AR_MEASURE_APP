import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

type Props = {
  actionRef: any;
  useDepthSensor?: boolean | null; // Optional prop to control depth sensor usage
};

const OverlayControls = ({ actionRef,useDepthSensor }: Props) => {
  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => actionRef.current?.handleFinishMeasurement?.()}
      >
        <Text style={styles.buttonText}>Finish</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => actionRef.current?.handleReset?.()}
      >
        <Text style={styles.buttonText}>Reset</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default OverlayControls;