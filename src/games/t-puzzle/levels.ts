import { geometryTolerance } from "./config";
import { figureCatalog } from "./catalog";
import type { LevelDefinition, PieceTransform } from "./types";

export const figureOneSolution: PieceTransform[] = [
  { pieceId: "blue-bar", x: 0, y: 0, rotation: 0, flipped: false },
  { pieceId: "green-wing", x: 0, y: 0, rotation: 0, flipped: false },
  { pieceId: "pink-keystone", x: 0, y: 0, rotation: 0, flipped: false },
  { pieceId: "yellow-cap", x: 0, y: 0, rotation: 0, flipped: false },
];

export const tPuzzleLevels: LevelDefinition[] = figureCatalog.map((figure) => ({
  id: `t-puzzle-${String(figure.figureNumber).padStart(3, "0")}`,
  displayNumber: figure.figureNumber,
  name: figure.figureNumber === 1 ? "Klasyczna litera T" : `Figura ${figure.figureNumber}`,
  difficulty: figure.difficulty,
  sourceReference: {
    file: figure.sourceReference.silhouetteFile,
    figure: figure.figureNumber,
  },
  previewScale: 0.35,
  solutions: figure.figureNumber === 1 ? [figureOneSolution] : [],
  validation: {
    allowGlobalRotation: false,
    allowGlobalMirror: false,
    positionTolerance: geometryTolerance.position,
  },
  timeOptions: [0, 30, 45, 60],
  unlockRules: {
    unlockNextOnComplete: true,
  },
}));
