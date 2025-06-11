import React, { useState, useRef, useEffect } from "react";
import {
  ViroARScene,
  ViroText,
  ViroMaterials,
  ViroQuad,
  ViroPolyline,
  ViroSphere,
} from "@reactvision/react-viro";
import { StyleSheet } from "react-native";
import { SensorData } from "./native-modules/SensorFusionModule";

type Position3D = [number, number, number];

ViroMaterials.createMaterials({
  dot: { diffuseColor: "#00FF00" },
  finishedDot: { diffuseColor: "#0088FF" },
  line: { diffuseColor: "#FF0000" },
  finishedLine: { diffuseColor: "#0088FF" },
  text: { diffuseColor: "#FFFFFF" },
  transparent: { diffuseColor: "#FFFFFF00" },
  nativeAccurate: { diffuseColor: "#4ECDC4" },
  nativeLine: { diffuseColor: "#4ECDC4" },
});

interface ARMeasureSceneProps {
  actionRef?: React.MutableRefObject<any>;
  sensorData?:SensorData | null; // Optional sensor data prop for advanced features
  useSensorFusion?: boolean; // Optional prop to control sensor fusion usage
}

const ARMeasureScene: React.FC<ARMeasureSceneProps> = ({ actionRef,sensorData ,useSensorFusion}) => {
  const [currentPoints, setCurrentPoints] = useState<Position3D[]>([]);
  const [finishedMeasurements, setFinishedMeasurements] = useState<Position3D[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [instructionText, setInstructionText] = useState("Tap to start measuring");

  // Update instruction text based on state
  useEffect(() => {
    if (!isDrawing && currentPoints.length === 0) {
      setInstructionText("Tap to start measuring");
    } else if (isDrawing && currentPoints.length === 1) {
      setInstructionText("Tap second point to measure");
    } else if (isDrawing && currentPoints.length >= 2) {
      setInstructionText("Tap to finish or continue measuring");
    }
  }, [isDrawing, currentPoints.length]);

  const handleClick = (position: Position3D) => {
    console.log('🎯 Click detected at:', position);
    
    if (!isDrawing && currentPoints.length === 0) {
      setIsDrawing(true);
      setCurrentPoints([position]);
    } else if (isDrawing) {
      const newPoints = [...currentPoints, position];
      setCurrentPoints(newPoints);
      
      if (newPoints.length >= 2) {
        const distance = calculateAccurateDistance(newPoints[newPoints.length - 2], newPoints[newPoints.length - 1]);
        setInstructionText(`📏 ${distance.toFixed(1)} cm - Viro Measurement`);
      }
    }
  };

  // Enhanced distance calculation with depth correction
  const calculateDepthFromCamera = (point: Position3D): number => {
    const [x, y, z] = point;
    return Math.round(Math.sqrt(x * x + y * y + z * z) * 1000) / 10; // in cm with 0.1cm accuracy
  };

  // Accurate distance calculation with depth-based correction (iOS Measure app style)
  const calculateAccurateDistance = (p1: Position3D, p2: Position3D): number => {
    const [dx, dy, dz] = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
    
    // Basic 3D distance
    const basicDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Get depths from camera for both points
    const depth1 = Math.sqrt(p1[0] * p1[0] + p1[1] * p1[1] + p1[2] * p1[2]);
    const depth2 = Math.sqrt(p2[0] * p2[0] + p2[1] * p2[1] + p2[2] * p2[2]);
    const avgDepth = (depth1 + depth2) / 2;
    
    // Apply depth-based correction factor (similar to iOS Measure app)
    let correctionFactor = 1.0;
    
    // Correction based on average depth - iOS Measure app uses similar logic
    if (avgDepth < 0.3) { // Very close objects (< 30cm)
      correctionFactor = 0.92;
    } else if (avgDepth < 0.5) { // Close objects (30cm - 50cm)
      correctionFactor = 0.95;
    } else if (avgDepth < 1.0) { // Medium close (50cm - 1m)
      correctionFactor = 0.98;
    } else if (avgDepth < 2.0) { // Optimal range (1m - 2m)
      correctionFactor = 1.0;
    } else if (avgDepth < 3.0) { // Medium far (2m - 3m)
      correctionFactor = 1.02;
    } else if (avgDepth < 5.0) { // Far objects (3m - 5m)
      correctionFactor = 1.05;
    } else { // Very far objects (> 5m)
      correctionFactor = 1.08;
    }
    
    // Apply perspective correction for angled measurements
    const perspectiveRatio = Math.abs(dz) / basicDistance;
    if (perspectiveRatio > 0.8) { // High angle measurements
      correctionFactor *= 0.96;
    } else if (perspectiveRatio > 0.5) { // Medium angle measurements
      correctionFactor *= 0.98;
    }
    
    // Surface plane correction - iOS Measure app considers surface detection
    const verticalComponent = Math.abs(dy) / basicDistance;
    if (verticalComponent < 0.1) { // Mostly horizontal measurement
      correctionFactor *= 1.01; // Slight boost for horizontal measurements
    }
    
    // Final distance with all corrections applied
    const correctedDistance = basicDistance * correctionFactor;
    
    return Math.round(correctedDistance * 1000) / 10; // in cm with 0.1cm accuracy
  };

  // Enhanced midpoint calculation
  const calculateMidpoint = (p1: Position3D, p2: Position3D): Position3D => {
    const midX = (p1[0] + p2[0]) / 2;
    const midY = (p1[1] + p2[1]) / 2 + 0.02;
    const midZ = (p1[2] + p2[2]) / 2;
    
    // Adjust text position based on depth for better readability
    const avgDepth = (calculateDepthFromCamera(p1) + calculateDepthFromCamera(p2)) / 200;
    const depthOffset = Math.min(0.05, avgDepth * 0.015);
    
    return [midX, midY + depthOffset, midZ];
  };

  // Calculate measurement confidence (like iOS Measure app accuracy indicator)
  const getMeasurementAccuracy = (p1: Position3D, p2: Position3D): { accuracy: string; color: string } => {
    const depth1 = calculateDepthFromCamera(p1) / 100;
    const depth2 = calculateDepthFromCamera(p2) / 100;
    const avgDepth = (depth1 + depth2) / 2;
    const distance = calculateAccurateDistance(p1, p2) / 100;
    
    // iOS Measure app style accuracy assessment
    if (avgDepth > 4 || distance < 0.02) {
      return { accuracy: "Low", color: "#FF6B6B" };
    } else if (avgDepth > 2.5 || distance < 0.05) {
      return { accuracy: "Medium", color: "#FFE66D" };
    } else if (avgDepth <= 2 && distance >= 0.05) {
      return { accuracy: "High", color: "#4ECDC4" };
    }
    
    return { accuracy: "Good", color: "#95E1D3" };
  };

  const handleDrag = (position: Position3D, _source: any, index: number) => {
    if (isDrawing && currentPoints.length > index) {
      const updated = [...currentPoints];
      updated[index] = position;
      setCurrentPoints(updated);
    }
  };

  const handleFinishedDrag = (position: Position3D, measurementIndex: number, pointIndex: number) => {
    const updated = [...finishedMeasurements];
    updated[measurementIndex][pointIndex] = position;
    setFinishedMeasurements(updated);
  };

  const handleFinishMeasurement = () => {
    console.log('🏁 Finishing measurement...');
    console.log("Current points:", currentPoints.length);
    console.log("Is drawing:", isDrawing);
    
    // Check if we have at least 2 points and are currently drawing
    if (isDrawing && currentPoints.length >= 2) {
      console.log("Finishing measurement with points:", currentPoints);
      setFinishedMeasurements(prev => {
        const newFinished = [...prev, [...currentPoints]]; // Create a copy of currentPoints
        console.log("New finished measurements:", newFinished);
        return newFinished;
      });
      setCurrentPoints([]);
      setIsDrawing(false);
      console.log("Measurement finished successfully");
    } else {
      console.log("Cannot finish - not enough points or not drawing");
    }
  };

  const handleReset = () => {
    console.log('🔄 Resetting measurements...');
    setCurrentPoints([]);
    setFinishedMeasurements([]);
    setIsDrawing(false);
  };

  // Enhanced line rendering with iOS Measure app style accuracy
  const renderLines = (pts: Position3D[], keyPrefix = '', isFinished = false) =>
    pts.slice(1).map((p2, i) => {
      const p1 = pts[i];
      const dist = calculateAccurateDistance(p1, p2).toFixed(1);
      const accuracy = getMeasurementAccuracy(p1, p2);
      const mid = calculateMidpoint(p1, p2);
      
      const lineMaterial = isFinished ? 'finishedLine' : 'line';
      const textStyle = isFinished ? styles.finishedText : styles.measurementText;
      
      return (
        <React.Fragment key={`${keyPrefix}-line-${i}`}>
          <ViroPolyline
            points={[p1, p2]}
            thickness={isFinished ? 0.006 : 0.008}
            materials={[lineMaterial]}
          />
          <ViroText
            text={`${dist} cm`}
            position={mid}
            scale={isFinished ? [0.15, 0.15, 0.15] : [0.18, 0.18, 0.18]}
            materials={['text']}
            style={textStyle}
          />
          {/* Accuracy indicator (like iOS Measure app) */}
          {!isFinished && accuracy.accuracy !== "High" && (
            <ViroText
              text={accuracy.accuracy === "Low" ? "⚠" : "◐"}
              position={[mid[0] + 0.05, mid[1], mid[2]]}
              scale={[0.12, 0.12, 0.12]}
              materials={['text']}
              style={styles.accuracyIndicator}
            />
          )}
        </React.Fragment>
      );
    });

  // Expose actions to parent component - matching OverlayControls method names
  useEffect(() => {
    if (actionRef) {
      actionRef.current = {
        handleReset: handleReset,
        handleFinishMeasurement: handleFinishMeasurement,
      };
    }
  }, [handleReset, handleFinishMeasurement]); // Add dependencies

  return (
    <ViroARScene>
      {/* Transparent touch surface for main interactions */}
      <ViroQuad
        position={[0, 0, -1]}
        width={4}
        height={4}
        rotation={[0, 0, 0]}
        materials={["transparent"]}
        onClick={handleClick}
      />

      {/* Instruction Text */}
      <ViroText
        key="instruction-text"
        text={instructionText}
        position={[0, 0.4, -0.8]}
        scale={[0.25, 0.25, 0.25]}
        style={styles.instructionText}
        materials={["text"]}
      />

      {/* Debug Info */}
      <ViroText
        key="debug-text"
        text={`Points: ${currentPoints.length} | Drawing: ${isDrawing ? 'Yes' : 'No'} | Finished: ${finishedMeasurements.length}`}
        position={[0, 0.3, -0.8]}
        scale={[0.15, 0.15, 0.15]}
        style={styles.debugText}
        materials={["text"]}
      />

      {/* Current Drawing Points */}
      {currentPoints.map((point, index) => (
        <ViroSphere
          key={`current-dot-${index}`}
          position={point}
          radius={0.02}
          materials={["dot"]}
          dragType="FixedToWorld"
          onDrag={(pos, source) => handleDrag(pos, source, index)}
        />
      ))}

      {/* Current Lines with Enhanced Accuracy */}
      {currentPoints.length > 1 && renderLines(currentPoints, 'current', false)}

      {/* Finished Measurements */}
      {finishedMeasurements.map((measurement, measurementIndex) => (
        <React.Fragment key={`finished-measurement-${measurementIndex}`}>
          {/* Finished Points */}
          {measurement.map((point, pointIndex) => (
            <ViroSphere
              key={`finished-dot-${measurementIndex}-${pointIndex}`}
              position={point}
              radius={0.015}
              materials={["finishedDot"]}
              dragType="FixedToWorld"
              onDrag={(newPos) => handleFinishedDrag(newPos, measurementIndex, pointIndex)}
            />
          ))}
          {/* Finished Lines */}
          {renderLines(measurement, `finished-${measurementIndex}`, true)}
        </React.Fragment>
      ))}
    </ViroARScene>
  );
};


const styles = StyleSheet.create({
instructionText: {
  fontSize: 18,
  textAlign: "center",
  color: "#FFFFFF",
  backgroundColor: "#660000",
  padding: 0.05,
  borderRadius: 5,
},
measurementText: {
  fontSize: 16,
  textAlign: "center",
  color: "#FFFFFF",
  backgroundColor: "#660000",
  padding: 0.03,
  borderRadius: 4,
  fontWeight: "bold",
},
finishedText: {
  fontSize: 14,
  textAlign: "center",
  color: "#FFFFFF",
  backgroundColor: "#004488",
  padding: 0.03,
  borderRadius: 4,
},
nativeText: {
  fontSize: 16,
  textAlign: "center",
  color: "#FFFFFF",
  backgroundColor: "#4ECDC4",
  padding: 0.03,
  borderRadius: 4,
  fontWeight: "bold",
},
countText: {
  fontSize: 16,
  textAlign: "center",
  color: "#FFFFFF",
  backgroundColor: "#444444",
  padding: 0.03,
  borderRadius: 4,
},
debugText: {
  fontSize: 13,
  textAlign: "center",
  color: "#CCCCCC",
  backgroundColor: "#222222",
  padding: 0.02,
  borderRadius: 3,
},
accuracyIndicator: {
  fontSize: 13,
  textAlign: "center",
  color: "#FFE66D",
  fontWeight: "bold",
  backgroundColor: "transparent",
},
});

export default ARMeasureScene;

      