import {
  Check,
  ChevronRight,
  FlipHorizontal2,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  Timer,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { boardViewBox } from "../config";
import { hasAnyOverlap, pathFromPoints, transformedVertices } from "../geometry";
import { tPuzzleLevels } from "../levels";
import { createInitialPieceStates, piecesById } from "../pieces";
import { applyDeltaToStates, findSnap } from "../snap";
import type { PieceState, Point, QuarterRotation } from "../types";
import { isLevelSolved } from "../validation";

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const BASE_T_SILHOUETTE: Point[] = [
  { x: 0, y: 0 },
  { x: 3, y: 0 },
  { x: 3, y: 1 },
  { x: 2, y: 1 },
  { x: 2, y: 4 },
  { x: 1, y: 4 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

function rotateValue(rotation: QuarterRotation, delta: 90 | -90): QuarterRotation {
  return ((rotation + delta + 360) % 360) as QuarterRotation;
}

function rotatePoint(point: Point, rotation: QuarterRotation): Point {
  if (rotation === 90) {
    return { x: -point.y, y: point.x };
  }

  if (rotation === 180) {
    return { x: -point.x, y: -point.y };
  }

  if (rotation === 270) {
    return { x: point.y, y: -point.x };
  }

  return point;
}

function boundsForPoints(points: Point[]): Bounds {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

function targetSilhouette(rotation: QuarterRotation): Point[] {
  const rotated = BASE_T_SILHOUETTE.map((point) => rotatePoint(point, rotation));
  const bounds = boundsForPoints(rotated);
  return rotated.map((point) => ({
    x: point.x - bounds.minX,
    y: point.y - bounds.minY,
  }));
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function svgPoint(svg: SVGSVGElement, event: PointerEvent | ReactPointerEvent): Point {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const matrix = svg.getScreenCTM();

  if (!matrix) {
    return { x: 0, y: 0 };
  }

  return point.matrixTransform(matrix.inverse());
}

function groupIdsFor(states: PieceState[], pieceId: string): Set<string> {
  const groupId = states.find((state) => state.pieceId === pieceId)?.groupId;
  return new Set(states.filter((state) => state.groupId === groupId).map((state) => state.pieceId));
}

export function TPuzzleGame() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [states, setStates] = useState<PieceState[]>(() => createInitialPieceStates());
  const [selectedPieceId, setSelectedPieceId] = useState<string>("blue-bar");
  const [message, setMessage] = useState("Uloz cztery elementy w sylwetke litery T.");
  const [isSolved, setIsSolved] = useState(false);
  const [moves, setMoves] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(() => new Set());
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startPoint: Point;
    startStates: PieceState[];
    activeIds: Set<string>;
  } | null>(null);

  const level = tPuzzleLevels[levelIndex];
  const targetRotation = level.solutions[0]?.[0]?.rotation ?? 0;
  const targetPoints = useMemo(() => targetSilhouette(targetRotation), [targetRotation]);
  const previewBounds = useMemo(() => {
    const bounds = boundsForPoints(targetPoints);
    const padding = 0.18;
    return {
      x: bounds.minX - padding,
      y: bounds.minY - padding,
      width: bounds.maxX - bounds.minX + padding * 2,
      height: bounds.maxY - bounds.minY + padding * 2,
    };
  }, [targetPoints]);

  const sortedStates = useMemo(
    () => [...states].sort((a, b) => a.zIndex - b.zIndex),
    [states],
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!isSolved) {
        setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isSolved, startedAt]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "q") {
        rotateSelected(-90);
      }

      if (event.key.toLowerCase() === "e") {
        rotateSelected(90);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function restartTimer() {
    setStartedAt(Date.now());
    setElapsedSeconds(0);
  }

  function resetBoard(nextMessage = "Poziom zresetowany.") {
    setStates(createInitialPieceStates());
    setSelectedPieceId("blue-bar");
    setIsSolved(false);
    setMoves(0);
    setMessage(nextMessage);
    restartTimer();
  }

  function selectLevel(index: number) {
    if (!isLevelUnlocked(index)) {
      return;
    }

    setLevelIndex(index);
    resetBoard(`Poziom ${tPuzzleLevels[index].displayNumber}: ${tPuzzleLevels[index].name}`);
  }

  function isLevelUnlocked(index: number): boolean {
    return index === 0 || completedLevels.has(index - 1);
  }

  function selectAndLift(pieceId: string) {
    setSelectedPieceId(pieceId);
    setStates((current) => {
      const maxZ = Math.max(...current.map((state) => state.zIndex));
      const activeIds = groupIdsFor(current, pieceId);
      return current.map((state) =>
        activeIds.has(state.pieceId) ? { ...state, zIndex: maxZ + 1 } : state,
      );
    });
  }

  function detachSelected(current: PieceState[]): PieceState[] {
    return current.map((state) =>
      state.pieceId === selectedPieceId
        ? { ...state, groupId: `group-${state.pieceId}-${Date.now()}` }
        : state,
    );
  }

  function rotateSelected(delta: 90 | -90) {
    if (isSolved) {
      return;
    }

    setStates((current) => {
      const detached = detachSelected(current);
      const next = detached.map((state) =>
        state.pieceId === selectedPieceId
          ? { ...state, rotation: rotateValue(state.rotation, delta) }
          : state,
      );

      if (hasAnyOverlap(next, piecesById, new Set([selectedPieceId]))) {
        setMessage("Obrot powoduje nalozenie elementow.");
        return detached;
      }

      setMoves((value) => value + 1);
      setTimeout(() => checkLevel(next), 0);
      return next;
    });
  }

  function flipSelected() {
    if (isSolved) {
      return;
    }

    setStates((current) => {
      const detached = detachSelected(current);
      const next = detached.map((state) =>
        state.pieceId === selectedPieceId ? { ...state, flipped: !state.flipped } : state,
      );

      if (hasAnyOverlap(next, piecesById, new Set([selectedPieceId]))) {
        setMessage("Odbicie powoduje nalozenie elementow.");
        return detached;
      }

      setMoves((value) => value + 1);
      setTimeout(() => checkLevel(next), 0);
      return next;
    });
  }

  function completeLevel() {
    setCompletedLevels((current) => {
      const next = new Set(current);
      next.add(levelIndex);
      return next;
    });
  }

  function checkLevel(nextStates = states) {
    if (hasAnyOverlap(nextStates, piecesById)) {
      setMessage("Elementy nachodza na siebie. Popraw uklad.");
      setIsSolved(false);
      return;
    }

    const solved = isLevelSolved(level, nextStates);
    setIsSolved(solved);

    if (solved) {
      completeLevel();
      setMessage("Poprawnie. Poziom zaliczony.");
      return;
    }

    setMessage("Jeszcze nie. Zbuduj jednolita sylwetke celu.");
  }

  function goToNextLevel() {
    const nextIndex = Math.min(levelIndex + 1, tPuzzleLevels.length - 1);
    setCompletedLevels((current) => {
      const next = new Set(current);
      next.add(levelIndex);
      return next;
    });
    setLevelIndex(nextIndex);
    resetBoard(`Poziom ${tPuzzleLevels[nextIndex].displayNumber}: ${tPuzzleLevels[nextIndex].name}`);
  }

  function onPointerDown(event: ReactPointerEvent<SVGPolygonElement>, pieceId: string) {
    if (!svgRef.current || isSolved) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    selectAndLift(pieceId);
    const startPoint = svgPoint(svgRef.current, event);
    const activeIds = groupIdsFor(states, pieceId);
    dragRef.current = {
      pointerId: event.pointerId,
      startPoint,
      startStates: states,
      activeIds,
    };
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragRef.current || !svgRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const currentPoint = svgPoint(svgRef.current, event);
    const delta = {
      x: currentPoint.x - dragRef.current.startPoint.x,
      y: currentPoint.y - dragRef.current.startPoint.y,
    };
    setStates(applyDeltaToStates(dragRef.current.startStates, dragRef.current.activeIds, delta));
  }

  function onPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    const activeIds = dragRef.current.activeIds;
    setStates((current) => {
      if (hasAnyOverlap(current, piecesById, activeIds)) {
        setMessage("Ten ruch naklada elementy. Cofam do ostatniej dobrej pozycji.");
        return current.map((state) =>
          activeIds.has(state.pieceId) ? { ...state, position: state.lastValidPosition } : state,
        );
      }

      const snap = findSnap(current, piecesById, activeIds);
      const snapped = snap ? applyDeltaToStates(current, activeIds, snap.delta) : current;
      const next = hasAnyOverlap(snapped, piecesById, activeIds) ? current : snapped;
      const activeGroup = current.find((state) => activeIds.has(state.pieceId))?.groupId ?? "active";
      const merged = snap
        ? next.map((state) =>
            activeIds.has(state.pieceId) || state.groupId === snap.targetGroupId
              ? { ...state, groupId: activeGroup }
              : state,
          )
        : next;
      const withLastValid = merged.map((state) =>
        activeIds.has(state.pieceId) ? { ...state, lastValidPosition: state.position } : state,
      );

      setMoves((value) => value + 1);
      setTimeout(() => checkLevel(withLastValid), 0);
      return withLastValid;
    });
    dragRef.current = null;
  }

  return (
    <section className="game-layout">
      <aside className="side-panel">
        <div className="panel-section level-header">
          <div>
            <p className="eyebrow">Poziom {level.displayNumber}</p>
            <h2>{level.name}</h2>
          </div>
          <div className={isSolved ? "status status-ok" : "status"}>
            {isSolved ? <Check size={18} /> : null}
            <span>{message}</span>
          </div>
        </div>

        <div className="panel-section stats-row" aria-label="Wynik">
          <div>
            <span className="stat-label">Czas</span>
            <strong>
              <Timer size={16} />
              {formatTime(elapsedSeconds)}
            </strong>
          </div>
          <div>
            <span className="stat-label">Ruchy</span>
            <strong>{moves}</strong>
          </div>
        </div>

        <div className="panel-section level-tabs" aria-label="Lista poziomow">
          {tPuzzleLevels.map((entry, index) => {
            const unlocked = isLevelUnlocked(index);
            return (
              <button
                key={entry.id}
                type="button"
                className={index === levelIndex ? "level-tab active" : "level-tab"}
                disabled={!unlocked}
                onClick={() => selectLevel(index)}
              >
                <span>{entry.displayNumber}</span>
                <small>{entry.difficulty}</small>
              </button>
            );
          })}
        </div>

        <div className="panel-section preview-section">
          <p className="section-label">Cel</p>
          <svg
            viewBox={`${previewBounds.x} ${previewBounds.y} ${previewBounds.width} ${previewBounds.height}`}
            className="preview-svg"
            aria-label="Jednolity podglad figury docelowej"
          >
            <polygon points={pathFromPoints(targetPoints)} className="target-silhouette" />
          </svg>
        </div>

        <div className="panel-section controls">
          <button type="button" onClick={() => rotateSelected(-90)} title="Obroc w lewo">
            <RotateCcw size={20} />
            <span>Lewo</span>
          </button>
          <button type="button" onClick={() => rotateSelected(90)} title="Obroc w prawo">
            <RotateCw size={20} />
            <span>Prawo</span>
          </button>
          <button type="button" onClick={flipSelected} title="Odbij element">
            <FlipHorizontal2 size={20} />
            <span>Odbij</span>
          </button>
          <button type="button" onClick={() => resetBoard()} title="Resetuj poziom">
            <RefreshCcw size={20} />
            <span>Reset</span>
          </button>
        </div>

        <button
          type="button"
          className="next-button"
          disabled={!isSolved || levelIndex === tPuzzleLevels.length - 1}
          onClick={goToNextLevel}
        >
          <span>Nastepny poziom</span>
          <ChevronRight size={20} />
        </button>
      </aside>

      <div className="board-wrap">
        <svg
          ref={svgRef}
          viewBox={`${boardViewBox.x} ${boardViewBox.y} ${boardViewBox.width} ${boardViewBox.height}`}
          className="puzzle-board"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="Plansza T-Puzzle"
        >
          <defs>
            <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
              <path
                d="M 1 0 L 0 0 0 1"
                fill="none"
                stroke="rgba(31, 41, 55, 0.1)"
                strokeWidth="0.025"
              />
            </pattern>
          </defs>
          <rect
            x={boardViewBox.x}
            y={boardViewBox.y}
            width={boardViewBox.width}
            height={boardViewBox.height}
            fill="url(#grid)"
          />
          {sortedStates.map((state) => {
            const piece = piecesById[state.pieceId];
            const vertices = transformedVertices(piece, state);
            const selected = selectedPieceId === state.pieceId;
            return (
              <polygon
                key={state.pieceId}
                points={pathFromPoints(vertices)}
                className={`piece board-piece piece-neutral${selected ? " selected" : ""}`}
                onPointerDown={(event) => onPointerDown(event, state.pieceId)}
                onDoubleClick={flipSelected}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>
    </section>
  );
}
