import type { LevelDefinition, PieceState, PieceTransform } from "./types";

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

export function isLevelSolved(level: LevelDefinition, states: PieceState[]): boolean {
  if (states.length !== 4) {
    return false;
  }

  const actual = normalizedTransforms(states);
  return level.solutions.some((solution) =>
    matchesSolution(actual, normalizeSolution(solution), level.validation.positionTolerance),
  );
}
