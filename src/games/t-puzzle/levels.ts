import { geometryTolerance } from "./config";
import { pieceDefinitions } from "./pieces";
import type { LevelDefinition, PieceTransform, QuarterRotation, TargetDefinition } from "./types";

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function rotatePoint(x: number, y: number, degrees: QuarterRotation) {
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

function tSolution(rotation: QuarterRotation): PieceTransform[] {
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
  rotation: QuarterRotation,
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
  defineLevel(1, "Litera T", "easy", [
    exactTarget(1, "Klasyczna litera T", 0),
    exactTarget(2, "T obrocone w prawo", 90),
    exactTarget(3, "T obrocone w lewo", 270),
  ]),
  defineLevel(2, "Podstawowe sylwetki", "easy", [
    catalogTarget(5),
    catalogTarget(6),
    catalogTarget(7),
  ]),
  defineLevel(3, "Niskie figury", "medium", [
    catalogTarget(25),
    catalogTarget(26),
    catalogTarget(27),
  ]),
  defineLevel(4, "Pionowe figury", "medium", [
    catalogTarget(37),
    catalogTarget(39),
    catalogTarget(40),
  ]),
  defineLevel(5, "Symetrie", "hard", [
    catalogTarget(49),
    catalogTarget(50),
    catalogTarget(51),
  ]),
  defineLevel(6, "Zaawansowane", "master", [
    catalogTarget(81),
    catalogTarget(82),
    catalogTarget(83),
  ]),
];
