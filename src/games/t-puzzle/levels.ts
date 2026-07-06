import { geometryTolerance } from "./config";
import { pieceDefinitions, T_PUZZLE_HEIGHT } from "./pieces";
import type { LevelDefinition, PieceRotation, PieceTransform, Point, TargetDefinition } from "./types";

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

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
      x: round(rotatedCentroid.x - piece.centroid.x),
      y: round(rotatedCentroid.y - piece.centroid.y),
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

function catalogTarget(figureNumber: number, name = `Figura ${figureNumber}`): TargetDefinition {
  return {
    id: `catalog-${String(figureNumber).padStart(3, "0")}`,
    displayNumber: figureNumber,
    name,
    sourceReference: {
      file: "Figury - czarne.jpeg",
      figure: figureNumber,
    },
    previewScale: 0.35,
    maskFigureNumber: figureNumber,
    solutions: [],
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

export const tPuzzleLevels: LevelDefinition[] = [
  defineLevel(1, "Start: litera T", "easy", [
    exactTarget(1, "Klasyczna litera T", 0),
    exactTarget(2, "T obrocone w prawo", 90),
    exactTarget(3, "T obrocone w lewo", 270),
  ]),
  defineLevel(2, "Podstawowe sylwetki", "easy", [
    catalogTarget(5),
    catalogTarget(6),
    catalogTarget(7),
  ]),
  defineLevel(3, "Obrot o 45 stopni", "easy", [
    catalogTarget(8),
    catalogTarget(9),
    catalogTarget(10),
  ]),
  defineLevel(4, "Planowanie ruchow", "medium", [
    catalogTarget(13),
    catalogTarget(14),
    catalogTarget(15),
  ]),
  defineLevel(5, "Niskie figury", "medium", [
    catalogTarget(25),
    catalogTarget(26),
    catalogTarget(27),
  ]),
  defineLevel(6, "Pionowe figury", "medium", [
    catalogTarget(37),
    catalogTarget(39),
    catalogTarget(40),
  ]),
  defineLevel(7, "Odbicia i symetrie", "hard", [
    catalogTarget(49),
    catalogTarget(50),
    catalogTarget(51),
  ]),
  defineLevel(8, "Cierpliwosc", "hard", [
    catalogTarget(57),
    catalogTarget(58),
    catalogTarget(59),
  ]),
  defineLevel(9, "Wyzwanie", "master", [
    catalogTarget(73),
    catalogTarget(74),
    catalogTarget(75),
  ]),
  defineLevel(10, "Mistrzowskie", "master", [
    catalogTarget(81),
    catalogTarget(82),
    catalogTarget(83),
  ]),
];
