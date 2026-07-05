import { geometryTolerance } from "./config";
import { pieceDefinitions } from "./pieces";
import type { LevelDefinition, PieceTransform } from "./types";

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function rotatePoint(x: number, y: number, degrees: 0 | 90 | 180 | 270) {
  if (degrees === 90) {
    return { x: -y, y: x };
  }

  if (degrees === 180) {
    return { x: -x, y: -y };
  }

  if (degrees === 270) {
    return { x: y, y: -x };
  }

  return { x, y };
}

function tSolution(rotation: 0 | 90 | 180 | 270): PieceTransform[] {
  return pieceDefinitions.map((piece) => {
    const rotatedCentroid = rotatePoint(piece.centroid.x, piece.centroid.y, rotation);
    return {
      pieceId: piece.id,
      x: round(rotatedCentroid.x - piece.centroid.x),
      y: round(rotatedCentroid.y - piece.centroid.y),
      rotation,
      flipped: false,
    };
  });
}

export const figureOneSolution = tSolution(0);

function defineLevel(
  displayNumber: number,
  name: string,
  difficulty: LevelDefinition["difficulty"],
  rotation: 0 | 90 | 180 | 270,
): LevelDefinition {
  return {
    id: `t-puzzle-${String(displayNumber).padStart(3, "0")}`,
    displayNumber,
    name,
    difficulty,
    sourceReference: {
      file: "Figury 1.png",
      figure: displayNumber,
    },
    previewScale: 0.35,
    solutions: [tSolution(rotation)],
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

export const tPuzzleLevels: LevelDefinition[] = [
  defineLevel(1, "Klasyczna litera T", "easy", 0),
  defineLevel(2, "T obrócone w lewo", "easy", 270),
  defineLevel(3, "T obrócone w prawo", "medium", 90),
  defineLevel(4, "T do góry nogami", "medium", 180),
  defineLevel(5, "T bez podpowiedzi", "hard", 0),
];
