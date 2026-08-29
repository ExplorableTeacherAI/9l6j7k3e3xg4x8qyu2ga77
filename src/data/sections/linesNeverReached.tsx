import { useCallback, useRef, useState, type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import {
    EditableH2,
    EditableParagraph,
    InlineToggle,
    InlineLinkedHighlight,
    InlineClozeInput,
    InlineFeedback,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import {
    getVariableInfo,
    clozePropsFromDefinition,
    togglePropsFromDefinition,
    linkedHighlightPropsFromDefinition,
} from "../variables";
import { clamp } from "@/lib/motion";

/* ────────────────────────────────────────────────────────────────────────────
 * The finished sketch, fully labelled: maximum, minimum, the red points of
 * inflection, and the dotted lines the curve approaches but never reaches.
 *
 * Swapping the bottom line of the fraction between 1 + x² and x² − 1 turns the
 * vertical asymptotes on and off, so both kinds can be seen in one place.
 * ──────────────────────────────────────────────────────────────────────────── */

const PLUS_LABEL = "1 + x²";
const MINUS_LABEL = "x² − 1";

const VIEW_WIDTH = 620;
const VIEW_HEIGHT = 360;
const PAD_LEFT = 44;
const PAD_RIGHT = 44;
const PAD_TOP = 44;
const PLOT_WIDTH = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = 276;

const X_MIN = -5;
const X_MAX = 5;
const Y_LIMIT = 3;

const ACCENT = "#62D0AD";
const MIN_COLOR = "#8E90F5";
const INFLECTION_COLOR = "#ef4444";
const ASYMPTOTE_COLOR = "#AC8BF9";
const INK = "#334155";
const STRUCTURE = "#94A3B8";

const ROOT_THREE = Math.sqrt(3);

const toScreenX = (x: number) => PAD_LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_WIDTH;
const toScreenY = (y: number) => PAD_TOP + ((Y_LIMIT - y) / (2 * Y_LIMIT)) * PLOT_HEIGHT;
const fromScreenX = (screenX: number) => X_MIN + ((screenX - PAD_LEFT) / PLOT_WIDTH) * (X_MAX - X_MIN);

const plusCurve = (x: number) => (2 * x) / (1 + x * x);
const minusCurve = (x: number) => (2 * x) / (x * x - 1);

interface Point {
    x: number;
    y: number;
}

const buildSegments = (fn: (x: number) => number): Point[][] => {
    const segments: Point[][] = [];
    let current: Point[] = [];
    for (let x = X_MIN; x <= X_MAX + 1e-9; x += 0.02) {
        const y = fn(x);
        if (!Number.isFinite(y) || Math.abs(y) > Y_LIMIT) {
            if (current.length > 1) segments.push(current);
            current = [];
        } else {
            current.push({ x, y });
        }
    }
    if (current.length > 1) segments.push(current);
    return segments;
};

const PLUS_SEGMENTS = buildSegments(plusCurve);
const MINUS_SEGMENTS = buildSegments(minusCurve);

const pathOf = (segment: Point[]) =>
    `M ${segment.map((point) => `${toScreenX(point.x).toFixed(2)},${toScreenY(point.y).toFixed(2)}`).join(" L ")}`;

const arrowHead = (from: Point, to: Point, size = 7) => {
    const fromX = toScreenX(from.x);
    const fromY = toScreenY(from.y);
    const toX = toScreenX(to.x);
    const toY = toScreenY(to.y);
    const length = Math.hypot(toX - fromX, toY - fromY) || 1;
    const unitX = (toX - fromX) / length;
    const unitY = (toY - fromY) / length;
    const baseX = toX - unitX * size;
    const baseY = toY - unitY * size;
    const perpX = -unitY * size * 0.55;
    const perpY = unitX * size * 0.55;
    return `${toX.toFixed(2)},${toY.toFixed(2)} ${(baseX + perpX).toFixed(2)},${(baseY + perpY).toFixed(2)} ${(baseX - perpX).toFixed(2)},${(baseY - perpY).toFixed(2)}`;
};

function LeaderArrow({ from, to, color }: { from: [number, number]; to: [number, number]; color: string }) {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
    const unitX = (to[0] - from[0]) / length;
    const unitY = (to[1] - from[1]) / length;
    const tipX = to[0] - unitX * 8;
    const tipY = to[1] - unitY * 8;
    const baseX = tipX - unitX * 6;
    const baseY = tipY - unitY * 6;
    return (
        <g>
            <line x1={from[0]} y1={from[1]} x2={baseX} y2={baseY} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <polygon
                points={`${tipX},${tipY} ${baseX - unitY * 3.5},${baseY + unitX * 3.5} ${baseX + unitY * 3.5},${baseY - unitX * 3.5}`}
                fill={color}
            />
        </g>
    );
}

function AnnotatedSketchDrawing() {
    const setVar = useSetVar();
    const curveName = useVar<string>("asymptoteCurve", PLUS_LABEL);
    const dotX = useVar<number>("asymptoteDotX", 3.5);
    const highlight = useVar<string>("asymptoteHighlight", "");
    const [dragging, setDragging] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    const isPlus = curveName === PLUS_LABEL;
    const curve = isPlus ? plusCurve : minusCurve;
    const segments = isPlus ? PLUS_SEGMENTS : MINUS_SEGMENTS;

    const dimFor = (id: string) => (highlight && highlight !== id ? 0.32 : 1);
    const restDim = highlight ? 0.32 : 1;

    const updateFromPointer = useCallback(
        (clientX: number) => {
            const svg = svgRef.current;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const localX = ((clientX - rect.left) / rect.width) * VIEW_WIDTH;
            const nextX = Math.round(clamp(fromScreenX(localX), X_MIN, X_MAX) * 10) / 10;
            // The dot cannot cross an asymptote: it simply climbs it and stops.
            if (Math.abs(curve(nextX)) > Y_LIMIT || !Number.isFinite(curve(nextX))) return;
            setVar("asymptoteDotX", nextX);
        },
        [setVar, curve],
    );

    const dotY = curve(dotX);
    const dotOnScreen = Number.isFinite(dotY) && Math.abs(dotY) <= Y_LIMIT;

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            style={{ touchAction: "none" }}
        >
            <defs>
                <filter id="asymptote-dot-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* the two bottom lines to choose between */}
            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                {[PLUS_LABEL, MINUS_LABEL].map((label, index) => {
                    const selected = curveName === label;
                    return (
                        <g
                            key={`curve-tab-${label}`}
                            style={{ cursor: "pointer" }}
                            onPointerDown={() => setVar("asymptoteCurve", label)}
                        >
                            <text
                                x={PAD_LEFT + index * 150}
                                y={24}
                                fill={selected ? ACCENT : STRUCTURE}
                                fontSize="12"
                                fontWeight={selected ? 600 : 400}
                            >
                                {`y = 2x / (${label})`}
                            </text>
                            {selected && (
                                <line
                                    x1={PAD_LEFT + index * 150}
                                    y1={30}
                                    x2={PAD_LEFT + index * 150 + 118}
                                    y2={30}
                                    stroke={ACCENT}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            )}
                        </g>
                    );
                })}
                {dotOnScreen && (
                    <text
                        x={VIEW_WIDTH - 24}
                        y={24}
                        fill={INK}
                        fontSize="12"
                        textAnchor="end"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {`x = ${dotX.toFixed(1)},  y = ${dotY.toFixed(2)}`}
                    </text>
                )}
            </g>

            {/* axes */}
            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                <line
                    x1={PAD_LEFT}
                    y1={toScreenY(0)}
                    x2={PAD_LEFT + PLOT_WIDTH}
                    y2={toScreenY(0)}
                    stroke={STRUCTURE}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
                <line
                    x1={toScreenX(0)}
                    y1={PAD_TOP}
                    x2={toScreenX(0)}
                    y2={PAD_TOP + PLOT_HEIGHT}
                    stroke={STRUCTURE}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            </g>

            {/* the horizontal asymptote */}
            <g
                opacity={dimFor("horizontal")}
                style={{ transition: "opacity 150ms ease-out" }}
                onPointerEnter={() => setVar("asymptoteHighlight", "horizontal")}
                onPointerLeave={() => setVar("asymptoteHighlight", "")}
            >
                {highlight === "horizontal" && (
                    <line
                        x1={PAD_LEFT}
                        y1={toScreenY(0)}
                        x2={PAD_LEFT + PLOT_WIDTH}
                        y2={toScreenY(0)}
                        stroke={ASYMPTOTE_COLOR}
                        strokeWidth="10"
                        opacity={0.28}
                        strokeLinecap="round"
                    />
                )}
                <line
                    x1={PAD_LEFT}
                    y1={toScreenY(0)}
                    x2={PAD_LEFT + PLOT_WIDTH}
                    y2={toScreenY(0)}
                    stroke={ASYMPTOTE_COLOR}
                    strokeWidth={highlight === "horizontal" ? 4 : 2.5}
                    strokeDasharray="2 6"
                    strokeLinecap="round"
                    style={{ transition: "stroke-width 150ms ease-out" }}
                />
                <text x={VIEW_WIDTH - 24} y={toScreenY(0) + 18} fill={ASYMPTOTE_COLOR} fontSize="11" textAnchor="end">
                    horizontal asymptote y = 0
                </text>
            </g>

            {/* the vertical asymptotes, only when the bottom line can reach zero */}
            {!isPlus && (
                <g
                    opacity={dimFor("vertical")}
                    style={{ transition: "opacity 150ms ease-out" }}
                    onPointerEnter={() => setVar("asymptoteHighlight", "vertical")}
                    onPointerLeave={() => setVar("asymptoteHighlight", "")}
                >
                    {[-1, 1].map((pole) => (
                        <g key={`pole-${pole}`}>
                            {highlight === "vertical" && (
                                <line
                                    x1={toScreenX(pole)}
                                    y1={PAD_TOP}
                                    x2={toScreenX(pole)}
                                    y2={PAD_TOP + PLOT_HEIGHT}
                                    stroke={ASYMPTOTE_COLOR}
                                    strokeWidth="10"
                                    opacity={0.28}
                                    strokeLinecap="round"
                                />
                            )}
                            <line
                                x1={toScreenX(pole)}
                                y1={PAD_TOP}
                                x2={toScreenX(pole)}
                                y2={PAD_TOP + PLOT_HEIGHT}
                                stroke={ASYMPTOTE_COLOR}
                                strokeWidth={highlight === "vertical" ? 4 : 2.5}
                                strokeDasharray="2 6"
                                strokeLinecap="round"
                                style={{ transition: "stroke-width 150ms ease-out" }}
                            />
                            <text
                                x={toScreenX(pole)}
                                y={PAD_TOP + 14}
                                fill={ASYMPTOTE_COLOR}
                                fontSize="10"
                                textAnchor="middle"
                            >
                                {`asymptote x = ${pole === -1 ? "−1" : "1"}`}
                            </text>
                        </g>
                    ))}
                </g>
            )}

            {/* the curve, with an arrowhead on every branch end */}
            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                {segments.map((segment, index) => (
                    <g key={`segment-${curveName}-${index}`}>
                        <path d={pathOf(segment)} fill="none" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" />
                        <polygon points={arrowHead(segment[1], segment[0])} fill={ACCENT} />
                        <polygon
                            points={arrowHead(segment[segment.length - 2], segment[segment.length - 1])}
                            fill={ACCENT}
                        />
                    </g>
                ))}
            </g>

            {/* the named features of the finished sketch */}
            {isPlus && (
                <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                    <circle cx={toScreenX(1)} cy={toScreenY(1)} r={6} fill={ACCENT} />
                    <LeaderArrow from={[toScreenX(1), toScreenY(1) - 26]} to={[toScreenX(1), toScreenY(1)]} color={INK} />
                    <text x={toScreenX(1)} y={toScreenY(1) - 32} fill={INK} fontSize="11" textAnchor="middle">
                        maximum (1, 1)
                    </text>

                    <circle cx={toScreenX(-1)} cy={toScreenY(-1)} r={6} fill={MIN_COLOR} />
                    <LeaderArrow from={[toScreenX(-1), toScreenY(-1) + 26]} to={[toScreenX(-1), toScreenY(-1)]} color={INK} />
                    <text x={toScreenX(-1)} y={toScreenY(-1) + 40} fill={INK} fontSize="11" textAnchor="middle">
                        minimum (−1, −1)
                    </text>

                    {[-ROOT_THREE, 0, ROOT_THREE].map((cut) => (
                        <circle
                            key={`inflection-${cut}`}
                            cx={toScreenX(cut)}
                            cy={toScreenY(plusCurve(cut))}
                            r={5}
                            fill={INFLECTION_COLOR}
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                        />
                    ))}
                    <LeaderArrow
                        from={[toScreenX(ROOT_THREE) + 40, toScreenY(plusCurve(ROOT_THREE)) - 26]}
                        to={[toScreenX(ROOT_THREE), toScreenY(plusCurve(ROOT_THREE))]}
                        color={INFLECTION_COLOR}
                    />
                    <text
                        x={toScreenX(ROOT_THREE) + 44}
                        y={toScreenY(plusCurve(ROOT_THREE)) - 28}
                        fill={INFLECTION_COLOR}
                        fontSize="11"
                    >
                        inflection
                    </text>
                </g>
            )}

            {/* the travelling dot */}
            {dotOnScreen && (
                <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                    <circle
                        cx={toScreenX(dotX)}
                        cy={toScreenY(dotY)}
                        r={dragging ? 10.5 : 9}
                        fill={ACCENT}
                        filter="url(#asymptote-dot-shadow)"
                    />
                    <circle
                        cx={toScreenX(dotX)}
                        cy={toScreenY(dotY)}
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
            )}
        </svg>
    );
}

function AnnotatedSketchFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="annotated-sketch-asymptotes"
            onReset={() => {
                setVar("asymptoteCurve", PLUS_LABEL);
                setVar("asymptoteDotX", 3.5);
                setVar("asymptoteHighlight", "");
            }}
            caption="Drag the teal dot out along a tail and watch its y value shrink toward zero without ever getting there. Switch the bottom line at the top left to see what happens when it can reach zero: the dot climbs the dotted vertical line and cannot cross it."
        >
            <AnnotatedSketchDrawing />
            <InteractionHintSequence
                hintKey="annotated-sketch-drag"
                steps={[
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the teal dot out along the tail",
                        position: { x: "76%", y: "44%" },
                        dragPath: { type: "line", startOffset: { x: -14, y: -4 }, endOffset: { x: 30, y: 6 } },
                    },
                ]}
            />
        </Figure>
    );
}

function BottomLineConsequence() {
    const curveName = useVar<string>("asymptoteCurve", PLUS_LABEL);
    if (curveName === PLUS_LABEL) {
        return <span>That never happens here, so the graph runs unbroken from one side to the other.</span>;
    }
    return (
        <span>That happens at x = −1 and x = 1, where the curve tears apart and races off up and down those lines.</span>
    );
}

/* ──────────────────────────────────────────────────────────────────────────── */

export const linesNeverReachedBlocks: ReactElement[] = [
    <StackLayout key="layout-asymptotes-heading" maxWidth="xl">
        <Block id="asymptotes-heading" padding="md">
            <EditableH2 id="h2-asymptotes-heading" blockId="asymptotes-heading">
                Lines the Curve Never Reaches
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-block-1787996561142" maxWidth="xl">
        <Block id="block-1787996561142" padding="sm">
            <EditableParagraph id="para-block-1787996561142" blockId="block-1787996561142"></EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-block-1787996481932" maxWidth="xl">
        <Block id="block-1787996481932" padding="sm">
            <EditableParagraph id="para-block-1787996481932" blockId="block-1787996481932"></EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-block-1787996484785" maxWidth="xl">
        <Block id="block-1787996484785" padding="sm">
            <EditableParagraph id="para-block-1787996484785" blockId="block-1787996484785"></EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-asymptotes-intro" maxWidth="xl">
        <Block id="asymptotes-intro" padding="sm">
            <EditableParagraph id="para-asymptotes-intro" blockId="asymptotes-intro">
                There is one more kind of line worth marking on a sketch: the ones a curve creeps
                toward but never touches. Our curve flattens toward y = 0 far out in both directions,
                and that line is its{" "}
                <InlineLinkedHighlight
                    id="highlight-asymptote-horizontal"
                    varName="asymptoteHighlight"
                    highlightId="horizontal"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('asymptoteHighlight'))}
                >
                    horizontal asymptote
                </InlineLinkedHighlight>
                .
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-asymptotes-vertical" maxWidth="xl">
        <Block id="asymptotes-vertical" padding="sm">
            <EditableParagraph id="para-asymptotes-vertical" blockId="asymptotes-vertical">
                A{" "}
                <InlineLinkedHighlight
                    id="highlight-asymptote-vertical"
                    varName="asymptoteHighlight"
                    highlightId="vertical"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('asymptoteHighlight'))}
                >
                    vertical asymptote
                </InlineLinkedHighlight>{" "}
                turns up wherever the bottom of the fraction collapses to zero. With a bottom line of{" "}
                <InlineToggle
                    id="toggle-asymptote-curve"
                    varName="asymptoteCurve"
                    options={[PLUS_LABEL, MINUS_LABEL]}
                    {...togglePropsFromDefinition(getVariableInfo('asymptoteCurve'))}
                />
                , that means solving it for zero. <BottomLineConsequence />
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-asymptotes-figure" maxWidth="xl">
        <Block id="block-1787995995946" padding="sm" hasVisualization>
            <AnnotatedSketchFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-asymptotes-summary" maxWidth="xl">
        <Block id="asymptotes-summary" padding="sm">
            <EditableParagraph id="para-asymptotes-summary" blockId="asymptotes-summary">
                Every feature of the sketch is now named: the maximum, the minimum, the three red
                points of inflection, and the dotted lines the curve chases without ever arriving.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-asymptotes-question-horizontal" maxWidth="xl">
        <Block id="asymptotes-question-horizontal" padding="md">
            <EditableParagraph id="para-asymptotes-question-horizontal" blockId="asymptotes-question-horizontal">
                Far out to the right, y = 2x / (x² − 1) shrinks away because the x² underneath
                outgrows the 2x on top. So both of its tails settle toward the horizontal line y ={" "}
                <InlineFeedback
                    varName="answerAsymptoteHorizontal"
                    correctValue={["0", "y = 0", "y=0"]}
                    position="terminal"
                    successMessage="— correct. Whenever the bottom of a fraction grows faster than the top, the whole thing is squeezed toward zero"
                    failureMessage="— try once more."
                    hint="Put a big number in, say x = 100, and see roughly what 200 divided by 9999 comes to"
                    visualizationHint={{
                        blockId: "block-1787995995946",
                        hintKey: "feedback-asymptote-horizontal",
                        label: "Discover it yourself",
                        resetVars: { asymptoteCurve: MINUS_LABEL, asymptoteDotX: 2, asymptoteHighlight: "" },
                        steps: [
                            {
                                gesture: "drag-horizontal",
                                label: "Drag the teal dot out to the far right and read its y value as it shrinks",
                                position: { x: "82%", y: "42%" },
                                completionVar: "asymptoteDotX",
                                completionValue: 5,
                                completionTolerance: 0.6,
                            },
                        ],
                    }}
                >
                    <InlineClozeInput
                        varName="answerAsymptoteHorizontal"
                        correctAnswer={["0", "y = 0", "y=0"]}
                        {...clozePropsFromDefinition(getVariableInfo('answerAsymptoteHorizontal'))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
