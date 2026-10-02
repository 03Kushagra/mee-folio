import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import "./RoleBoard.css";

type Point = {
  x: number;
  y: number;
};

export type Role = {
  id: string;
  label: string;
  tone: "blue" | "orange" | "purple" | "teal" | "yellow";
};

type DragState = {
  id: string;
  hasMoved: boolean;
  pointerId: number;
  pointerX: number;
  pointerY: number;
  startX: number;
  startY: number;
};

type CycleMotion = {
  phase: "lift" | "drop";
  roleId: string;
};

export const roles: Role[] = [
  { id: "ai-code-evaluator", label: "AI Code Evaluator", tone: "purple" },
  { id: "frontend-engineer", label: "Frontend Engineer", tone: "blue" },
  { id: "full-stack-developer", label: "Full-stack Developer", tone: "orange" },
  { id: "creative-technologist", label: "Creative Technologist", tone: "teal" },
  { id: "product-engineer", label: "Product-minded Engineer", tone: "yellow" },
];

const initialStackOrder = roles.map((role) => role.id);

function createLayerOrder(order: string[]) {
  return Object.fromEntries(
    order.map((roleId, index) => [roleId, order.length - index]),
  );
}

const initialLayerOrder: Record<string, number> = Object.fromEntries(
  initialStackOrder.map((roleId, index) => [
    roleId,
    initialStackOrder.length - index,
  ]),
);

const cardRotations = [-1.5, 2.8, -3.2, 1.9, -2.4];
const cardOffsets = [
  { x: 0, y: 0 },
  { x: 10, y: -7 },
  { x: -11, y: 8 },
  { x: 17, y: 10 },
  { x: -17, y: -10 },
];
const IDLE_RECOVERY_DELAY = 5_000;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export type RoleBoardProps = {
  /** Called with the role id whenever a new card reaches the front of the deck. */
  onFrontRoleChange?: (roleId: string) => void;
  /** Called when the visitor starts dragging a card. */
  onCardDragStart?: (roleId: string) => void;
  /** Called when a card lands (end of a drag or of an automatic cycle). Rect is in viewport coordinates. */
  onCardLand?: (roleId: string, rect: DOMRect) => void;
  /** When false, cards can't be dragged or moved and simply keep cycling. Defaults to true. */
  interactive?: boolean;
};

export function RoleBoard({
  interactive = true,
  onCardDragStart,
  onCardLand,
  onFrontRoleChange,
}: RoleBoardProps = {}) {
  const callbacksRef = useRef({ onCardDragStart, onCardLand, onFrontRoleChange });
  callbacksRef.current = { onCardDragStart, onCardLand, onFrontRoleChange };
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const initializedRef = useRef(false);
  const cycleCommitTimerRef = useRef<number | null>(null);
  const idleResetTimerRef = useRef<number | null>(null);
  const recoveryTimerRef = useRef<number | null>(null);
  const stackOrderRef = useRef(initialStackOrder);
  const [isReady, setIsReady] = useState(false);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [layerOrder, setLayerOrder] =
    useState<Record<string, number>>(initialLayerOrder);
  const [positions, setPositions] = useState<Record<string, Point>>({});
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [draggingRoleId, setDraggingRoleId] = useState<string | null>(null);
  const [cycleMotion, setCycleMotion] = useState<CycleMotion | null>(null);
  const [stackOrder, setStackOrder] = useState(initialStackOrder);

  const createDeckPositions = (order = stackOrderRef.current) => {
    const board = boardRef.current;

    if (!board) {
      return {};
    }

    const firstCard = board.querySelector<HTMLElement>("[data-role-id]");
    const cardWidth =
      firstCard?.offsetWidth ?? Math.min(560, board.clientWidth - 32);
    const cardHeight = firstCard?.offsetHeight ?? 116;
    const deckCenterX =
      board.clientWidth < 700 ? board.clientWidth * 0.5 : board.clientWidth * 0.62;
    const deckX = deckCenterX - cardWidth / 2;
    const deckY = board.clientHeight * 0.5 - cardHeight / 2;

    return Object.fromEntries(
      order.map((roleId, index) => [
        roleId,
        {
          x: deckX + cardOffsets[index].x,
          y: deckY + cardOffsets[index].y,
        },
      ]),
    );
  };

  const clearCycleCommitTimer = () => {
    if (cycleCommitTimerRef.current !== null) {
      window.clearTimeout(cycleCommitTimerRef.current);
      cycleCommitTimerRef.current = null;
    }
  };

  const clearIdleResetTimer = () => {
    if (idleResetTimerRef.current !== null) {
      window.clearTimeout(idleResetTimerRef.current);
      idleResetTimerRef.current = null;
    }
  };

  const clearRecoveryTimer = () => {
    if (recoveryTimerRef.current !== null) {
      window.clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  };

  const pauseForInteraction = (scheduleRecovery = true) => {
    clearCycleCommitTimer();
    clearIdleResetTimer();
    clearRecoveryTimer();
    setCycleMotion(null);
    setIsRecovering(false);
    setIsAutoPaused(true);

    if (!scheduleRecovery) {
      return;
    }

    idleResetTimerRef.current = window.setTimeout(() => {
      const currentOrder = stackOrderRef.current;

      setIsRecovering(true);
      setPositions(createDeckPositions(currentOrder));
      setLayerOrder(createLayerOrder(currentOrder));
      setSelectedRoleId(null);
      setDraggingRoleId(null);
      idleResetTimerRef.current = null;

      recoveryTimerRef.current = window.setTimeout(() => {
        setIsRecovering(false);
        setIsAutoPaused(false);
        recoveryTimerRef.current = null;
      }, 2_250);
    }, IDLE_RECOVERY_DELAY);
  };

  const resetPositions = () => {
    pauseForInteraction();
    stackOrderRef.current = initialStackOrder;
    setStackOrder(initialStackOrder);
    setPositions(createDeckPositions(initialStackOrder));
    setLayerOrder(initialLayerOrder);
    setSelectedRoleId(null);
    setDraggingRoleId(null);
  };

  useEffect(() => {
    const board = boardRef.current;

    if (!board) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!initializedRef.current) {
        initializedRef.current = true;
        setPositions(createDeckPositions());
        setIsReady(true);
        return;
      }

      setPositions((currentPositions) => {
        const nextPositions = { ...currentPositions };

        for (const role of roles) {
          const card = board.querySelector<HTMLElement>(
            `[data-role-id="${role.id}"]`,
          );
          const current = currentPositions[role.id];

          if (!card || !current) {
            continue;
          }

          nextPositions[role.id] = {
            x: clamp(
              current.x,
              12,
              Math.max(12, board.clientWidth - card.offsetWidth - 12),
            ),
            y: clamp(
              current.y,
              12,
              Math.max(12, board.clientHeight - card.offsetHeight - 12),
            ),
          };
        }

        return nextPositions;
      });
    });

    resizeObserver.observe(board);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    stackOrderRef.current = stackOrder;
  }, [stackOrder]);

  useEffect(() => {
    callbacksRef.current.onFrontRoleChange?.(stackOrder[0]);
  }, [stackOrder]);

  const emitLand = (roleId: string) => {
    const card = boardRef.current?.querySelector<HTMLElement>(
      `[data-role-id="${roleId}"]`,
    );

    if (card) {
      callbacksRef.current.onCardLand?.(roleId, card.getBoundingClientRect());
    }
  };

  useEffect(() => {
    if (!isReady || isAutoPaused || cycleMotion) {
      return;
    }

    const flipTimer = window.setTimeout(() => {
      const currentOrder = stackOrderRef.current;
      const frontRoleId = currentOrder[0];

      setCycleMotion({ phase: "lift", roleId: frontRoleId });
      cycleCommitTimerRef.current = window.setTimeout(() => {
        const latestOrder = stackOrderRef.current;

        if (latestOrder[0] !== frontRoleId) {
          setCycleMotion(null);
          return;
        }

        const nextOrder = [...latestOrder.slice(1), frontRoleId];
        stackOrderRef.current = nextOrder;
        setStackOrder(nextOrder);
        setPositions(createDeckPositions(nextOrder));
        setLayerOrder(createLayerOrder(nextOrder));
        setSelectedRoleId(null);
        setCycleMotion({ phase: "drop", roleId: frontRoleId });

        cycleCommitTimerRef.current = window.setTimeout(() => {
          setCycleMotion(null);
          cycleCommitTimerRef.current = null;
          emitLand(frontRoleId);
        }, 760);
      }, 720);
    }, 5_000);

    return () => window.clearTimeout(flipTimer);
  }, [cycleMotion, isAutoPaused, isReady, stackOrder]);

  useEffect(
    () => () => {
      clearCycleCommitTimer();
      clearIdleResetTimer();
      clearRecoveryTimer();
    },
    [],
  );

  const bringToFront = (id: string) => {
    setLayerOrder((currentOrder) => {
      const highestLayer = Math.max(...Object.values(currentOrder));

      return {
        ...currentOrder,
        [id]: highestLayer + 1,
      };
    });
  };

  const centerRole = (id: string, card: HTMLButtonElement) => {
    const board = boardRef.current;

    if (!board) {
      return;
    }

    setPositions((currentPositions) => ({
      ...currentPositions,
      [id]: {
        x: (board.clientWidth - card.offsetWidth) / 2,
        y: (board.clientHeight - card.offsetHeight) / 2,
      },
    }));
    setSelectedRoleId(id);
    bringToFront(id);
  };

  const handlePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    id: string,
  ) => {
    const position = positions[id];

    if (!position) {
      return;
    }

    let dragStartPosition = position;

    if (cycleMotion?.roleId === id) {
      const board = boardRef.current;

      if (board) {
        const boardRect = board.getBoundingClientRect();
        const cardRect = event.currentTarget.getBoundingClientRect();

        dragStartPosition = {
          x: cardRect.left - boardRect.left,
          y: cardRect.top - boardRect.top,
        };
        setPositions((currentPositions) => ({
          ...currentPositions,
          [id]: dragStartPosition,
        }));
      }
    }

    pauseForInteraction(false);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id,
      hasMoved: false,
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: dragStartPosition.x,
      startY: dragStartPosition.y,
    };
    setDraggingRoleId(id);
    bringToFront(id);
    callbacksRef.current.onCardDragStart?.(id);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const board = boardRef.current;
    const drag = dragRef.current;

    if (!board || !drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const card = event.currentTarget;
    const pointerDeltaX = event.clientX - drag.pointerX;
    const pointerDeltaY = event.clientY - drag.pointerY;
    const nextX = drag.startX + pointerDeltaX;
    const nextY = drag.startY + pointerDeltaY;

    if (Math.hypot(pointerDeltaX, pointerDeltaY) > 5) {
      drag.hasMoved = true;
      setSelectedRoleId(drag.id);
    }

    setPositions((currentPositions) => ({
      ...currentPositions,
      [drag.id]: {
        x: clamp(
          nextX,
          12,
          Math.max(12, board.clientWidth - card.offsetWidth - 12),
        ),
        y: clamp(
          nextY,
          12,
          Math.max(12, board.clientHeight - card.offsetHeight - 12),
        ),
      },
    }));
  };

  const stopDragging = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;

    if (drag?.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    setDraggingRoleId(null);
    pauseForInteraction();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!drag.hasMoved && event.type !== "pointercancel") {
      centerRole(drag.id, event.currentTarget);
    } else {
      emitLand(drag.id);
    }
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    id: string,
  ) => {
    const board = boardRef.current;
    const position = positions[id];

    if (!board || !position) {
      return;
    }

    pauseForInteraction();
    const movement = event.shiftKey ? 24 : 10;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      centerRole(id, event.currentTarget);
      return;
    }

    const direction = {
      ArrowDown: { x: 0, y: movement },
      ArrowLeft: { x: -movement, y: 0 },
      ArrowRight: { x: movement, y: 0 },
      ArrowUp: { x: 0, y: -movement },
    }[event.key];

    if (!direction) {
      return;
    }

    event.preventDefault();
    bringToFront(id);

    const card = event.currentTarget;
    setPositions((currentPositions) => ({
      ...currentPositions,
      [id]: {
        x: clamp(
          position.x + direction.x,
          12,
          Math.max(12, board.clientWidth - card.offsetWidth - 12),
        ),
        y: clamp(
          position.y + direction.y,
          12,
          Math.max(12, board.clientHeight - card.offsetHeight - 12),
        ),
      },
    }));
  };

  return (
    <div
      className={[
        "role-board",
        isReady ? "role-board--ready" : "",
        isRecovering ? "role-board--recovering" : "",
        interactive ? "" : "role-board--static",
      ]
        .filter(Boolean)
        .join(" ")}
      ref={boardRef}
    >
      <div className="role-board__anchor">
        <span>I am a</span>
      </div>

      {roles.map((role) => {
        const position = positions[role.id] ?? { x: 0, y: 0 };
        const cyclePhase =
          cycleMotion?.roleId === role.id ? cycleMotion.phase : null;
        const isDragging = draggingRoleId === role.id;
        const stackIndex = Math.max(0, stackOrder.indexOf(role.id));
        const restingRotation = cardRotations[stackIndex];
        const style = {
          transform:
            cyclePhase === "lift"
              ? `translate3d(${position.x + 20}px, ${
                  position.y - 150
                }px, 0) rotate(-8deg)`
              : cyclePhase === "drop"
                ? `translate3d(${position.x}px, ${position.y}px, 0) rotate(${restingRotation}deg)`
                : `translate3d(${position.x}px, ${position.y}px, 0) rotate(${
                    isDragging || selectedRoleId === role.id
                      ? 0
                      : restingRotation
                  }deg)`,
          zIndex: layerOrder[role.id],
        } as CSSProperties;

        return (
          <button
            aria-label={
              interactive ? `Move ${role.label}. Use drag or arrow keys.` : role.label
            }
            className={[
              "role-card",
              `role-card--${role.tone}`,
              selectedRoleId === role.id ? "role-card--selected" : "",
              isDragging ? "role-card--dragging" : "",
              cyclePhase ? `role-card--cycle-${cyclePhase}` : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-role-id={role.id}
            key={role.id}
            onKeyDown={interactive ? (event) => handleKeyDown(event, role.id) : undefined}
            onLostPointerCapture={interactive ? stopDragging : undefined}
            onPointerCancel={interactive ? stopDragging : undefined}
            onPointerDown={interactive ? (event) => handlePointerDown(event, role.id) : undefined}
            onPointerMove={interactive ? handlePointerMove : undefined}
            onPointerUp={interactive ? stopDragging : undefined}
            style={style}
            tabIndex={interactive ? undefined : -1}
            type="button"
          >
            <span>{role.label}</span>
          </button>
        );
      })}

      {interactive ? (
        <button
          className="role-board__reset"
          onClick={resetPositions}
          type="button"
        >
          Reset cards
        </button>
      ) : null}
    </div>
  );
}
