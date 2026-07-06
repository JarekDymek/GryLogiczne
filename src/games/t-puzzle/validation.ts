import type { LevelDefinition, PieceState, PieceTransform } from "./types";
import { hasAnyOverlap, transformedVertices } from "./geometry";
import { piecesById } from "./pieces";
import { targetMasks } from "./targetMasks";

const SILHOUETTE_PADDING = 3;
const SILHOUETTE_MATCH_THRESHOLD = 0.72;
const SILHOUETTE_MISS_LIMIT = 0.32;
const SILHOUETTE_EXTRA_LIMIT = 0.36;

function normalizedTransforms(states: PieceState[]): PieceTransform[] {
  const minX = Math.min(...states.map((state) => state.position.x));
  const minY = Math.min(...states.map((state) => state.position.y));

  return states
    .map((state) => ({
      pieceId: state.pieceId,
      x: state.position.x - minX,
      y: state.position.y - minY,
      rotation: state.rotation,
      flipped: state.flipped,
    }))
    .sort((a, b) => a.pieceId.localeCompare(b.pieceId));
}

function normalizeSolution(solution: PieceTransform[]): PieceTransform[] {
  const minX = Math.min(...solution.map((state) => state.x));
  const minY = Math.min(...solution.map((state) => state.y));

  return solution
    .map((state) => ({
      ...state,
      x: state.x - minX,
      y: state.y - minY,
    }))
    .sort((a, b) => a.pieceId.localeCompare(b.pieceId));
}

function matchesSolution(
  actual: PieceTransform[],
  expected: PieceTransform[],
  tolerance: number,
): boolean {
  return actual.every((state, index) => {
    const target = expected[index];
    return (
      state.pieceId === target.pieceId &&
      state.rotation === target.rotation &&
      state.flipped === target.flipped &&
      Math.abs(state.x - target.x) <= tolerance &&
      Math.abs(state.y - target.y) <= tolerance
    );
  });
}

function pointOnSegment(point: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  const cross = (point.y - a.y) * (b.x - a.x) - (point.x - a.x) * (b.y - a.y);
  if (Math.abs(cross) > 0.001) {
    return false;
  }

  const dot = (point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y);
  if (dot < -0.001) {
    return false;
  }

  const squaredLength = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  return dot <= squaredLength + 0.001;
}

function pointInPolygon(point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean {
  for (let index = 0; index < polygon.length; index += 1) {
    const nextIndex = (index + 1) % polygon.length;
    if (pointOnSegment(point, polygon[index], polygon[nextIndex])) {
      return true;
    }
  }

  let inside = false;
  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const crossesY = current.y > point.y !== previous.y > point.y;
    if (!crossesY) {
      continue;
    }

    const crossingX =
      ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
    if (point.x < crossingX) {
      inside = !inside;
    }
  }

  return inside;
}

function rasterizeStates(states: PieceState[], size: number): string[] | null {
  const polygons = states.map((state) => transformedVertices(piecesById[state.pieceId], state));
  const vertices = polygons.flat();
  const minX = Math.min(...vertices.map((point) => point.x));
  const maxX = Math.max(...vertices.map((point) => point.x));
  const minY = Math.min(...vertices.map((point) => point.y));
  const maxY = Math.max(...vertices.map((point) => point.y));
  const width = maxX - minX;
  const height = maxY - minY;

  if (width <= 0 || height <= 0) {
    return null;
  }

  const scale = (size - SILHOUETTE_PADDING * 2) / Math.max(width, height);
  const offsetX = (size - width * scale) / 2 - minX * scale;
  const offsetY = (size - height * scale) / 2 - minY * scale;
  const normalizedPolygons = polygons.map((polygon) =>
    polygon.map((point) => ({
      x: point.x * scale + offsetX,
      y: point.y * scale + offsetY,
    })),
  );

  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const point = { x: x + 0.5, y: y + 0.5 };
      return normalizedPolygons.some((polygon) => pointInPolygon(point, polygon)) ? "1" : "0";
    }).join(""),
  );
}

export interface SilhouetteSimilarity {
  intersectionOverUnion: number;
  missRatio: number;
  extraRatio: number;
}

export function silhouetteSimilarityForLevel(
  figureNumber: number,
  states: PieceState[],
): SilhouetteSimilarity | null {
  const target = targetMasks[figureNumber];
  if (!target) {
    return null;
  }

  const actualRows = rasterizeStates(states, target.size);
  if (!actualRows) {
    return null;
  }

  let intersection = 0;
  let union = 0;
  let actualFilled = 0;
  let targetFilled = 0;

  for (let y = 0; y < target.size; y += 1) {
    for (let x = 0; x < target.size; x += 1) {
      const actual = actualRows[y][x] === "1";
      const expected = target.rows[y][x] === "1";

      if (actual) {
        actualFilled += 1;
      }
      if (expected) {
        targetFilled += 1;
      }
      if (actual && expected) {
        intersection += 1;
      }
      if (actual || expected) {
        union += 1;
      }
    }
  }

  if (union === 0 || actualFilled === 0 || targetFilled === 0) {
    return null;
  }

  return {
    intersectionOverUnion: intersection / union,
    missRatio: (targetFilled - intersection) / targetFilled,
    extraRatio: (actualFilled - intersection) / actualFilled,
  };
}

function matchesTargetSilhouette(figureNumber: number, states: PieceState[]): boolean {
  const similarity = silhouetteSimilarityForLevel(figureNumber, states);
  if (!similarity) {
    return false;
  }

  return (
    similarity.intersectionOverUnion >= SILHOUETTE_MATCH_THRESHOLD &&
    similarity.missRatio <= SILHOUETTE_MISS_LIMIT &&
    similarity.extraRatio <= SILHOUETTE_EXTRA_LIMIT
  );
}

export function isLevelSolved(level: LevelDefinition, states: PieceState[]): boolean {
  if (states.length !== 4) {
    return false;
  }

  if (hasAnyOverlap(states, piecesById)) {
    return false;
  }

  const actual = normalizedTransforms(states);
  const exactSolution = level.solutions.some((solution) =>
    matchesSolution(actual, normalizeSolution(solution), level.validation.positionTolerance),
  );

  if (level.solutions.length > 0) {
    return exactSolution;
  }

  return matchesTargetSilhouette(level.displayNumber, states);
}
