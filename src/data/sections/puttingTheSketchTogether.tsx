import { useCallback, useRef, useState, type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import {
    EditableH2,
    EditableParagraph,
    InlineLinkedHighlight,
    InlineClozeInput,
    InlineClozeChoice,
    InlineFeedback,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import {
    getVariableInfo,
    clozePropsFromDefinition,
    choicePropsFromDefinition,
    linkedHighlightPropsFromDefinition,
} from "../variables";
import { clamp } from "@/lib/motion";

/* ────────────────────────────────────────────────────────────────────────────
 * The whole routine, assembled on one grid, one step at a time.
 *
 *   1. Drag two markers onto the flat points.
 *   2. Click each stretch to say whether the curve rises or falls there.
 *   3. Slide three red dots onto the x values where the bend changes.
 *   4. Drag a pen across to ink in the finished curve.
 *
 * Each step's result stays on screen, so the grid fills up with the evidence
 * the earlier sections produced. The step is derived from the work itself —
 * nothing advances unless the student's own answer is right.
 * ──────────────────────────────────────────────────────────────────────────── */

const VIEW_WIDTH = 620;
const VIEW_HEIGHT = 380;
const PAD_LEFT = 44;
const PAD_RIGHT = 44;
const PAD_TOP = 60;
const PLOT_WIDTH = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = 280;

const X_MIN = -3.4;
const X_MAX = 3.4;
const Y_MIN = -1.6;
const Y_MAX = 1.6;
const ROOT_THREE = Math.sqrt(3);

const ACCENT = "#62D0AD";
const FALLING = "#8E90F5";
const INFLECTION_COLOR = "#ef4444";
const ASYMPTOTE_COLOR = "#AC8BF9";
const INK = "#334155";
const STRUCTURE = "#94A3B8";
const MUTED = "#CBD5E1";

const sx = (x: number) => PAD_LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_WIDTH;
const sy = (y: number) => PAD_TOP + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * PLOT_HEIGHT;
const invX = (screenX: number) => X_MIN + ((screenX - PAD_LEFT) / PLOT_WIDTH) * (X_MAX - X_MIN);
const invY = (screenY: number) => Y_MAX - ((screenY - PAD_TOP) / PLOT_HEIGHT) * (Y_MAX - Y_MIN);
const curveY = (x: number) => (2 * x) / (1 + x * x);

const TURNING_TARGETS: [number, number][] = [
    [-1, -1],
    [1, 1],
];
const INFLECTION_TARGETS = [-ROOT_THREE, 0, ROOT_THREE];
const STRETCH_BOUNDS: [number, number][] = [
    [X_MIN, -1],
    [-1, 1],
    [1, X_MAX],
];
const CORRECT_SIGNS = [-1, 1, -1];

const STEP_LABELS = ["1 · flat points", "2 · gradient signs", "3 · bend changes", "4 · draw it"];
const STEP_X = [PAD_LEFT, PAD_LEFT + 112, PAD_LEFT + 251, PAD_LEFT + 377];

const atTarget = (value: number, target: number) => Math.abs(value - target) < 1e-6;

const curvePathTo = (limit: number) => {
    const points: string[] = [];
    for (let x = X_MIN; x <= Math.min(limit, X_MAX) + 1e-9; x += 0.04) {
        points.push(`${sx(x).toFixed(2)},${sy(curveY(x)).toFixed(2)}`);
    }
    return points.length > 1 ? `M ${points.join(" L ")}` : "";
};

function StepByStepSketchDrawing() {
    const setVar = useSetVar();
    const flags = useVar<number[]>("sketchFlagPositions", [-2.4, 0.9, 2.4, -0.9]);
    const signs = useVar<number[]>("sketchStretchSigns", [0, 0, 0]);
    const inflections = useVar<number[]>("sketchInflectionXs", [-2.8, -0.6, 2.8]);
    const penX = useVar<number>("sketchPenX", X_MIN);
    const highlight = useVar<string>("sketchHighlight", "");
    const [dragging, setDragging] = useState<string | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const flagPoints: [number, number][] = [
        [flags[0], flags[1]],
        [flags[2], flags[3]],
    ];
    const flagsDone = TURNING_TARGETS.every((target) =>
        flagPoints.some((point) => atTarget(point[0], target[0]) && atTarget(point[1], target[1])),
    );
    const allSignsSet = signs.every((sign) => sign !== 0);
    const signsDone = signs.every((sign, index) => sign === CORRECT_SIGNS[index]);
    const inflectionsDone = INFLECTION_TARGETS.every((target) =>
        inflections.some((value) => atTarget(value, target)),
    );
    const drawDone = penX >= X_MAX - 0.15;

    const step = !flagsDone ? 0 : !signsDone ? 1 : !inflectionsDone ? 2 : !drawDone ? 3 : 4;

    const status =
        step === 0
            ? "Drag the two markers onto the points where the curve goes flat."
            : step === 1
              ? allSignsSet
                  ? "Not that pattern. (1, 1) is a hilltop, so climb in and fall away."
                  : "Click each stretch: is the curve rising or falling there?"
              : step === 2
                ? "Slide each red dot to an x value where the bend changes."
                : step === 3
                  ? "Drag the pen right to ink in the curve."
                  : "The finished sketch: two turns, three bends, tails sinking to y = 0.";

    const dimFor = (id: string) => (highlight && highlight !== id ? 0.32 : 1);
    const restDim = highlight ? 0.32 : 1;

    const localPoint = useCallback((clientX: number, clientY: number) => {
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        return {
            x: invX(((clientX - rect.left) / rect.width) * VIEW_WIDTH),
            y: invY(((clientY - rect.top) / rect.height) * VIEW_HEIGHT),
        };
    }, []);

    const moveFlag = (index: number, clientX: number, clientY: number) => {
        const point = localPoint(clientX, clientY);
        if (!point) return;
        let nextX = clamp(point.x, X_MIN, X_MAX);
        let nextY = clamp(point.y, Y_MIN, Y_MAX);
        const other = flagPoints[1 - index];
        for (const target of TURNING_TARGETS) {
            const taken = atTarget(other[0], target[0]) && atTarget(other[1], target[1]);
            if (taken) continue;
            if (Math.abs(nextX - target[0]) < 0.4 && Math.abs(nextY - target[1]) < 0.4) {
                nextX = target[0];
                nextY = target[1];
            }
        }
        const next = [...flags];
        next[index * 2] = Math.round(nextX * 100) / 100;
        next[index * 2 + 1] = Math.round(nextY * 100) / 100;
        setVar("sketchFlagPositions", next);
    };

    const moveInflection = (index: number, clientX: number) => {
        const point = localPoint(clientX, 0);
        if (!point) return;
        let nextX = clamp(point.x, X_MIN, X_MAX);
        for (const target of INFLECTION_TARGETS) {
            const taken = inflections.some((value, other) => other !== index && atTarget(value, target));
            if (taken) continue;
            if (Math.abs(nextX - target) < 0.35) nextX = target;
        }
        const next = [...inflections];
        next[index] = Math.round(nextX * 100) / 100;
        setVar("sketchInflectionXs", next);
    };

    const movePen = (clientX: number) => {
        const point = localPoint(clientX, 0);
        if (!point) return;
        setVar("sketchPenX", Math.round(clamp(point.x, X_MIN, X_MAX) * 20) / 20);
    };

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            style={{ touchAction: "none" }}
        >
            <defs>
                <filter id="step-sketch-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* the step rail */}
            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                {STEP_LABELS.map((label, index) => (
                    <text
                        key={`step-label-${index}`}
                        x={STEP_X[index]}
                        y={24}
                        fill={index === step ? ACCENT : index < step ? INK : MUTED}
                        fontSize="11"
                        fontWeight={index === step ? 600 : 400}
                    >
                        {index < step ? `✓ ${label}` : label}
                    </text>
                ))}
            </g>

            {/* axes */}
            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                <line x1={PAD_LEFT} y1={sy(0)} x2={PAD_LEFT + PLOT_WIDTH} y2={sy(0)} stroke={STRUCTURE} strokeWidth="1.5" strokeLinecap="round" />
                <line x1={sx(0)} y1={PAD_TOP} x2={sx(0)} y2={PAD_TOP + PLOT_HEIGHT} stroke={STRUCTURE} strokeWidth="1.5" strokeLinecap="round" />
                {[-3, -2, -1, 1, 2, 3].map((tick) => (
                    <text
                        key={`tick-${tick}`}
                        x={sx(tick)}
                        y={sy(0) + 17}
                        fill={STRUCTURE}
                        fontSize="10"
                        textAnchor="middle"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {tick}
                    </text>
                ))}
            </g>

            {/* step 2 — the three stretches and the sign the student gives each one */}
            {step >= 1 && (
                <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                    {STRETCH_BOUNDS.map((bounds, index) => {
                        const sign = signs[index];
                        const centre = (sx(bounds[0]) + sx(bounds[1])) / 2;
                        const color = sign === 1 ? ACCENT : sign === -1 ? FALLING : MUTED;
                        const tilt = sign === 1 ? -18 : sign === -1 ? 18 : 0;
                        return (
                            <g key={`stretch-${index}`}>
                                <rect
                                    x={sx(bounds[0])}
                                    y={PAD_TOP}
                                    width={sx(bounds[1]) - sx(bounds[0])}
                                    height={PLOT_HEIGHT}
                                    fill={sign === 0 ? "transparent" : color}
                                    opacity={sign === 0 ? 0 : 0.08}
                                    style={{ cursor: step === 1 ? "pointer" : "default" }}
                                    onPointerDown={() => {
                                        if (step !== 1) return;
                                        const next = [...signs];
                                        next[index] = sign === -1 ? 1 : -1;
                                        setVar("sketchStretchSigns", next);
                                    }}
                                />
                                <g transform={`translate(${centre} ${PAD_TOP + 26}) rotate(${tilt})`} style={{ pointerEvents: "none" }}>
                                    <line x1={-20} y1={0} x2={20} y2={0} stroke={color} strokeWidth="2.8" strokeLinecap="round" />
                                    {sign !== 0 && <polygon points="20,0 12,-4.5 12,4.5" fill={color} />}
                                </g>
                                <text
                                    x={centre}
                                    y={PAD_TOP + 52}
                                    fill={color}
                                    fontSize="11"
                                    textAnchor="middle"
                                    style={{ pointerEvents: "none" }}
                                >
                                    {sign === 1 ? "rising" : sign === -1 ? "falling" : "click me"}
                                </text>
                            </g>
                        );
                    })}
                </g>
            )}

            {/* step 3 — the bend markers */}
            {step >= 2 && (
                <g
                    opacity={dimFor("inflections")}
                    style={{ transition: "opacity 150ms ease-out" }}
                    onPointerEnter={() => setVar("sketchHighlight", "inflections")}
                    onPointerLeave={() => setVar("sketchHighlight", "")}
                >
                    {inflections.map((value, index) => {
                        const locked = INFLECTION_TARGETS.some((target) => atTarget(value, target));
                        const active = highlight === "inflections";
                        const cy = locked && step >= 4 ? sy(curveY(value)) : sy(0);
                        return (
                            <g key={`inflection-${index}`}>
                                {locked && (
                                    <line
                                        x1={sx(value)}
                                        y1={PAD_TOP}
                                        x2={sx(value)}
                                        y2={PAD_TOP + PLOT_HEIGHT}
                                        stroke={INFLECTION_COLOR}
                                        strokeWidth="1.5"
                                        strokeDasharray="3 6"
                                        opacity={0.5}
                                    />
                                )}
                                {active && <circle cx={sx(value)} cy={cy} r={15} fill={INFLECTION_COLOR} opacity={0.28} />}
                                <circle
                                    cx={sx(value)}
                                    cy={cy}
                                    r={active ? 7.5 : 6}
                                    fill={INFLECTION_COLOR}
                                    stroke="#FFFFFF"
                                    strokeWidth="1.5"
                                    filter={locked ? undefined : "url(#step-sketch-shadow)"}
                                    style={{ transition: "r 150ms ease-out" }}
                                />
                                {step === 2 && !locked && (
                                    <circle
                                        cx={sx(value)}
                                        cy={cy}
                                        r={22}
                                        fill="transparent"
                                        style={{ cursor: dragging === `inflection-${index}` ? "grabbing" : "grab", touchAction: "none" }}
                                        onPointerDown={(event) => {
                                            event.currentTarget.setPointerCapture(event.pointerId);
                                            setDragging(`inflection-${index}`);
                                        }}
                                        onPointerMove={(event) => {
                                            if (dragging === `inflection-${index}`) moveInflection(index, event.clientX);
                                        }}
                                        onPointerUp={() => setDragging(null)}
                                        onPointerCancel={() => setDragging(null)}
                                    />
                                )}
                            </g>
                        );
                    })}
                </g>
            )}

            {/* step 4 — the curve, inked in as far as the pen has travelled */}
            {step >= 3 && (
                <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                    <path d={curvePathTo(X_MAX)} fill="none" stroke={MUTED} strokeWidth="2" strokeDasharray="4 7" strokeLinecap="round" />
                    <path d={curvePathTo(penX)} fill="none" stroke={ACCENT} strokeWidth="3.2" strokeLinecap="round" />
                    {step === 3 && (
                        <>
                            <circle cx={sx(penX)} cy={sy(curveY(penX))} r={dragging === "pen" ? 10.5 : 9} fill={ACCENT} filter="url(#step-sketch-shadow)" />
                            <circle
                                cx={sx(penX)}
                                cy={sy(curveY(penX))}
                                r={24}
                                fill="transparent"
                                style={{ cursor: dragging === "pen" ? "grabbing" : "grab", touchAction: "none" }}
                                onPointerDown={(event) => {
                                    event.currentTarget.setPointerCapture(event.pointerId);
                                    setDragging("pen");
                                }}
                                onPointerMove={(event) => {
                                    if (dragging === "pen") movePen(event.clientX);
                                }}
                                onPointerUp={() => setDragging(null)}
                                onPointerCancel={() => setDragging(null)}
                            />
                        </>
                    )}
                </g>
            )}

            {/* step 1 — the two turning point markers, and their labels once placed */}
            <g
                opacity={dimFor("turningPoints")}
                style={{ transition: "opacity 150ms ease-out" }}
                onPointerEnter={() => setVar("sketchHighlight", "turningPoints")}
                onPointerLeave={() => setVar("sketchHighlight", "")}
            >
                {flagPoints.map((point, index) => {
                    const locked = TURNING_TARGETS.some(
                        (target) => atTarget(point[0], target[0]) && atTarget(point[1], target[1]),
                    );
                    const isMaximum = point[1] > 0;
                    const color = isMaximum ? ACCENT : FALLING;
                    const active = highlight === "turningPoints";
                    return (
                        <g key={`flag-${index}`}>
                            {active && <circle cx={sx(point[0])} cy={sy(point[1])} r={16} fill={color} opacity={0.28} />}
                            <circle
                                cx={sx(point[0])}
                                cy={sy(point[1])}
                                r={active ? 9 : 7}
                                fill={locked ? color : "#FFFFFF"}
                                stroke={color}
                                strokeWidth="3"
                                filter={locked ? undefined : "url(#step-sketch-shadow)"}
                                style={{ transition: "r 150ms ease-out" }}
                            />
                            {locked && (
                                <text
                                    x={sx(point[0])}
                                    y={isMaximum ? sy(point[1]) - 16 : sy(point[1]) + 26}
                                    fill={color}
                                    fontSize="11"
                                    textAnchor="middle"
                                    style={{ pointerEvents: "none" }}
                                >
                                    {isMaximum ? "maximum (1, 1)" : "minimum (−1, −1)"}
                                </text>
                            )}
                            {step === 0 && !locked && (
                                <circle
                                    cx={sx(point[0])}
                                    cy={sy(point[1])}
                                    r={24}
                                    fill="transparent"
                                    style={{ cursor: dragging === `flag-${index}` ? "grabbing" : "grab", touchAction: "none" }}
                                    onPointerDown={(event) => {
                                        event.currentTarget.setPointerCapture(event.pointerId);
                                        setDragging(`flag-${index}`);
                                    }}
                                    onPointerMove={(event) => {
                                        if (dragging === `flag-${index}`) moveFlag(index, event.clientX, event.clientY);
                                    }}
                                    onPointerUp={() => setDragging(null)}
                                    onPointerCancel={() => setDragging(null)}
                                />
                            )}
                        </g>
                    );
                })}
            </g>

            {/* the finished sketch keeps its asymptote */}
            {step >= 4 && (
                <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                    <line
                        x1={PAD_LEFT}
                        y1={sy(0)}
                        x2={PAD_LEFT + PLOT_WIDTH}
                        y2={sy(0)}
                        stroke={ASYMPTOTE_COLOR}
                        strokeWidth="2.5"
                        strokeDasharray="2 6"
                        strokeLinecap="round"
                    />
                    <text x={VIEW_WIDTH - 24} y={sy(0) - 8} fill={ASYMPTOTE_COLOR} fontSize="11" textAnchor="end">
                        asymptote y = 0
                    </text>
                </g>
            )}

            <text x={PAD_LEFT} y={VIEW_HEIGHT - 14} fill={step === 4 ? ACCENT : INK} fontSize="12" opacity={restDim}>
                {status}
            </text>
        </svg>
    );
}

function StepByStepSketchFigure() {
    const setVar = useSetVar();
    const flags = useVar<number[]>("sketchFlagPositions", [-2.4, 0.9, 2.4, -0.9]);
    const signs = useVar<number[]>("sketchStretchSigns", [0, 0, 0]);
    const inflections = useVar<number[]>("sketchInflectionXs", [-2.8, -0.6, 2.8]);
    const penX = useVar<number>("sketchPenX", X_MIN);

    const flagPoints: [number, number][] = [
        [flags[0], flags[1]],
        [flags[2], flags[3]],
    ];
    const flagsDone = TURNING_TARGETS.every((target) =>
        flagPoints.some((point) => atTarget(point[0], target[0]) && atTarget(point[1], target[1])),
    );
    const signsDone = signs.every((sign, index) => sign === CORRECT_SIGNS[index]);
    const inflectionsDone = INFLECTION_TARGETS.every((target) => inflections.some((value) => atTarget(value, target)));
    const currentStep = !flagsDone ? 0 : !signsDone ? 1 : !inflectionsDone ? 2 : penX < X_MAX - 0.15 ? 3 : 4;

    return (
        <Figure
            id="step-by-step-sketch"
            onReset={() => {
                setVar("sketchFlagPositions", [-2.4, 0.9, 2.4, -0.9]);
                setVar("sketchStretchSigns", [0, 0, 0]);
                setVar("sketchInflectionXs", [-2.8, -0.6, 2.8]);
                setVar("sketchPenX", X_MIN);
                setVar("sketchHighlight", "");
            }}
            caption="Four steps on one grid. Each one only opens once your own answer to the last one is right, and everything you place stays put, so the sketch builds itself out of the evidence you have already gathered."
        >
            <StepByStepSketchDrawing />
            <InteractionHintSequence
                hintKey="step-by-step-sketch-build"
                currentStep={currentStep}
                steps={[
                    {
                        gesture: "drag",
                        label: "Drag a marker onto a flat point",
                        position: { x: "22%", y: "36%" },
                    },
                    {
                        gesture: "click",
                        label: "Click a stretch to set rising or falling",
                        position: { x: "50%", y: "26%" },
                    },
                    {
                        gesture: "drag-horizontal",
                        label: "Slide a red dot along the axis",
                        position: { x: "20%", y: "54%" },
                        dragPath: { type: "line", startOffset: { x: -14, y: 0 }, endOffset: { x: 30, y: 0 } },
                    },
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the pen right to ink in the curve",
                        position: { x: "12%", y: "62%" },
                        dragPath: { type: "line", startOffset: { x: -8, y: 0 }, endOffset: { x: 36, y: -8 } },
                    },
                ]}
            />
        </Figure>
    );
}

/* ──────────────────────────────────────────────────────────────────────────── */

export const puttingTheSketchTogetherBlocks: ReactElement[] = [
    <StackLayout key="layout-sketch-heading" maxWidth="xl">
        <Block id="sketch-heading" padding="md">
            <EditableH2 id="h2-sketch-heading" blockId="sketch-heading">
                Putting the Sketch Together
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-setup" maxWidth="xl">
        <Block id="sketch-setup" padding="sm">
            <EditableParagraph id="para-sketch-setup" blockId="sketch-setup">
                Everything is now on the table. A valley at (−1, −1), a hilltop at (1, 1), falling
                outside them and climbing between, and the bend changing at −√3, 0 and √3. Now put it
                all onto one grid, one step at a time.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-build" maxWidth="xl">
        <Block id="sketch-visual" padding="sm" hasVisualization>
            <StepByStepSketchFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-guidance" maxWidth="xl">
        <Block id="sketch-guidance" padding="sm">
            <EditableParagraph id="para-sketch-guidance" blockId="sketch-guidance">
                Each step hands its result to the next. The two{" "}
                <InlineLinkedHighlight
                    id="highlight-sketch-turning-points"
                    varName="sketchHighlight"
                    highlightId="turningPoints"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('sketchHighlight'))}
                >
                    turning points
                </InlineLinkedHighlight>{" "}
                carve out the three stretches, the signs say which way each stretch leans, and the{" "}
                <InlineLinkedHighlight
                    id="highlight-sketch-inflections"
                    varName="sketchHighlight"
                    highlightId="inflections"
                    color="#ef4444"
                    bgColor="rgba(239, 68, 68, 0.18)"
                >
                    bend changes
                </InlineLinkedHighlight>{" "}
                say where it swaps. By the fourth step the curve has nowhere else to go.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-tails" maxWidth="xl">
        <Block id="sketch-tails" padding="sm">
            <EditableParagraph id="para-sketch-tails" blockId="sketch-tails">
                One last thing the derivatives never told us: far out, the x² underneath grows much
                faster than the 2x on top, so both tails sink quietly back toward zero.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-question-second-test" maxWidth="xl">
        <Block id="sketch-question-second-test" padding="md">
            <EditableParagraph id="para-sketch-question-second-test" blockId="sketch-question-second-test">
                The second derivative can settle a turning point on its own. The curve y = x³ − 3x is
                flat at x = 1, and d²y/dx² = 6x comes out as +6 there, so the curve is bending upward
                and (1, −2) has to be a{" "}
                <InlineFeedback
                    varName="answerSketchSecondTest"
                    correctValue={["minimum", "a minimum", "min"]}
                    position="terminal"
                    successMessage="— exactly. Bending upward at a flat point means the curve is sitting in a valley, so a positive second derivative names a minimum on the spot"
                    failureMessage="— not quite."
                    hint="Picture a curve that is flat and bending upward: is that the shape of a hilltop or the shape of a valley floor"
                >
                    <InlineClozeInput
                        varName="answerSketchSecondTest"
                        correctAnswer={["minimum", "a minimum", "min"]}
                        {...clozePropsFromDefinition(getVariableInfo('answerSketchSecondTest'))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-question-tail" maxWidth="xl">
        <Block id="sketch-question-tail" padding="md">
            <EditableParagraph id="para-sketch-question-tail" blockId="sketch-question-tail">
                Back to our own curve. Past the hilltop at x = 1 it sinks slowly back toward zero and
                never turns again, so far out to the right the sign of dy/dx must be{" "}
                <InlineFeedback
                    varName="answerSketchTail"
                    correctValue="negative"
                    position="terminal"
                    successMessage="— right. The curve is falling the whole way out, so the gradient stays below zero even though the curve itself is above it"
                    failureMessage="— careful, this one catches people out."
                    hint="The curve is above the axis out there, but ask instead whether it is going up or coming down"
                    visualizationHint={{
                        blockId: "flat-points-visual",
                        hintKey: "feedback-sketch-tail",
                        label: "Discover it yourself",
                        resetVars: { flatPointsDotX: 1, flatPointsArrowHighlight: "" },
                        steps: [
                            {
                                gesture: "drag-horizontal",
                                label: "Drag the dot out to the far right — the curve stays above the axis but the arrows point down",
                                position: { x: "78%", y: "40%" },
                                completionVar: "flatPointsDotX",
                                completionValue: 3,
                                completionTolerance: 0.4,
                            },
                        ],
                    }}
                >
                    <InlineClozeChoice
                        varName="answerSketchTail"
                        correctAnswer="negative"
                        options={["positive", "negative", "zero"]}
                        {...choicePropsFromDefinition(getVariableInfo('answerSketchTail'))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
