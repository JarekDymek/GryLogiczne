import { geometryTolerance } from "./config";
import { pieceDefinitions, T_PUZZLE_HEIGHT } from "./pieces";
import type { LevelDefinition, PieceRotation, PieceTransform, Point, TargetDefinition } from "./types";

function rotatePoint(x: number, y: number, degrees: PieceRotation): Point {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

const BASE_T_OUTLINE: Point[] = [
  { x: 0, y: 0 },
  { x: 3, y: 0 },
  { x: 3, y: 1 },
  { x: 2, y: 1 },
  { x: 2, y: T_PUZZLE_HEIGHT },
  { x: 1, y: T_PUZZLE_HEIGHT },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

function outlineForRotation(rotation: PieceRotation): Point[] {
  const rotated = BASE_T_OUTLINE.map((point) => rotatePoint(point.x, point.y, rotation));
  const minX = Math.min(...rotated.map((point) => point.x));
  const minY = Math.min(...rotated.map((point) => point.y));

  return rotated.map((point) => ({
    x: point.x - minX,
    y: point.y - minY,
  }));
}

function tSolution(rotation: PieceRotation): PieceTransform[] {
  return pieceDefinitions.map((piece) => {
    const rotatedCentroid = rotatePoint(piece.centroid.x, piece.centroid.y, rotation);
    return {
      pieceId: piece.id,
      x: rotatedCentroid.x - piece.centroid.x,
      y: rotatedCentroid.y - piece.centroid.y,
      rotation,
      flipped: false,
    };
  });
}

function exactTarget(
  displayNumber: number,
  name: string,
  rotation: PieceRotation,
): TargetDefinition {
  return {
    id: `exact-t-${displayNumber}`,
    displayNumber,
    name,
    sourceReference: {
      file: "matematyczny schemat T-puzzle",
      figure: displayNumber,
    },
    previewScale: 0.35,
    outline: outlineForRotation(rotation),
    solutions: [tSolution(rotation)],
  };
}

function verifiedTarget(
  displayNumber: number,
  name: string,
  solution: PieceTransform[],
): TargetDefinition {
  return {
    id: `verified-${String(displayNumber).padStart(3, "0")}`,
    displayNumber,
    name,
    sourceReference: {
      file: "uklad zweryfikowany w aplikacji",
      figure: displayNumber,
    },
    previewScale: 0.35,
    solutions: [solution],
  };
}

function defineLevel(
  displayNumber: number,
  name: string,
  difficulty: LevelDefinition["difficulty"],
  targets: TargetDefinition[],
): LevelDefinition {
  return {
    id: `t-puzzle-stage-${String(displayNumber).padStart(2, "0")}`,
    displayNumber,
    name,
    difficulty,
    targets,
    validation: {
      allowGlobalRotation: false,
      allowGlobalMirror: false,
      positionTolerance: geometryTolerance.position,
    },
    timeOptions: [0, 30, 45, 60],
    unlockRules: {
      unlockNextOnComplete: true,
    },
  };
}

export const figureOneSolution = tSolution(0);

const horizontalBeamSolution: PieceTransform[] = [
  { pieceId: "blue-bar", x: 0.9963527438736683, y: -1.8607130605001914, rotation: 90, flipped: false },
  { pieceId: "green-wing", x: 2.8761166150516724, y: -0.14863430207426842, rotation: 315, flipped: false },
  { pieceId: "pink-keystone", x: 0.9191197709602381, y: -0.3333333333333326, rotation: 180, flipped: false },
  { pieceId: "yellow-cap", x: -1.8374642768363678, y: 0.15349857107345533, rotation: 180, flipped: false },
];

export const tPuzzleLevels: LevelDefinition[] = [
  defineLevel(1, "Start: litera T", "easy", [
    exactTarget(1, "Klasyczna litera T", 0),
    exactTarget(2, "T obrocone w prawo", 90),
    exactTarget(3, "T obrocone w lewo", 270),
  ]),
  defineLevel(2, "Obroty skosne", "easy", [
    exactTarget(4, "T pod katem 45 stopni", 45),
    exactTarget(5, "T pod katem 135 stopni", 135),
    exactTarget(6, "T pod katem 225 stopni", 225),
  ]),
  defineLevel(3, "Sprawdzone uklady", "medium", [
    exactTarget(7, "T odwrocone", 180),
    exactTarget(8, "T pod katem 315 stopni", 315),
    verifiedTarget(9, "Dluga belka", horizontalBeamSolution),
  ]),
];
