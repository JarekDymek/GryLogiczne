import { polygonCentroid, polygonEdges } from "./geometry";
import type { PieceDefinition, PieceState } from "./types";

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
    name: "Niebieski prawy trapez belki",
    workColor: "blue",
    vertices: [
      { x: 2, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 1 },
      { x: 3, y: 1 },
    ],
    flipAxis: { start: { x: 3, y: 0.5 }, end: { x: 4, y: 0.5 } },
  }),
  definePiece({
    id: "green-wing",
    name: "Zielony trojkat lewy",
    workColor: "green",
    vertices: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    flipAxis: { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
  }),
  definePiece({
    id: "pink-keystone",
    name: "Czerwony pieciokat srodkowy",
    workColor: "red",
    vertices: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
    flipAxis: { start: { x: 1.25, y: 0.5 }, end: { x: 2, y: 1.25 } },
  }),
  definePiece({
    id: "yellow-cap",
    name: "Zolty trapez trzonu",
    workColor: "yellow",
    vertices: [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 4 },
      { x: 1, y: 4 },
    ],
    flipAxis: { start: { x: 1.5, y: 2.5 }, end: { x: 2, y: 2.5 } },
  }),
] satisfies PieceDefinition[];

export const piecesById = Object.fromEntries(
  pieceDefinitions.map((piece) => [piece.id, piece]),
) as Record<PieceDefinition["id"], PieceDefinition>;

export function createInitialPieceStates(): PieceState[] {
  return [
    {
      pieceId: "blue-bar",
      position: { x: 1.7, y: 2.6 },
      rotation: 180,
      flipped: false,
      zIndex: 1,
      groupId: "group-blue",
      lastValidPosition: { x: 1.7, y: 2.6 },
    },
    {
      pieceId: "green-wing",
      position: { x: -3.3, y: 1.3 },
      rotation: 90,
      flipped: false,
      zIndex: 2,
      groupId: "group-green",
      lastValidPosition: { x: -3.3, y: 1.3 },
    },
    {
      pieceId: "pink-keystone",
      position: { x: -3.0, y: -0.8 },
      rotation: 0,
      flipped: false,
      zIndex: 3,
      groupId: "group-red",
      lastValidPosition: { x: -3.0, y: -0.8 },
    },
    {
      pieceId: "yellow-cap",
      position: { x: 1.0, y: -1.4 },
      rotation: 270,
      flipped: false,
      zIndex: 4,
      groupId: "group-yellow",
      lastValidPosition: { x: 1.0, y: -1.4 },
    },
  ];
}
