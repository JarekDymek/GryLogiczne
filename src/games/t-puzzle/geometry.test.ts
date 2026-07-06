import { describe, expect, it } from "vitest";
import { hasAnyOverlap, polygonArea, transformedVertices } from "./geometry";
import { tPuzzleLevels } from "./levels";
import { createInitialPieceStates, pieceDefinitions, piecesById, T_PUZZLE_HEIGHT } from "./pieces";
import { applyDeltaToStates, findSnap } from "./snap";
import { isTargetSolved } from "./validation";
import type { PieceState, QuarterRotation } from "./types";

function solutionStates(): PieceState[] {
  return createInitialPieceStates().map((state) => ({
    ...state,
    position: { x: 0, y: 0 },
    rotation: 0,
    flipped: false,
    groupId: "solution",
    lastValidPosition: { x: 0, y: 0 },
  }));
}

describe("T-Puzzle geometry", () => {
  it("keeps polygon area after four quarter rotations", () => {
    for (const piece of pieceDefinitions) {
      const base: PieceState = {
        pieceId: piece.id,
        position: { x: 0, y: 0 },
        rotation: 0,
        flipped: false,
        zIndex: 1,
        groupId: "test",
        lastValidPosition: { x: 0, y: 0 },
      };
      const area = polygonArea(transformedVertices(piece, base));
      const rotated = [90, 180, 270, 0].reduce(
        (state, rotation) => ({ ...state, rotation: rotation as QuarterRotation }),
        base,
      );
      expect(polygonArea(transformedVertices(piece, rotated))).toBeCloseTo(area, 8);
    }
  });

  it("keeps polygon area after a flip", () => {
    for (const piece of pieceDefinitions) {
      const normal = transformedVertices(piece, {
        pieceId: piece.id,
        position: { x: 0, y: 0 },
        rotation: 0,
        flipped: false,
        zIndex: 1,
        groupId: "test",
        lastValidPosition: { x: 0, y: 0 },
      });
      const flipped = transformedVertices(piece, {
        pieceId: piece.id,
        position: { x: 0, y: 0 },
        rotation: 0,
        flipped: true,
        zIndex: 1,
        groupId: "test",
        lastValidPosition: { x: 0, y: 0 },
      });
      expect(polygonArea(flipped)).toBeCloseTo(polygonArea(normal), 8);
    }
  });

  it("does not treat edge contact in the solved T as overlap", () => {
    expect(hasAnyOverlap(solutionStates(), piecesById)).toBe(false);
  });

  it("detects real overlap", () => {
    const states = solutionStates().map((state) =>
      state.pieceId === "blue-bar" ? { ...state, position: { x: -1, y: -1 } } : state,
    );
    expect(hasAnyOverlap(states, piecesById)).toBe(true);
  });

  it("keeps the mathematical T area stable", () => {
    const totalArea = pieceDefinitions.reduce(
      (sum, piece) => sum + polygonArea(piece.vertices),
      0,
    );
    expect(totalArea).toBeCloseTo(8 - 2 * Math.SQRT2, 8);
  });

  it("uses the four-piece T-puzzle family from the reference image", () => {
    const vertexCounts = Object.fromEntries(
      pieceDefinitions.map((piece) => [piece.id, piece.vertices.length]),
    );

    expect(vertexCounts).toEqual({
      "blue-bar": 4,
      "green-wing": 5,
      "pink-keystone": 4,
      "yellow-cap": 3,
    });
  });

  it("accepts figure 1 in any global board position", () => {
    const shifted = solutionStates().map((state) => ({
      ...state,
      position: { x: state.position.x + 3.4, y: state.position.y - 1.8 },
    }));
    expect(isTargetSolved(tPuzzleLevels[0].targets[0], tPuzzleLevels[0].validation, shifted)).toBe(true);
  });

  it("forms the exact sqrt2-constructed T outline", () => {
    const vertices = solutionStates().flatMap((state) =>
      transformedVertices(piecesById[state.pieceId], state),
    );
    const xs = vertices.map((point) => point.x);
    const ys = vertices.map((point) => point.y);

    expect(Math.min(...xs)).toBeCloseTo(0, 8);
    expect(Math.max(...xs)).toBeCloseTo(3, 8);
    expect(Math.min(...ys)).toBeCloseTo(0, 8);
    expect(Math.max(...ys)).toBeCloseTo(T_PUZZLE_HEIGHT, 8);
    expect(hasAnyOverlap(solutionStates(), piecesById)).toBe(false);
  });

  it("keeps the lower stem trapezoid side lengths from the reference diagram", () => {
    const stem = piecesById["blue-bar"].vertices;
    const edgeLengths = stem.map((point, index) => {
      const next = stem[(index + 1) % stem.length];
      return Math.hypot(next.x - point.x, next.y - point.y);
    });

    expect(edgeLengths[0]).toBeCloseTo(5 - 2 * Math.SQRT2, 8);
    expect(edgeLengths[1]).toBeCloseTo(1, 8);
    expect(edgeLengths[2]).toBeCloseTo(4 - 2 * Math.SQRT2, 8);
    expect(edgeLengths[3]).toBeCloseTo(Math.SQRT2, 8);
  });

  it("puts three figures in every level", () => {
    for (const level of tPuzzleLevels) {
      expect(level.targets).toHaveLength(3);
    }
  });

  it("accepts the exact vector solution for figure 1", () => {
    expect(isTargetSolved(tPuzzleLevels[0].targets[0], tPuzzleLevels[0].validation, solutionStates())).toBe(true);
  });

  it("rejects a visually plausible but wrong transform", () => {
    const wrong = solutionStates().map((state) =>
      state.pieceId === "yellow-cap" ? { ...state, rotation: 90 as QuarterRotation } : state,
    );
    expect(isTargetSolved(tPuzzleLevels[0].targets[0], tPuzzleLevels[0].validation, wrong)).toBe(false);
  });

  it("finds a nearby vertex snap", () => {
    const states = solutionStates().map((state) =>
      state.pieceId === "blue-bar" ? { ...state, position: { x: 0.05, y: 0.05 } } : state,
    );
    const snap = findSnap(states, piecesById, new Set(["blue-bar"]));
    expect(snap).not.toBeNull();
    const snapped = applyDeltaToStates(states, new Set(["blue-bar"]), snap!.delta);
    expect(hasAnyOverlap(snapped, piecesById, new Set(["blue-bar"]))).toBe(false);
  });
});
