import {
  ChevronLeft,
  ChevronRight,
  FlipHorizontal2,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  Check,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { difficultyStages } from "../catalog";
import { boardViewBox } from "../config";
import { hasAnyOverlap, pathFromPoints, transformedVertices } from "../geometry";
import { tPuzzleLevels } from "../levels";
import { createInitialPieceStates, piecesById } from "../pieces";
import { applyDeltaToStates, findSnap } from "../snap";
import { targetImagePath } from "../targetMasks";
import { isLevelSolved } from "../validation";
import type { LevelDefinition, PieceState, Point, QuarterRotation } from "../types";

function rotateValue(rotation: QuarterRotation, delta: 90 | -90): QuarterRotation {
  return ((rotation + delta + 360) % 360) as QuarterRotation;
}

function groupIdsFor(states: PieceState[], pieceId: string): Set<string> {
  const groupId = states.find((state) => state.pieceId === pieceId)?.groupId;
  return new Set(states.filter((state) => state.groupId === groupId).map((state) => state.pieceId));
}

function svgPoint(svg: SVGSVGElement, event: PointerEvent | ReactPointerEvent): Point {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) {
    return { x: 0, y: 0 };
  }
  const transformed = point.matrixTransform(matrix.inverse());
  return { x: transformed.x, y: transformed.y };
}

function introMessage(level: LevelDefinition): string {
  return `Ułóż figurę nr ${level.displayNumber}.`;
}

function stageForLevel(level: LevelDefinition) {
  return difficultyStages.find(
    (stage) =>
      level.displayNumber >= stage.figureRange[0] && level.displayNumber <= stage.figureRange[1],
  );
}

export function TPuzzleGame() {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = tPuzzleLevels[levelIndex];
  const [states, setStates] = useState<PieceState[]>(() => createInitialPieceStates());
  const [selectedPieceId, setSelectedPieceId] = useState<string>("blue-bar");
  const [message, setMessage] = useState(() => introMessage(tPuzzleLevels[0]));
  const [isSolved, setIsSolved] = useState(false);
  const [completedFigures, setCompletedFigures] = useState<Set<number>>(() => new Set());
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startPoint: Point;
    startStates: PieceState[];
    activeIds: Set<string>;
  } | null>(null);

  const sortedStates = useMemo(
    () => [...states].sort((a, b) => a.zIndex - b.zIndex),
    [states],
  );
  const currentStage = stageForLevel(level);
  const targetSrc = `${import.meta.env.BASE_URL}${targetImagePath(level.displayNumber)}`;

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

  function startLevel(nextIndex: number) {
    const nextLevel = tPuzzleLevels[nextIndex];
    setLevelIndex(nextIndex);
    setStates(createInitialPieceStates());
    setSelectedPieceId("blue-bar");
    setIsSolved(false);
    setMessage(introMessage(nextLevel));
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
      return hasAnyOverlap(next, piecesById, new Set([selectedPieceId])) ? detached : next;
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
      return hasAnyOverlap(next, piecesById, new Set([selectedPieceId])) ? detached : next;
    });
  }

  function resetLevel() {
    setStates(createInitialPieceStates());
    setSelectedPieceId("blue-bar");
    setIsSolved(false);
    setMessage(introMessage(level));
  }

  function checkLevel(nextStates = states) {
    if (hasAnyOverlap(nextStates, piecesById)) {
      setMessage("Klocki nachodzą na siebie.");
      setIsSolved(false);
      return;
    }

    const solved = isLevelSolved(level, nextStates);
    setIsSolved(solved);
    if (solved) {
      setCompletedFigures((current) => new Set(current).add(level.displayNumber));
      setMessage(`Figura nr ${level.displayNumber} jest poprawna.`);
      return;
    }

    setMessage("Jeszcze nie. Sprawdź kontur czarnej figury.");
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
        setMessage("Ten ruch nakłada klocki. Cofam go.");
        return current.map((state) =>
          activeIds.has(state.pieceId)
            ? { ...state, position: state.lastValidPosition }
            : state,
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
        activeIds.has(state.pieceId)
          ? { ...state, lastValidPosition: state.position }
          : state,
      );
      setTimeout(() => checkLevel(withLastValid), 0);
      return withLastValid;
    });
    dragRef.current = null;
  }

  return (
    <section className="game-layout">
      <aside className="side-panel">
        <div className="panel-section">
          <p className="eyebrow">Plansza {level.displayNumber}</p>
          <h2>{level.name}</h2>
          <div className={isSolved ? "status status-ok" : "status"}>
            {isSolved ? <Check size={18} /> : null}
            <span>{message}</span>
          </div>
        </div>

        <div className="panel-section preview-section">
          <p className="section-label">Cel</p>
          <div className="preview-frame">
            <img src={targetSrc} className="preview-image" alt={`Cel figury ${level.displayNumber}`} />
          </div>
        </div>

        <div className="panel-section level-section">
          <p className="section-label">Etap</p>
          <div className="stage-grid">
            {difficultyStages.map((stage) => {
              const [first, last] = stage.figureRange;
              const firstIndex = tPuzzleLevels.findIndex((item) => item.displayNumber === first);
              const completedInStage = Array.from(completedFigures).filter(
                (figure) => figure >= first && figure <= last,
              ).length;
              const isActive = currentStage?.id === stage.id;

              return (
                <button
                  key={stage.id}
                  type="button"
                  className={`stage-button ${isActive ? "active-stage" : ""}`}
                  onClick={() => startLevel(firstIndex)}
                >
                  <span>{stage.name}</span>
                  <small>
                    {first}-{last} | {completedInStage}/{last - first + 1}
                  </small>
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel-section level-nav">
          <button
            type="button"
            onClick={() => startLevel(Math.max(0, levelIndex - 1))}
            disabled={levelIndex === 0}
            title="Poprzednia plansza"
          >
            <ChevronLeft size={20} />
            <span>Poprzednia</span>
          </button>
          <label className="level-select-label" htmlFor="level-select">
            Plansza
            <select
              id="level-select"
              value={levelIndex}
              onChange={(event) => startLevel(Number(event.target.value))}
            >
              {tPuzzleLevels.map((item, index) => (
                <option key={item.id} value={index}>
                  {item.displayNumber}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => startLevel(Math.min(tPuzzleLevels.length - 1, levelIndex + 1))}
            disabled={levelIndex === tPuzzleLevels.length - 1}
            title="Następna plansza"
          >
            <span>Następna</span>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="panel-section controls">
          <button type="button" onClick={() => rotateSelected(-90)} title="Obróć w lewo">
            <RotateCcw size={20} />
            <span>Lewo</span>
          </button>
          <button type="button" onClick={() => rotateSelected(90)} title="Obróć w prawo">
            <RotateCw size={20} />
            <span>Prawo</span>
          </button>
          <button type="button" onClick={flipSelected} title="Odwróć">
            <FlipHorizontal2 size={20} />
            <span>Odwróć</span>
          </button>
          <button type="button" onClick={resetLevel} title="Resetuj">
            <RefreshCcw size={20} />
            <span>Reset</span>
          </button>
          <button type="button" onClick={() => checkLevel()} title="Sprawdź">
            <Check size={20} />
            <span>Sprawdź</span>
          </button>
        </div>
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
                stroke="rgba(49, 60, 82, 0.09)"
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
                className={`piece board-piece piece-neutral ${selected ? "selected" : ""}`}
                onPointerDown={(event) => onPointerDown(event, state.pieceId)}
                onDoubleClick={() => flipSelected()}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>
    </section>
  );
}
