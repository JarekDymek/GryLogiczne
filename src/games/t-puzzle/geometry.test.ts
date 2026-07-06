import { describe, expect, it } from "vitest";
import { hasAnyOverlap, polygonArea, transformedVertices } from "./geometry";
import { tPuzzleLevels } from "./levels";
import { createInitialPieceStates, pieceDefinitions, piecesById, T_PUZZLE_HEIGHT } from "./pieces";
import { applyDeltaToStates, findSnap } from "./snap";
import { isTargetSolved } from "./validation";
import type { PieceRotation, PieceState, PieceTransform } from "./types";

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

function statesFromSolution(solution: PieceTransform[]): PieceState[] {
  return solution.map((transform, index) => ({
    pieceId: transform.pieceId,
    position: { x: transform.x, y: transform.y },
    rotation: transform.rotation,
    flipped: transform.flipped,
    zIndex: index + 1,
    groupId: "verified-solution",
    lastValidPosition: { x: transform.x, y: transform.y },
  }));
}

describe("T-Puzzle geometry", () => {
  it("keeps polygon area after eight 45-degree rotations", () => {
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
      const rotated = [45, 90, 135, 180, 225, 270, 315, 0].reduce(
        (state, rotation) => ({ ...state, rotation: rotation as PieceRotation }),
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
      "pink-keystone": 3,
      "yellow-cap": 4,
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

  it("keeps the approved tile side lengths from the reference diagram", () => {
    const leftTriangle = piecesById["pink-keystone"].vertices;
    const centralPentagon = piecesById["green-wing"].vertices;
    const rightTrapezoid = piecesById["yellow-cap"].vertices;
    const stem = piecesById["blue-bar"].vertices;

    function edgeLengths(vertices: typeof stem): number[] {
      return vertices.map((point, index) => {
        const next = vertices[(index + 1) % vertices.length];
        return Math.hypot(next.x - point.x, next.y - point.y);
      });
    }

    const leftEdges = edgeLengths(leftTriangle);
    expect(leftEdges[0]).toBeCloseTo(Math.SQRT2, 8);
    expect(leftEdges[1]).toBeCloseTo(1, 8);
    expect(leftEdges[2]).toBeCloseTo(1, 8);

    const centralEdges = edgeLengths(centralPentagon);
    expect(centralEdges[0]).toBeCloseTo(Math.SQRT2, 8);
    expect(centralEdges[1]).toBeCloseTo(Math.SQRT2, 8);
    expect(centralEdges[2]).toBeCloseTo(Math.SQRT2 - 1, 8);
    expect(centralEdges[3]).toBeCloseTo(1, 8);
    expect(centralEdges[4]).toBeCloseTo(2 * Math.SQRT2, 8);

    const rightEdges = edgeLengths(rightTrapezoid);
    expect(rightEdges[0]).toBeCloseTo(3 - Math.SQRT2, 8);
    expect(rightEdges[1]).toBeCloseTo(1, 8);
    expect(rightEdges[2]).toBeCloseTo(2 - Math.SQRT2, 8);
    expect(rightEdges[3]).toBeCloseTo(Math.SQRT2, 8);

    const stemEdges = edgeLengths(stem);
    expect(stemEdges[0]).toBeCloseTo(Math.SQRT2, 8);
    expect(stemEdges[1]).toBeCloseTo(4 - 2 * Math.SQRT2, 8);
    expect(stemEdges[2]).toBeCloseTo(1, 8);
    expect(stemEdges[3]).toBeCloseTo(5 - 2 * Math.SQRT2, 8);
  });

  it("keeps the exact solid T outline for preview", () => {
    const outline = tPuzzleLevels[0].targets[0].outline ?? [];
    const xs = outline.map((point) => point.x);
    const ys = outline.map((point) => point.y);

    expect(outline).toHaveLength(8);
    expect(Math.min(...xs)).toBeCloseTo(0, 8);
    expect(Math.max(...xs)).toBeCloseTo(3, 8);
    expect(Math.min(...ys)).toBeCloseTo(0, 8);
    expect(Math.max(...ys)).toBeCloseTo(T_PUZZLE_HEIGHT, 8);
  });

  it("puts three figures in every level", () => {
    for (const level of tPuzzleLevels) {
      expect(level.targets).toHaveLength(3);
    }
  });

  it("builds the verified MOW progression", () => {
    expect(tPuzzleLevels).toHaveLength(3);
    expect(tPuzzleLevels[1].name).toBe("Obroty skosne");
  });

  it("ships only targets with verified exact solutions", () => {
    const allTargets = tPuzzleLevels.flatMap((level) =>
      level.targets.map((target) => ({ level, target })),
    );

    expect(allTargets).toHaveLength(9);
    expect(allTargets[3].target.displayNumber).toBe(4);
    expect(allTargets[3].target.name).toContain("45");

    for (const { level, target } of allTargets) {
      expect(target.maskFigureNumber).toBeUndefined();
      expect(target.solutions.length).toBeGreaterThan(0);

      for (const solution of target.solutions) {
        const states = statesFromSolution(solution);
        expect(hasAnyOverlap(states, piecesById)).toBe(false);
        expect(isTargetSolved(target, level.validation, states)).toBe(true);
      }
    }
  });

  it("accepts the exact vector solution for figure 1", () => {
    expect(isTargetSolved(tPuzzleLevels[0].targets[0], tPuzzleLevels[0].validation, solutionStates())).toBe(true);
  });

  it("rejects a visually plausible but wrong transform", () => {
    const wrong = solutionStates().map((state) =>
      state.pieceId === "yellow-cap" ? { ...state, rotation: 90 as PieceRotation } : state,
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
