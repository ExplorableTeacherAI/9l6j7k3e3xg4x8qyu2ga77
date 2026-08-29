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
 * Draw the finished curve, landmark by landmark.
 *
 * The student drags a pen from the far left. The curve inks in behind it, and
 * every essential point is drawn and confirmed the moment the pen reaches it:
 * the two turning points, the three points of inflection, and finally the
 * horizontal asymptote both tails settle toward.
 * ──────────────────────────────────────────────────────────────────────────── */

const VIEW_WIDTH = 620;
const VIEW_HEIGHT = 300;
const PAD_LEFT = 44;
const PAD_RIGHT = 44;
const PAD_TOP = 56;
const PLOT_WIDTH = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = 220;

const X_MIN = -3.6;
const X_MAX = 3.6;
const Y_MIN = -1.5;
const Y_MAX = 1.5;
const ROOT_THREE = Math.sqrt(3);

const ACCENT = "#62D0AD";
const MIN_COLOR = "#8E90F5";
const INFLECTION_COLOR = "#ef4444";
const ASYMPTOTE_COLOR = "#AC8BF9";
const SUCCESS = "#22c55e";
const INK = "#334155";
const STRUCTURE = "#94A3B8";
const MUTED = "#CBD5E1";

const sx = (x: number) => PAD_LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_WIDTH;
const sy = (y: number) => PAD_TOP + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * PLOT_HEIGHT;
const invX = (screenX: number) => X_MIN + ((screenX - PAD_LEFT) / PLOT_WIDTH) * (X_MAX - X_MIN);
const curveY = (x: number) => (2 * x) / (1 + x * x);
const curveGradient = (x: number) => (2 - 2 * x * x) / Math.pow(1 + x * x, 2);

type MilestoneKind = "inflection" | "maximum" | "minimum" | "asymptote";

interface Milestone {
    id: string;
    x: number;
    kind: MilestoneKind;
    label: string;
    /** Short form drawn beside the marker, placed by hand so nothing overlaps */
    shortLabel?: string;
    labelDx?: number;
    labelDy?: number;
    anchor?: "start" | "middle" | "end";
    banner: string;
    highlightId: string;
}

const MILESTONES: Milestone[] = [
    {
        id: "inflection-left",
        x: -ROOT_THREE,
        kind: "inflection",
        label: "Inflection (−√3, −0.87)",
        shortLabel: "(−√3, −0.87)",
        labelDy: 22,
        banner: "inflection at (−√3, −0.87), where the bend changes",
        highlightId: "inflections",
    },
    {
        id: "minimum",
        x: -1,
        kind: "minimum",
        label: "Minimum (−1, −1)",
        shortLabel: "minimum (−1, −1)",
        labelDy: 29,
        banner: "minimum at (−1, −1): falling before, climbing after",
        highlightId: "turningPoints",
    },
    {
        id: "inflection-origin",
        x: 0,
        kind: "inflection",
        label: "Inflection (0, 0)",
        shortLabel: "(0, 0)",
        labelDx: 12,
        labelDy: -8,
        anchor: "start",
        banner: "inflection at the origin, the steepest point of all",
        highlightId: "inflections",
    },
    {
        id: "maximum",
        x: 1,
        kind: "maximum",
        label: "Maximum (1, 1)",
        shortLabel: "maximum (1, 1)",
        labelDy: -18,
        banner: "maximum at (1, 1): climbing before, falling after",
        highlightId: "turningPoints",
    },
    {
        id: "inflection-right",
        x: ROOT_THREE,
        kind: "inflection",
        label: "Inflection (√3, 0.87)",
        shortLabel: "(√3, 0.87)",
        labelDy: -12,
        banner: "inflection at (√3, 0.87), where the bend changes back",
        highlightId: "inflections",
    },
    {
        id: "asymptote",
        x: 3.5,
        kind: "asymptote",
        label: "Asymptote y = 0",
        banner: "both tails settle toward the asymptote y = 0",
        highlightId: "asymptote",
    },
];

const guidePath = (() => {
    const points: string[] = [];
    for (let x = X_MIN; x <= X_MAX + 1e-9; x += 0.04) {
        points.push(`${sx(x).toFixed(2)},${sy(curveY(x)).toFixed(2)}`);
    }
    return `M ${points.join(" L ")}`;
})();

const inkedPath = (limit: number) => {
    const points: string[] = [];
    for (let x = X_MIN; x <= Math.min(limit, X_MAX) + 1e-9; x += 0.04) {
        points.push(`${sx(x).toFixed(2)},${sy(curveY(x)).toFixed(2)}`);
    }
    return points.length > 1 ? `M ${points.join(" L ")}` : "";
};

function DrawTheCurveDrawing({ drawnTo }: { drawnTo: number }) {
    const setVar = useSetVar();
    const penX = useVar<number>("sketchPenX", X_MIN);
    const highlight = useVar<string>("sketchHighlight", "");
    const [dragging, setDragging] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    const reached = MILESTONES.filter((milestone) => drawnTo >= milestone.x - 1e-9);
    const latest = reached[reached.length - 1];

    const dimFor = (id: string) => (highlight && highlight !== id ? 0.32 : 1);
    const restDim = highlight ? 0.32 : 1;

    const updateFromPointer = useCallback(
        (clientX: number) => {
            const svg = svgRef.current;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const next =
                Math.round(clamp(invX(((clientX - rect.left) / rect.width) * VIEW_WIDTH), X_MIN, X_MAX) * 20) / 20;
            setVar("sketchPenX", next);
            if (next > drawnTo) setVar("sketchDrawnTo", next);
        },
        [setVar, drawnTo],
    );

    const gradient = curveGradient(penX);
    const rodRawY = -gradient * (PLOT_HEIGHT / (Y_MAX - Y_MIN));
    const rodRawX = PLOT_WIDTH / (X_MAX - X_MIN);
    const rodLength = Math.hypot(rodRawX, rodRawY);
    const rodUnitX = (rodRawX / rodLength) * 26;
    const rodUnitY = (rodRawY / rodLength) * 26;

    const markerColor = (kind: MilestoneKind) =>
        kind === "maximum" ? ACCENT : kind === "minimum" ? MIN_COLOR : INFLECTION_COLOR;

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            style={{ touchAction: "none" }}
        >
            <defs>
                <filter id="draw-pen-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* the running confirmation */}
            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                <text x={PAD_LEFT} y={26} fill={latest ? SUCCESS : INK} fontSize="12">
                    {latest ? `✓ ${latest.banner}` : "Drag the pen right and the curve draws itself."}
                </text>
                <text
                    x={VIEW_WIDTH - 24}
                    y={26}
                    fill={STRUCTURE}
                    fontSize="12"
                    textAnchor="end"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    {`${reached.length} of ${MILESTONES.length}`}
                </text>
            </g>

            {/* axes */}
            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                <line x1={PAD_LEFT} y1={sy(0)} x2={PAD_LEFT + PLOT_WIDTH} y2={sy(0)} stroke={STRUCTURE} strokeWidth="1.5" strokeLinecap="round" />
                <line x1={sx(0)} y1={PAD_TOP} x2={sx(0)} y2={PAD_TOP + PLOT_HEIGHT} stroke={STRUCTURE} strokeWidth="1.5" strokeLinecap="round" />
                {[-3, -2, -1, 1, 2, 3].map((tick) => (
                    <text
                        key={`tick-${tick}`}
                        x={sx(tick)}
                        y={sy(0) + 16}
                        fill={STRUCTURE}
                        fontSize="10"
                        textAnchor="middle"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {tick}
                    </text>
                ))}
            </g>

            {/* the asymptote, once the tails have been drawn */}
            {drawnTo >= 3.5 && (
                <g
                    opacity={dimFor("asymptote")}
                    style={{ transition: "opacity 150ms ease-out" }}
                    onPointerEnter={() => setVar("sketchHighlight", "asymptote")}
                    onPointerLeave={() => setVar("sketchHighlight", "")}
                >
                    {highlight === "asymptote" && (
                        <line x1={PAD_LEFT} y1={sy(0)} x2={PAD_LEFT + PLOT_WIDTH} y2={sy(0)} stroke={ASYMPTOTE_COLOR} strokeWidth="10" opacity={0.28} strokeLinecap="round" />
                    )}
                    <line
                        x1={PAD_LEFT}
                        y1={sy(0)}
                        x2={PAD_LEFT + PLOT_WIDTH}
                        y2={sy(0)}
                        stroke={ASYMPTOTE_COLOR}
                        strokeWidth={highlight === "asymptote" ? 4 : 2.5}
                        strokeDasharray="2 6"
                        strokeLinecap="round"
                        style={{ transition: "stroke-width 150ms ease-out" }}
                    />
                    <text x={VIEW_WIDTH - 24} y={sy(0) - 8} fill={ASYMPTOTE_COLOR} fontSize="11" textAnchor="end">
                        asymptote y = 0
                    </text>
                </g>
            )}

            {/* the curve: a faint guide ahead, solid ink behind the pen */}
            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                <path d={guidePath} fill="none" stroke={MUTED} strokeWidth="2" strokeDasharray="4 7" strokeLinecap="round" />
                <path d={inkedPath(drawnTo)} fill="none" stroke={ACCENT} strokeWidth="3.2" strokeLinecap="round" />
            </g>

            {/* every landmark, drawn the moment the pen reaches it */}
            {reached
                .filter((milestone) => milestone.kind !== "asymptote")
                .map((milestone) => {
                    const active = highlight === milestone.highlightId;
                    const color = markerColor(milestone.kind);
                    const cx = sx(milestone.x);
                    const cy = sy(curveY(milestone.x));
                    return (
                        <g
                            key={milestone.id}
                            opacity={dimFor(milestone.highlightId)}
                            style={{ transition: "opacity 150ms ease-out" }}
                            onPointerEnter={() => setVar("sketchHighlight", milestone.highlightId)}
                            onPointerLeave={() => setVar("sketchHighlight", "")}
                        >
                            {active && <circle cx={cx} cy={cy} r={16} fill={color} opacity={0.28} />}
                            <circle
                                cx={cx}
                                cy={cy}
                                r={active ? 8 : 6}
                                fill={color}
                                stroke="#FFFFFF"
                                strokeWidth="1.5"
                                style={{ transition: "r 150ms ease-out" }}
                            />
                            <text
                                x={cx + (milestone.labelDx ?? 0)}
                                y={cy + (milestone.labelDy ?? 22)}
                                fill={color}
                                fontSize={milestone.kind === "inflection" ? 10 : 11}
                                textAnchor={milestone.anchor ?? "middle"}
                                style={{ pointerEvents: "none" }}
                            >
                                {milestone.shortLabel ?? milestone.label}
                            </text>
                        </g>
                    );
                })}

            {/* the pen, carrying the tangent rod so the gradient stays visible */}
            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                <line
                    x1={sx(penX) - rodUnitX}
                    y1={sy(curveY(penX)) - rodUnitY}
                    x2={sx(penX) + rodUnitX}
                    y2={sy(curveY(penX)) + rodUnitY}
                    stroke={ACCENT}
                    strokeWidth="3"
                    strokeLinecap="round"
                />
                <circle cx={sx(penX)} cy={sy(curveY(penX))} r={dragging ? 10.5 : 9} fill={ACCENT} filter="url(#draw-pen-shadow)" />
                <circle
                    cx={sx(penX)}
                    cy={sy(curveY(penX))}
                    r={24}
                    fill="transparent"
                    style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
                    onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setDragging(true);
                    }}
                    onPointerMove={(event) => {
                        if (dragging) updateFromPointer(event.clientX);
                    }}
                    onPointerUp={() => setDragging(false)}
                    onPointerCancel={() => setDragging(false)}
                />
            </g>
        </svg>
    );
}

function DrawTheCurveFigure() {
    const setVar = useSetVar();
    const drawnTo = useVar<number>("sketchDrawnTo", X_MIN);
    const reachedCount = MILESTONES.filter((milestone) => drawnTo >= milestone.x - 1e-9).length;
    const finished = reachedCount === MILESTONES.length;

    return (
        <Figure
            id="draw-the-curve"
            onReset={() => {
                setVar("sketchPenX", X_MIN);
                setVar("sketchDrawnTo", X_MIN);
                setVar("sketchHighlight", "");
            }}
            caption="Drag the pen from the far left. The curve inks in behind it, the rod on the pen shows the gradient as you go, and each essential point is drawn and confirmed the moment you reach it."
        >
            <DrawTheCurveDrawing drawnTo={drawnTo} />
            <div className="px-6 pb-5">
                <div
                    className="mb-2 text-[12px] font-medium"
                    style={{ color: finished ? SUCCESS : INK, fontVariantNumeric: "tabular-nums" }}
                >
                    {finished
                        ? "every essential point is on the sketch"
                        : `${reachedCount} of ${MILESTONES.length} essential points drawn`}
                </div>
                <ul className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
                    {MILESTONES.map((milestone) => {
                        const done = drawnTo >= milestone.x - 1e-9;
                        return (
                            <li
                                key={milestone.id}
                                className="flex items-center gap-2 text-[12px]"
                                style={{ color: done ? SUCCESS : "#64748B", transition: "color 150ms ease-out" }}
                            >
                                <span
                                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] leading-none"
                                    style={{
                                        borderColor: done ? SUCCESS : MUTED,
                                        backgroundColor: done ? SUCCESS : "transparent",
                                        color: "#FFFFFF",
                                        transition: "background-color 150ms ease-out, border-color 150ms ease-out",
                                    }}
                                >
                                    {done ? "✓" : ""}
                                </span>
                                {milestone.label}
                            </li>
                        );
                    })}
                </ul>
            </div>
            <InteractionHintSequence
                hintKey="draw-the-curve-pen"
                steps={[
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the pen right to draw the curve",
                        position: { x: "12%", y: "58%" },
                        dragPath: { type: "line", startOffset: { x: -8, y: 0 }, endOffset: { x: 36, y: -10 } },
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
                Everything is now on the table. A valley at (−1, −1), a hilltop at (1, 1), the bend
                changing at −√3, 0 and √3, and both tails sinking toward y = 0. Drag the pen across
                and the curve draws itself, confirming each landmark as you reach it.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-build" maxWidth="xl">
        <Block id="sketch-visual" padding="sm" hasVisualization>
            <DrawTheCurveFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-guidance" maxWidth="xl">
        <Block id="sketch-guidance" padding="sm">
            <EditableParagraph id="para-sketch-guidance" blockId="sketch-guidance">
                Watch the rod on the pen as it travels. It lies perfectly flat at the two{" "}
                <InlineLinkedHighlight
                    id="highlight-sketch-turning-points"
                    varName="sketchHighlight"
                    highlightId="turningPoints"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('sketchHighlight'))}
                >
                    turning points
                </InlineLinkedHighlight>{" "}
                and stands at its steepest at the origin, which is also one of the three{" "}
                <InlineLinkedHighlight
                    id="highlight-sketch-inflections"
                    varName="sketchHighlight"
                    highlightId="inflections"
                    color="#ef4444"
                    bgColor="rgba(239, 68, 68, 0.18)"
                >
                    bend changes
                </InlineLinkedHighlight>
                .
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
                        blockId: "sketch-visual",
                        hintKey: "feedback-sketch-tail",
                        label: "Discover it yourself",
                        resetVars: { sketchPenX: 1, sketchHighlight: "" },
                        steps: [
                            {
                                gesture: "drag-horizontal",
                                label: "Drag the pen out to the far right — the curve stays above the axis but the rod tilts down",
                                position: { x: "80%", y: "48%" },
                                completionVar: "sketchPenX",
                                completionValue: 3.4,
                                completionTolerance: 0.5,
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
