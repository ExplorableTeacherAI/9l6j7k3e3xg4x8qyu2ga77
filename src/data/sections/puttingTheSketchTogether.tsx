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
 * A LINKED PAIR, worked backwards.
 *
 * Above: a curve the student bends by dragging it directly.
 * Below: the gradient graph of whatever they have made, over a faint target.
 *
 * Both views read the SAME store variables — sketchControls and
 * sketchHighlight — and share one x-mapping, so every point of the gradient
 * graph sits directly under the piece of curve that produced it.
 * ──────────────────────────────────────────────────────────────────────────── */

const CONTROL_COUNT = 25;
const H = 0.25;
const X_MIN = -3.3;
const X_MAX = 3.3;
const VIEW_WIDTH = 560;
const PAD_LEFT = 44;
const PAD_RIGHT = 44;
const PLOT_WIDTH = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;

const CONTROL_X = Array.from({ length: CONTROL_COUNT }, (_, index) => -3 + index * H);
const HANDLE_INDICES = [4, 8, 12, 16, 20]; // x = -2, -1, 0, 1, 2

const ACCENT = "#62D0AD";
const INK = "#334155";
const STRUCTURE = "#94A3B8";
const GUIDE = "#CBD5E1";
const SUCCESS = "#22c55e";

const toScreenX = (x: number) => PAD_LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_WIDTH;
const targetGradient = (x: number) => (2 - 2 * x * x) / Math.pow(1 + x * x, 2);

const gradientOf = (controls: number[], index: number) => {
    if (index === 0) return (controls[1] - controls[0]) / H;
    if (index === controls.length - 1) return (controls[index] - controls[index - 1]) / H;
    return (controls[index + 1] - controls[index - 1]) / (2 * H);
};

const matchPercent = (controls: number[]) => {
    let hits = 0;
    for (let index = 0; index < CONTROL_COUNT; index += 1) {
        if (Math.abs(gradientOf(controls, index) - targetGradient(CONTROL_X[index])) <= 0.35) hits += 1;
    }
    return Math.round((hits / CONTROL_COUNT) * 100);
};

const highlightIdForHandle = (controlIndex: number) => {
    if (controlIndex === 8 || controlIndex === 16) return "flatPoints";
    if (controlIndex === 12) return "steepest";
    return "";
};

function useSketchState() {
    const controls = useVar<number[]>("sketchControls", CONTROL_X.map((x) => x / 3));
    const highlight = useVar<string>("sketchHighlight", "");
    const setVar = useSetVar();
    const restDim = highlight ? 0.32 : 1;
    return { controls, highlight, setVar, restDim };
}

/* ── View A — the curve the student bends ────────────────────────────────── */

const CURVE_HEIGHT = 260;
const CURVE_TOP = 28;
const CURVE_PLOT_HEIGHT = 200;
const CURVE_Y_MIN = -1.7;
const CURVE_Y_MAX = 1.7;
const toCurveY = (y: number) =>
    CURVE_TOP + ((CURVE_Y_MAX - y) / (CURVE_Y_MAX - CURVE_Y_MIN)) * CURVE_PLOT_HEIGHT;
const fromCurveY = (screenY: number) =>
    CURVE_Y_MAX - ((screenY - CURVE_TOP) / CURVE_PLOT_HEIGHT) * (CURVE_Y_MAX - CURVE_Y_MIN);

function SketchCurveDrawing() {
    const { controls, highlight, setVar, restDim } = useSketchState();
    const [brushCentre, setBrushCentre] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const valueAt = useCallback(
        (x: number) => {
            const position = clamp((x + 3) / H, 0, CONTROL_COUNT - 1);
            const low = Math.floor(position);
            const high = Math.min(low + 1, CONTROL_COUNT - 1);
            return controls[low] + (controls[high] - controls[low]) * (position - low);
        },
        [controls],
    );

    const localPoint = useCallback((clientX: number, clientY: number) => {
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        return {
            x: X_MIN + (((clientX - rect.left) / rect.width) * VIEW_WIDTH - PAD_LEFT) / PLOT_WIDTH * (X_MAX - X_MIN),
            y: fromCurveY(((clientY - rect.top) / rect.height) * CURVE_HEIGHT),
        };
    }, []);

    const beginDrag = (event: React.PointerEvent<SVGElement>) => {
        const point = localPoint(event.clientX, event.clientY);
        if (!point) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setBrushCentre(clamp(point.x, -3, 3));
    };

    const continueDrag = (event: React.PointerEvent<SVGSVGElement>) => {
        if (brushCentre === null) return;
        const point = localPoint(event.clientX, event.clientY);
        if (!point) return;
        const delta = clamp(point.y, -1.6, 1.6) - valueAt(brushCentre);
        const next = controls.map((value, index) =>
            clamp(value + delta * Math.exp(-Math.pow(CONTROL_X[index] - brushCentre, 2) / (2 * 0.6 * 0.6)), -1.6, 1.6),
        );
        setVar("sketchControls", next);
    };

    const curvePath = `M ${controls
        .map((value, index) => `${toScreenX(CONTROL_X[index]).toFixed(2)},${toCurveY(value).toFixed(2)}`)
        .join(" L ")}`;

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${CURVE_HEIGHT}`}
            className="block w-full"
            style={{ touchAction: "none" }}
            onPointerMove={continueDrag}
            onPointerUp={() => setBrushCentre(null)}
            onPointerLeave={() => setBrushCentre(null)}
        >
            <defs>
                <filter id="sketch-handle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                <text x={PAD_LEFT} y={18} fill={ACCENT} fontSize="12">
                    your curve
                </text>
                <line
                    x1={PAD_LEFT}
                    y1={toCurveY(0)}
                    x2={PAD_LEFT + PLOT_WIDTH}
                    y2={toCurveY(0)}
                    stroke={STRUCTURE}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
                <line
                    x1={toScreenX(0)}
                    y1={CURVE_TOP}
                    x2={toScreenX(0)}
                    y2={CURVE_TOP + CURVE_PLOT_HEIGHT}
                    stroke={STRUCTURE}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
                <path d={curvePath} fill="none" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path
                    d={curvePath}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="30"
                    strokeLinecap="round"
                    style={{ cursor: brushCentre === null ? "grab" : "grabbing", touchAction: "none" }}
                    onPointerDown={beginDrag}
                />
            </g>

            {HANDLE_INDICES.map((controlIndex) => {
                const id = highlightIdForHandle(controlIndex);
                const active = Boolean(id) && highlight === id;
                const dim = highlight && !active ? 0.32 : 1;
                const cx = toScreenX(CONTROL_X[controlIndex]);
                const cy = toCurveY(controls[controlIndex]);
                return (
                    <g
                        key={`sketch-handle-${controlIndex}`}
                        opacity={dim}
                        style={{ transition: "opacity 150ms ease-out" }}
                        onPointerEnter={() => id && setVar("sketchHighlight", id)}
                        onPointerLeave={() => setVar("sketchHighlight", "")}
                    >
                        {active && <circle cx={cx} cy={cy} r={17} fill={ACCENT} opacity={0.28} />}
                        <circle
                            cx={cx}
                            cy={cy}
                            r={active ? 11 : 8.5}
                            fill={ACCENT}
                            filter="url(#sketch-handle-shadow)"
                            style={{ transition: "r 150ms ease-out" }}
                        />
                        <circle
                            cx={cx}
                            cy={cy}
                            r={22}
                            fill="transparent"
                            style={{ cursor: brushCentre === null ? "grab" : "grabbing", touchAction: "none" }}
                            onPointerDown={beginDrag}
                        />
                    </g>
                );
            })}
        </svg>
    );
}

/* ── View B — the gradient graph it produces ─────────────────────────────── */

const GRAD_HEIGHT = 230;
const GRAD_TOP = 32;
const GRAD_PLOT_HEIGHT = 160;
const GRAD_Y_MIN = -0.9;
const GRAD_Y_MAX = 2.4;
const toGradY = (value: number) =>
    GRAD_TOP + ((GRAD_Y_MAX - clamp(value, GRAD_Y_MIN, GRAD_Y_MAX)) / (GRAD_Y_MAX - GRAD_Y_MIN)) * GRAD_PLOT_HEIGHT;

const targetPath = (() => {
    const points: string[] = [];
    for (let x = -3; x <= 3.001; x += 0.05) {
        points.push(`${toScreenX(x).toFixed(2)},${toGradY(targetGradient(x)).toFixed(2)}`);
    }
    return `M ${points.join(" L ")}`;
})();

function SketchGradientDrawing() {
    const { controls, highlight, setVar, restDim } = useSketchState();

    const studentPath = `M ${controls
        .map((_, index) => `${toScreenX(CONTROL_X[index]).toFixed(2)},${toGradY(gradientOf(controls, index)).toFixed(2)}`)
        .join(" L ")}`;

    const match = matchPercent(controls);
    const matched = match >= 85;

    const markers = [
        { id: "flatPoints", x: -1, value: 0 },
        { id: "steepest", x: 0, value: 2 },
        { id: "flatPoints", x: 1, value: 0 },
    ];

    return (
        <svg viewBox={`0 0 ${VIEW_WIDTH} ${GRAD_HEIGHT}`} className="block w-full">
            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                <text x={PAD_LEFT} y={20} fill={ACCENT} fontSize="12">
                    gradient of your curve
                </text>
                <text x={VIEW_WIDTH - 24} y={20} fill={STRUCTURE} fontSize="12" textAnchor="end">
                    dashed: the target
                </text>
                <line
                    x1={PAD_LEFT}
                    y1={toGradY(0)}
                    x2={PAD_LEFT + PLOT_WIDTH}
                    y2={toGradY(0)}
                    stroke={STRUCTURE}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
                <line
                    x1={toScreenX(0)}
                    y1={GRAD_TOP}
                    x2={toScreenX(0)}
                    y2={GRAD_TOP + GRAD_PLOT_HEIGHT}
                    stroke={STRUCTURE}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
                {[-3, -2, -1, 1, 2, 3].map((tick) => (
                    <text
                        key={`grad-tick-${tick}`}
                        x={toScreenX(tick)}
                        y={toGradY(0) + 18}
                        fill={STRUCTURE}
                        fontSize="11"
                        textAnchor="middle"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {tick}
                    </text>
                ))}
                <path d={targetPath} fill="none" stroke={GUIDE} strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" />
                <path d={studentPath} fill="none" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <text
                    x={PAD_LEFT}
                    y={210}
                    fill={matched ? SUCCESS : INK}
                    fontSize="12"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    {matched ? `match ${match}% — that is the curve` : `match ${match}%`}
                </text>
            </g>

            {markers.map((marker, index) => {
                const active = highlight === marker.id;
                const dim = highlight && !active ? 0.32 : 1;
                return (
                    <g
                        key={`grad-marker-${index}`}
                        opacity={dim}
                        style={{ transition: "opacity 150ms ease-out" }}
                        onPointerEnter={() => setVar("sketchHighlight", marker.id)}
                        onPointerLeave={() => setVar("sketchHighlight", "")}
                    >
                        {active && (
                            <circle cx={toScreenX(marker.x)} cy={toGradY(marker.value)} r={16} fill={ACCENT} opacity={0.28} />
                        )}
                        <circle
                            cx={toScreenX(marker.x)}
                            cy={toGradY(marker.value)}
                            r={active ? 8 : 5.5}
                            fill="#FFFFFF"
                            stroke={active ? ACCENT : STRUCTURE}
                            strokeWidth={active ? 3 : 1.8}
                            style={{ transition: "r 150ms ease-out, stroke-width 150ms ease-out" }}
                        />
                    </g>
                );
            })}
        </svg>
    );
}

/* ── Figure shells ───────────────────────────────────────────────────────── */

const resetSketch = (setVar: (name: string, value: unknown) => void) => {
    setVar("sketchControls", CONTROL_X.map((x) => Math.round((x / 3) * 1000) / 1000));
    setVar("sketchHighlight", "");
};

function SketchCurveFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="sketch-curve-view"
            onReset={() => resetSketch(setVar)}
            caption="Your curve. Grab it anywhere, or take hold of one of the teal handles, and pull it into shape."
        >
            <SketchCurveDrawing />
            <InteractionHintSequence
                hintKey="sketch-curve-bend"
                steps={[
                    {
                        gesture: "drag-vertical",
                        label: "Drag a teal handle up or down to bend the curve",
                        position: { x: "62%", y: "48%" },
                        dragPath: { type: "line", startOffset: { x: 0, y: 16 }, endOffset: { x: 0, y: -22 } },
                    },
                ]}
            />
        </Figure>
    );
}

function SketchGradientFigure() {
    return (
        <Figure
            id="sketch-gradient-view"
            caption="The gradient of the curve above, drawn over the faint target. The closer the solid line sits to the dashed one, the closer your curve is to the real thing."
        >
            <SketchGradientDrawing />
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
                outside them and climbing between, and the bend changing at −√3, 0 and √3. Now work
                the other way: bend the curve until the gradient graph beneath it lands on the faint
                target.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-curve-view" maxWidth="xl">
        <Block id="sketch-visual" padding="sm" hasVisualization>
            <SketchCurveFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-gradient-view" maxWidth="xl">
        <Block id="sketch-gradient-visual" padding="sm" hasVisualization>
            <SketchGradientFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-guidance" maxWidth="xl">
        <Block id="sketch-guidance" padding="sm">
            <EditableParagraph id="para-sketch-guidance" blockId="sketch-guidance">
                The gradient graph has to dip through zero at the two{" "}
                <InlineLinkedHighlight
                    id="highlight-sketch-flat-points"
                    varName="sketchHighlight"
                    highlightId="flatPoints"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('sketchHighlight'))}
                >
                    flat points
                </InlineLinkedHighlight>{" "}
                and rise to its{" "}
                <InlineLinkedHighlight
                    id="highlight-sketch-steepest"
                    varName="sketchHighlight"
                    highlightId="steepest"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('sketchHighlight'))}
                >
                    steepest climb
                </InlineLinkedHighlight>{" "}
                at the origin. Get those three right and the curve above has almost nowhere else to
                go.
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
