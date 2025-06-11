// Define the point type if not available from the library
export type Viro3DPoint = [number, number, number];

export type MeasurementPoint = {
  position: Viro3DPoint;
  timestamp: number;
};

export const calculateDistance = (point1: Viro3DPoint, point2: Viro3DPoint): number => {
  const dx = point2[0] - point1[0];
  const dy = point2[1] - point1[1];
  const dz = point2[2] - point1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const calculateArea = (points: Viro3DPoint[]): number => {
  if (points.length < 3) return 0;
  
  // Using the shoelace formula for polygon area
  let area = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i][0] * points[j][2];
    area -= points[j][0] * points[i][2];
  }
  
  return Math.abs(area) / 2;
};

export const getStablePosition = (positions: Viro3DPoint[]): Viro3DPoint => {
  // Simple average of recent positions for stability
  const sum = positions.reduce(
    (acc, pos) => [acc[0] + pos[0], acc[1] + pos[1], acc[2] + pos[2]],
    [0, 0, 0] as Viro3DPoint
  );
  
  return [
    sum[0] / positions.length,
    sum[1] / positions.length,
    sum[2] / positions.length
  ];
};

export const isPointOnPlane = (
  point: Viro3DPoint,
  planeNormal: Viro3DPoint,
  planePoint: Viro3DPoint,
  threshold: number = 0.01
): boolean => {
  // Calculate the vector from the plane point to the test point
  const vectorToPoint: Viro3DPoint = [
    point[0] - planePoint[0],
    point[1] - planePoint[1],
    point[2] - planePoint[2]
  ];
  
  // Dot product of the normal and the vector to point
  const dotProduct = vectorToPoint[0] * planeNormal[0] +
                    vectorToPoint[1] * planeNormal[1] +
                    vectorToPoint[2] * planeNormal[2];
  
  // If the dot product is close to zero, the point is on the plane
  return Math.abs(dotProduct) < threshold;
};

export const calculatePlaneNormal = (points: Viro3DPoint[]): Viro3DPoint | null => {
  if (points.length < 3) return null;
  
  // Take three points to define two vectors on the plane
  const p0 = points[0];
  const p1 = points[1];
  const p2 = points[2];
  
  // Calculate two vectors in the plane
  const v1: Viro3DPoint = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const v2: Viro3DPoint = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
  
  // Calculate cross product (normal vector)
  const nx = v1[1] * v2[2] - v1[2] * v2[1];
  const ny = v1[2] * v2[0] - v1[0] * v2[2];
  const nz = v1[0] * v2[1] - v1[1] * v2[0];
  
  // Normalize the normal vector
  const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (length === 0) return null;
  
  return [nx / length, ny / length, nz / length];
};

export const projectPointOntoPlane = (
  point: Viro3DPoint,
  planeNormal: Viro3DPoint,
  planePoint: Viro3DPoint
): Viro3DPoint => {
  // Calculate the vector from the plane point to the test point
  const vectorToPoint: Viro3DPoint = [
    point[0] - planePoint[0],
    point[1] - planePoint[1],
    point[2] - planePoint[2]
  ];
  
  // Calculate the dot product of the vector and the plane normal
  const dotProduct = vectorToPoint[0] * planeNormal[0] +
                    vectorToPoint[1] * planeNormal[1] +
                    vectorToPoint[2] * planeNormal[2];
  
  // Project the point onto the plane
  return [
    point[0] - dotProduct * planeNormal[0],
    point[1] - dotProduct * planeNormal[1],
    point[2] - dotProduct * planeNormal[2]
  ];
};
