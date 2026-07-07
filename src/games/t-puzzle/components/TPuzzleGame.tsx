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
import { boardViewBox, mobileBoardViewBox } from "../config";
import { hasAnyOverlap, pathFromPoints, transformedVertices } from "../geometry";
import { tPuzzleLevels } from "../levels";
import { createInitialPieceStates, piecesById } from "../pieces";
import { applyDeltaToStates, findSnap } from "../snap";
import type { PieceRotation, PieceState, PieceTransform, Point, TargetDefinition } from "../types";
import { isTargetSolved } from "../validation";

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function rotateValue(rotation: PieceRotation, delta: 45 | -45 | 90 | -90): PieceRotation {
  return ((rotation + delta + 360) % 360) as PieceRotation;
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

function targetKey(levelId: string, targetId: string): string {
  return `${levelId}:${targetId}`;
}

const INITIAL_UNLOCKED_LEVELS = 3;
const PROGRESS_STORAGE_KEY = "gry-logiczne:t-puzzle-progress:v2";

interface StoredProgress {
  levelIndex: number;
  targetIndex: number;
  completedLevels: number[];
  completedTargets: string[];
}

function defaultProgress(): StoredProgress {
  return {
    levelIndex: 0,
    targetIndex: 0,
    completedLevels: [],
    completedTargets: [],
  };
}

function loadStoredProgress(): StoredProgress {
  if (typeof window === "undefined") {
    return defaultProgress();
  }

  try {
    const rawValue = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!rawValue) {
      return defaultProgress();
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredProgress>;
    const levelIndex = Math.min(Math.max(parsed.levelIndex ?? 0, 0), tPuzzleLevels.length - 1);
    const maxTargetIndex = tPuzzleLevels[levelIndex].targets.length - 1;

    return {
      levelIndex,
      targetIndex: Math.min(Math.max(parsed.targetIndex ?? 0, 0), maxTargetIndex),
      completedLevels: Array.isArray(parsed.completedLevels) ? parsed.completedLevels : [],
      completedTargets: Array.isArray(parsed.completedTargets) ? parsed.completedTargets : [],
    };
  } catch {
    return defaultProgress();
  }
}

function saveStoredProgress(progress: StoredProgress) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

function targetImageUrl(figureNumber: number): string {
  return `${import.meta.env.BASE_URL}t-puzzle/targets/figure-${String(figureNumber).padStart(3, "0")}.png`;
}

function statesFromSolution(solution: PieceTransform[]): PieceState[] {
  return solution.map((transform, index) => ({
    pieceId: transform.pieceId,
    position: { x: transform.x, y: transform.y },
    rotation: transform.rotation,
    flipped: transform.flipped,
    zIndex: index + 1,
    groupId: "target",
    lastValidPosition: { x: transform.x, y: transform.y },
  }));
}

function solutionPolygons(target: TargetDefinition): Point[][] {
  const solution = target.solutions[0];
  if (!solution) {
    return [];
  }

  return statesFromSolution(solution).map((state) =>
    transformedVertices(piecesById[state.pieceId], state),
  );
}

function boundsForPolygons(polygons: Point[][]) {
  const points = polygons.flat();
  if (points.length === 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const bounds = boundsForPoints(points);
  const padding = 0.18;
  return {
    x: bounds.minX - padding,
    y: bounds.minY - padding,
    width: bounds.maxX - bounds.minX + padding * 2,
    height: bounds.maxY - bounds.minY + padding * 2,
  };
}

export function TPuzzleGame() {
  const storedProgress = useMemo(() => loadStoredProgress(), []);
  const [levelIndex, setLevelIndex] = useState(storedProgress.levelIndex);
  const [targetIndex, setTargetIndex] = useState(storedProgress.targetIndex);
  const [states, setStates] = useState<PieceState[]>(() => createInitialPieceStates());
  const [selectedPieceId, setSelectedPieceId] = useState<string>("blue-bar");
  const [message, setMessage] = useState("Uloz cztery elementy w sylwetke celu.");
  const [isSolved, setIsSolved] = useState(false);
  const [moves, setMoves] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(
    () => new Set(storedProgress.completedLevels),
  );
  const [completedTargets, setCompletedTargets] = useState<Set<string>>(
    () => new Set(storedProgress.completedTargets),
  );
  const [usesMobileBoard, setUsesMobileBoard] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 520px)").matches,
  );
  const svgRef = useRef<SVGSVGElement | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startPoint: Point;
    startStates: PieceState[];
    activeIds: Set<string>;
    dragOffset: Point;
  } | null>(null);

  const level = tPuzzleLevels[levelIndex];
  const target = level.targets[targetIndex];
  const currentTargetKey = targetKey(level.id, target.id);
  const targetPolygons = useMemo(() => solutionPolygons(target), [target]);
  const previewBounds = useMemo(
    () => (target.outline ? boundsForPolygons([target.outline]) : boundsForPolygons(targetPolygons)),
    [target.outline, targetPolygons],
  );
  const sortedStates = useMemo(
    () => [...states].sort((a, b) => a.zIndex - b.zIndex),
    [states],
  );
  const activeBoardViewBox = usesMobileBoard ? mobileBoardViewBox : boardViewBox;
  const isFinalTarget = targetIndex === level.targets.length - 1;
  const isFinalLevel = levelIndex === tPuzzleLevels.length - 1;

  useEffect(() => {
    const query = window.matchMedia("(max-width: 520px)");
    const updateBoardMode = () => setUsesMobileBoard(query.matches);

    updateBoardMode();
    query.addEventListener("change", updateBoardMode);
    return () => query.removeEventListener("change", updateBoardMode);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!isSolved) {
        setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isSolved, startedAt]);

  useEffect(() => {
    saveStoredProgress({
      levelIndex,
      targetIndex,
      completedLevels: Array.from(completedLevels),
      completedTargets: Array.from(completedTargets),
    });
  }, [completedLevels, completedTargets, levelIndex, targetIndex]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "q") {
        rotateSelected(-45);
      }

      if (event.key.toLowerCase() === "e") {
        rotateSelected(45);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    return () => clearScheduledAdvance();
  }, []);

  function clearScheduledAdvance() {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }

  function restartTimer() {
    setStartedAt(Date.now());
    setElapsedSeconds(0);
  }

  function resetBoard(nextMessage = "Figura zresetowana.") {
    clearScheduledAdvance();
    setStates(createInitialPieceStates());
    setSelectedPieceId("blue-bar");
    setIsSolved(false);
    setMoves(0);
    setMessage(nextMessage);
    restartTimer();
  }

  function isLevelUnlocked(index: number): boolean {
    return index < INITIAL_UNLOCKED_LEVELS || completedLevels.has(index - 1);
  }

  function isTargetUnlocked(index: number): boolean {
    return index >= 0 && index < level.targets.length;
  }

  function selectLevel(index: number) {
    if (!isLevelUnlocked(index)) {
      return;
    }

    const nextLevel = tPuzzleLevels[index];
    setLevelIndex(index);
    setTargetIndex(0);
    resetBoard(`Poziom ${nextLevel.displayNumber}: ${nextLevel.targets[0].name}`);
  }

  function selectTarget(index: number) {
    if (!isTargetUnlocked(index)) {
      return;
    }

    setTargetIndex(index);
    resetBoard(`Figura ${index + 1}/${level.targets.length}: ${level.targets[index].name}`);
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

  function rotateSelected(delta: 45 | -45 | 90 | -90) {
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
      setTimeout(() => checkTarget(next), 0);
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
      setTimeout(() => checkTarget(next), 0);
      return next;
    });
  }

  function completeTarget() {
    setCompletedTargets((current) => {
      const next = new Set(current);
      next.add(currentTargetKey);
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

  function scheduleAdvance() {
    if (isFinalTarget && isFinalLevel) {
      return;
    }

    clearScheduledAdvance();
    advanceTimerRef.current = window.setTimeout(() => {
      goToNextTarget();
    }, 900);
  }

  function checkTarget(nextStates = states) {
    if (hasAnyOverlap(nextStates, piecesById)) {
      setMessage("Elementy nachodza na siebie. Popraw uklad.");
      setIsSolved(false);
      return;
    }

    const solved = isTargetSolved(target, level.validation, nextStates);
    setIsSolved(solved);

    if (solved) {
      completeTarget();

      if (isFinalTarget) {
        completeLevel();
      }

      setMessage(
        isFinalTarget
          ? "Poprawnie. Poziom zaliczony."
          : "Poprawnie. Za chwile kolejna figura.",
      );
      scheduleAdvance();
      return;
    }

    setMessage("Jeszcze nie. Zbuduj jednolita sylwetke celu.");
  }

  function goToNextTarget() {
    clearScheduledAdvance();

    if (!isFinalTarget) {
      const nextTargetIndex = targetIndex + 1;
      setTargetIndex(nextTargetIndex);
      resetBoard(`Figura ${nextTargetIndex + 1}/${level.targets.length}: ${level.targets[nextTargetIndex].name}`);
      return;
    }

    completeLevel();

    if (!isFinalLevel) {
      const nextLevelIndex = levelIndex + 1;
      const nextLevel = tPuzzleLevels[nextLevelIndex];
      setLevelIndex(nextLevelIndex);
      setTargetIndex(0);
      resetBoard(`Poziom ${nextLevel.displayNumber}: ${nextLevel.targets[0].name}`);
      return;
    }

    setMessage("Poprawnie. Wszystkie dostepne poziomy zaliczone.");
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
    const dragOffset = event.pointerType === "touch" ? { x: 0, y: -1.15 } : { x: 0, y: 0 };
    dragRef.current = {
      pointerId: event.pointerId,
      startPoint,
      startStates: states,
      activeIds,
      dragOffset,
    };
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragRef.current || !svgRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const currentPoint = svgPoint(svgRef.current, event);
    const delta = {
      x: currentPoint.x - dragRef.current.startPoint.x + dragRef.current.dragOffset.x,
      y: currentPoint.y - dragRef.current.startPoint.y + dragRef.current.dragOffset.y,
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
      setTimeout(() => checkTarget(withLastValid), 0);
      return withLastValid;
    });
    dragRef.current = null;
  }

  function renderControls(className: string) {
    return (
      <div className={`controls ${className}`} aria-label="Sterowanie klockiem">
        <button type="button" onClick={() => rotateSelected(-45)} title="Obroc o 45 stopni w lewo">
          <RotateCcw size={20} />
          <span>45 lewo</span>
        </button>
        <button type="button" onClick={() => rotateSelected(45)} title="Obroc o 45 stopni w prawo">
          <RotateCw size={20} />
          <span>45 prawo</span>
        </button>
        <button type="button" onClick={() => rotateSelected(-90)} title="Obroc o 90 stopni w lewo">
          <RotateCcw size={20} />
          <span>90 lewo</span>
        </button>
        <button type="button" onClick={() => rotateSelected(90)} title="Obroc o 90 stopni w prawo">
          <RotateCw size={20} />
          <span>90 prawo</span>
        </button>
        <button type="button" onClick={flipSelected} title="Odbij element">
          <FlipHorizontal2 size={20} />
          <span>Odbij</span>
        </button>
        <button type="button" onClick={() => resetBoard()} title="Resetuj figure">
          <RefreshCcw size={20} />
          <span>Reset</span>
        </button>
      </div>
    );
  }

  function renderLevelTabs(className: string) {
    return (
      <div className={`level-tabs ${className}`} aria-label="Lista poziomow">
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
    );
  }

  function renderTargetTabs(className: string) {
    return (
      <div className={`target-tabs ${className}`} aria-label="Warianty figury">
        {level.targets.map((entry, index) => {
          const unlocked = isTargetUnlocked(index);
          const completed = completedTargets.has(targetKey(level.id, entry.id));
          return (
            <button
              key={entry.id}
              type="button"
              className={index === targetIndex ? "target-tab active" : "target-tab"}
              disabled={!unlocked}
              onClick={() => selectTarget(index)}
              title={entry.name}
            >
              <span>{index + 1}</span>
              {completed ? <Check size={14} /> : null}
            </button>
          );
        })}
      </div>
    );
  }

  function renderTargetPreview() {
    if (target.maskFigureNumber) {
      return (
        <img
          src={targetImageUrl(target.maskFigureNumber)}
          className="preview-image"
          alt={`Jednolity podglad figury ${target.displayNumber}`}
          draggable={false}
        />
      );
    }

    return (
      <svg
        viewBox={`${previewBounds.x} ${previewBounds.y} ${previewBounds.width} ${previewBounds.height}`}
        className="preview-svg"
        aria-label="Jednolity podglad figury docelowej"
      >
        {target.outline ? (
          <polygon
            points={pathFromPoints(target.outline)}
            className="target-silhouette"
          />
        ) : (
          targetPolygons.map((points, index) => (
            <polygon
              key={`${target.id}-${index}`}
              points={pathFromPoints(points)}
              className="target-silhouette"
            />
          ))
        )}
      </svg>
    );
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

        {renderLevelTabs("panel-section")}

        {renderTargetTabs("panel-section")}

        <div className="panel-section preview-section">
          <p className="section-label">Cel {targetIndex + 1}/{level.targets.length}</p>
          {renderTargetPreview()}
        </div>

        {renderControls("panel-section desktop-controls")}

        <button
          type="button"
          className="next-button"
          disabled={!isSolved || (isFinalTarget && isFinalLevel)}
          onClick={goToNextTarget}
        >
          <span>{isFinalTarget ? "Nastepny poziom" : "Nastepna figura"}</span>
          <ChevronRight size={20} />
        </button>
      </aside>

      <div className="board-wrap">
        <div className="mobile-objective">
          <div className="mobile-objective-copy">
            <p className="eyebrow">Poziom {level.displayNumber}</p>
            <strong>{level.name}</strong>
            <span>Wariant {targetIndex + 1}/{level.targets.length}</span>
          </div>
          <div className="mobile-objective-preview">
            {renderTargetPreview()}
          </div>
          <div className="mobile-pickers">
            {renderLevelTabs("mobile-tabs")}
            {renderTargetTabs("mobile-tabs")}
          </div>
        </div>
        <svg
          ref={svgRef}
          viewBox={`${activeBoardViewBox.x} ${activeBoardViewBox.y} ${activeBoardViewBox.width} ${activeBoardViewBox.height}`}
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
            x={activeBoardViewBox.x}
            y={activeBoardViewBox.y}
            width={activeBoardViewBox.width}
            height={activeBoardViewBox.height}
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
        {renderControls("mobile-controls")}
      </div>
    </section>
  );
}
