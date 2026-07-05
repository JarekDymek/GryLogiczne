import { describe, expect, it } from "vitest";
import { hasAnyOverlap, polygonArea, transformedVertices } from "./geometry";
import { tPuzzleLevels } from "./levels";
import { createInitialPieceStates, pieceDefinitions, piecesById } from "./pieces";
import { applyDeltaToStates, findSnap } from "./snap";
import { isLevelSolved } from "./validation";
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
      state.pieceId === "green-wing" ? { ...state, position: { x: 0, y: 1 } } : state,
    );
    expect(hasAnyOverlap(states, piecesById)).toBe(true);
  });

  it("keeps the corrected figure 1 total area at seven square units", () => {
    const totalArea = pieceDefinitions.reduce(
      (sum, piece) => sum + polygonArea(piece.vertices),
      0,
    );
    expect(totalArea).toBeCloseTo(7, 8);
  });

  it("accepts figure 1 in any global board position", () => {
    const shifted = solutionStates().map((state) => ({
      ...state,
      position: { x: state.position.x + 3.4, y: state.position.y - 1.8 },
    }));
    expect(isLevelSolved(tPuzzleLevels[0], shifted)).toBe(true);
  });

  it("rejects a visually plausible but wrong transform", () => {
    const wrong = solutionStates().map((state) =>
      state.pieceId === "yellow-cap" ? { ...state, rotation: 90 as QuarterRotation } : state,
    );
    expect(isLevelSolved(tPuzzleLevels[0], wrong)).toBe(false);
  });

  it("finds a nearby vertex snap", () => {
    const states = solutionStates().map((state) =>
      state.pieceId === "yellow-cap" ? { ...state, position: { x: 0.1, y: 0.05 } } : state,
    );
    const snap = findSnap(states, piecesById, new Set(["yellow-cap"]));
    expect(snap).not.toBeNull();
    const snapped = applyDeltaToStates(states, new Set(["yellow-cap"]), snap!.delta);
    expect(hasAnyOverlap(snapped, piecesById, new Set(["yellow-cap"]))).toBe(false);
  });
});
