export interface Point {
  x: number;
  y: number;
}

export interface Edge {
  start: Point;
  end: Point;
}

export interface FlipAxis {
  start: Point;
  end: Point;
}

export type PieceId = "blue-bar" | "green-wing" | "pink-keystone" | "yellow-cap";
export type QuarterRotation = 0 | 90 | 180 | 270;

export interface PieceDefinition {
  id: PieceId;
  name: string;
  workColor: "blue" | "green" | "red" | "yellow";
  vertices: Point[];
  centroid: Point;
  flipAxis: FlipAxis;
  edges: Edge[];
}

export interface PieceState {
  pieceId: PieceId;
  position: Point;
  rotation: QuarterRotation;
  flipped: boolean;
  zIndex: number;
  groupId: string;
  lastValidPosition: Point;
}

export interface PieceTransform {
  pieceId: PieceId;
  x: number;
  y: number;
  rotation: QuarterRotation;
  flipped: boolean;
}

export interface LevelDefinition {
  id: string;
  displayNumber: number;
  name: string;
  difficulty: "easy" | "medium" | "hard" | "master";
  sourceReference: {
    file: string;
    figure: number;
  };
  previewScale: number;
  solutions: PieceTransform[][];
  validation: {
    allowGlobalRotation: boolean;
    allowGlobalMirror: boolean;
    positionTolerance: number;
  };
  timeOptions: Array<0 | 30 | 45 | 60>;
  unlockRules: {
    unlockNextOnComplete: boolean;
  };
}

export interface SnapResult {
  delta: Point;
  targetGroupId: string;
}
