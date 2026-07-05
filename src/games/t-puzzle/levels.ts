import { geometryTolerance } from "./config";
import type { LevelDefinition, PieceTransform } from "./types";

export const figureOneSolution: PieceTransform[] = [
  { pieceId: "blue-bar", x: 0, y: 0, rotation: 0, flipped: false },
  { pieceId: "green-wing", x: 0, y: 0, rotation: 0, flipped: false },
  { pieceId: "pink-keystone", x: 0, y: 0, rotation: 0, flipped: false },
  { pieceId: "yellow-cap", x: 0, y: 0, rotation: 0, flipped: false },
];

export const tPuzzleLevels: LevelDefinition[] = [
  {
    id: "t-puzzle-001",
    displayNumber: 1,
    name: "Klasyczna litera T",
    difficulty: "easy",
    sourceReference: {
      file: "Figury 1.png",
      figure: 1,
    },
    previewScale: 0.35,
    solutions: [figureOneSolution],
    validation: {
      allowGlobalRotation: false,
      allowGlobalMirror: false,
      positionTolerance: geometryTolerance.position,
    },
    timeOptions: [0, 30, 45, 60],
    unlockRules: {
      unlockNextOnComplete: true,
    },
  },
];
