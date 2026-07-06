import { polygonCentroid, polygonEdges } from "./geometry";
import type { PieceDefinition, PieceState } from "./types";

const SQRT2 = Math.SQRT2;
export const T_PUZZLE_HEIGHT = 6 - 2 * SQRT2;

function definePiece(
  piece: Omit<PieceDefinition, "centroid" | "edges">,
): PieceDefinition {
  const centroid = polygonCentroid(piece.vertices);
  return {
    ...piece,
    centroid,
    edges: polygonEdges(piece.vertices),
  };
}

export const pieceDefinitions = [
  definePiece({
    id: "blue-bar",
    name: "Dolny trapez trzonu",
    workColor: "blue",
    vertices: [
      { x: 2, y: 1 },
      { x: 2, y: T_PUZZLE_HEIGHT },
      { x: 1, y: T_PUZZLE_HEIGHT },
      { x: 1, y: 2 },
    ],
    flipAxis: { start: { x: 1.5, y: 1.5 }, end: { x: 1.5, y: T_PUZZLE_HEIGHT } },
  }),
  definePiece({
    id: "green-wing",
    name: "Pieciokat srodkowy",
    workColor: "green",
    vertices: [
      { x: SQRT2, y: 0 },
      { x: 3, y: 0 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
    ],
    flipAxis: { start: { x: 1, y: 1 }, end: { x: 3, y: 0 } },
  }),
  definePiece({
    id: "pink-keystone",
    name: "Lewy trapez belki",
    workColor: "red",
    vertices: [
      { x: 0, y: 0 },
      { x: SQRT2, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    flipAxis: { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
  }),
  definePiece({
    id: "yellow-cap",
    name: "Trojkat prawy",
    workColor: "yellow",
    vertices: [
      { x: 3, y: 0 },
      { x: 3, y: 1 },
      { x: 2, y: 1 },
    ],
    flipAxis: { start: { x: 2.5, y: 0.5 }, end: { x: 3, y: 0.5 } },
  }),
] satisfies PieceDefinition[];

export const piecesById = Object.fromEntries(
  pieceDefinitions.map((piece) => [piece.id, piece]),
) as Record<PieceDefinition["id"], PieceDefinition>;

export function createInitialPieceStates(): PieceState[] {
  return [
    {
      pieceId: "blue-bar",
      position: { x: -3.2, y: 0.25 },
      rotation: 0,
      flipped: false,
      zIndex: 1,
      groupId: "group-blue",
      lastValidPosition: { x: -3.2, y: 0.25 },
    },
    {
      pieceId: "green-wing",
      position: { x: 2.65, y: 2.15 },
      rotation: 180,
      flipped: false,
      zIndex: 2,
      groupId: "group-green",
      lastValidPosition: { x: 2.65, y: 2.15 },
    },
    {
      pieceId: "pink-keystone",
      position: { x: -2.2, y: 2.9 },
      rotation: 90,
      flipped: false,
      zIndex: 3,
      groupId: "group-red",
      lastValidPosition: { x: -2.2, y: 2.9 },
    },
    {
      pieceId: "yellow-cap",
      position: { x: 1.2, y: -1.2 },
      rotation: 270,
      flipped: false,
      zIndex: 4,
      groupId: "group-yellow",
      lastValidPosition: { x: 1.2, y: -1.2 },
    },
  ];
}
