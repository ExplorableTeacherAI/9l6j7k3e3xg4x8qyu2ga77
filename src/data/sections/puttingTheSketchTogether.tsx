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
 * Bend a curve of your own until every clue on the checklist ticks itself off.
 *
 * The clues ARE the findings of the earlier sections. Each one is measured
 * live from the curve the student has made, so nothing ticks until the shape
 * genuinely satisfies it.
 * ──────────────────────────────────────────────────────────────────────────── */

const CONTROL_COUNT = 25;
const H = 0.25;
const CONTROL_X = Array.from({ length: CONTROL_COUNT }, (_, index) => -3 + index * H);
const HANDLE_INDICES = [4, 8, 12, 16, 20]; // x = -2, -1, 0, 1, 2

const VIEW_WIDTH = 620;
const VIEW_HEIGHT = 300;
const PAD_LEFT = 44;
const PAD_RIGHT = 44;
const PAD_TOP = 30;
const PLOT_WIDTH = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = 230;

const X_MIN = -3.3;
const X_MAX = 3.3;
const Y_MIN = -1.7;
const Y_MAX = 1.7;

const ACCENT = "#62D0AD";
const SUCCESS = "#22c55e";
const INK = "#334155";
const STRUCTURE = "#94A3B8";
const MUTED = "#CBD5E1";

const sx = (x: number) => PAD_LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_WIDTH;
const sy = (y: number) => PAD_TOP + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * PLOT_HEIGHT;
const invX = (screenX: number) => X_MIN + ((screenX - PAD_LEFT) / PLOT_WIDTH) * (X_MAX - X_MIN);
const invY = (screenY: number) => Y_MAX - ((screenY - PAD_TOP) / PLOT_HEIGHT) * (Y_MAX - Y_MIN);
const trueCurve = (x: number) => (2 * x) / (1 + x * x);

const gradientOf = (controls: number[], index: number) => {
    if (index === 0) return (controls[1] - controls[0]) / H;
    if (index === CONTROL_COUNT - 1) return (controls[index] - controls[index - 1]) / H;
    return (controls[index + 1] - controls[index - 1]) / (2 * H);
};

interface Clue {
    id: string;
    label: string;
    test: (controls: number[]) => boolean;
}

const CLUES: Clue[] = [
    {
        id: "flat-left",
        label: "Flat at (−1, −1)",
        test: (c) => Math.abs(gradientOf(c, 8)) <= 0.2 && Math.abs(c[8] + 1) <= 0.2,
    },
    {
        id: "flat-right",
        label: "Flat at (1, 1)",
        test: (c) => Math.abs(gradientOf(c, 16)) <= 0.2 && Math.abs(c[16] - 1) <= 0.2,
    },
    {
        id: "falling-left",
        label: "Falling out on the left",
        test: (c) => [1, 2, 3, 4, 5, 6, 7].every((index) => gradientOf(c, index) < -0.02),
    },
    {
        id: "climbing-middle",
        label: "Climbing between the two",
        test: (c) => [9, 10, 11, 12, 13, 14, 15].every((index) => gradientOf(c, index) > 0.05),
    },
    {
        id: "falling-right",
        label: "Falling out on the right",
        test: (c) => [17, 18, 19, 20, 21, 22, 23].every((index) => gradientOf(c, index) < -0.02),
    },
    {
        id: "steepest-origin",
        label: "Steepest right at the origin",
        test: (c) => {
            const middle = gradientOf(c, 12);
            return middle > 0.6 && CONTROL_X.every((_, index) => gradientOf(c, index) <= middle + 1e-9);
        },
    },
];

const truePath = (() => {
    const points: string[] = [];
    for (let x = -3; x <= 3.001; x += 0.05) {
        points.push(`${sx(x).toFixed(2)},${sy(trueCurve(x)).toFixed(2)}`);
    }
    return `M ${points.join(" L ")}`;
})();

function ChecklistCurveDrawing({ solved }: { solved: boolean }) {
    const setVar = useSetVar();
    const controls = useVar<number[]>("sketchControls", CONTROL_X.map((x) => x / 3));
    const highlight = useVar<string>("sketchHighlight", "");
    const [brushCentre, setBrushCentre] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const restDim = highlight ? 0.32 : 1;

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
            x: invX(((clientX - rect.left) / rect.width) * VIEW_WIDTH),
            y: invY(((clientY - rect.top) / rect.height) * VIEW_HEIGHT),
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
            clamp(
                value + delta * Math.exp(-Math.pow(CONTROL_X[index] - brushCentre, 2) / (2 * 0.6 * 0.6)),
                -1.6,
                1.6,
            ),
        );
        setVar("sketchControls", next);
    };

    const curvePath = `M ${controls
        .map((value, index) => `${sx(CONTROL_X[index]).toFixed(2)},${sy(value).toFixed(2)}`)
        .join(" L ")}`;

    const handleHighlightId = (controlIndex: number) =>
        controlIndex === 8 || controlIndex === 16 ? "turningPoints" : controlIndex === 12 ? "steepest" : "";

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            style={{ touchAction: "none" }}
            onPointerMove={continueDrag}
            onPointerUp={() => setBrushCentre(null)}
            onPointerLeave={() => setBrushCentre(null)}
        >
            <defs>
                <filter id="checklist-handle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                <text x={PAD_LEFT} y={20} fill={solved ? SUCCESS : ACCENT} fontSize="12">
                    {solved ? "your curve — that is the shape" : "your curve"}
                </text>
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
                {solved && (
                    <path d={truePath} fill="none" stroke={MUTED} strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" />
                )}
                <path
                    d={curvePath}
                    fill="none"
                    stroke={solved ? SUCCESS : ACCENT}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transition: "stroke 200ms ease-out" }}
                />
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
                const id = handleHighlightId(controlIndex);
                const active = Boolean(id) && highlight === id;
                const dim = highlight && !active ? 0.32 : 1;
                const cx = sx(CONTROL_X[controlIndex]);
                const cy = sy(controls[controlIndex]);
                return (
                    <g
                        key={`handle-${controlIndex}`}
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
                            fill={solved ? SUCCESS : ACCENT}
                            filter="url(#checklist-handle-shadow)"
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

function ChecklistCurveFigure() {
    const setVar = useSetVar();
    const controls = useVar<number[]>("sketchControls", CONTROL_X.map((x) => x / 3));
    const results = CLUES.map((clue) => ({ ...clue, ok: clue.test(controls) }));
    const done = results.filter((clue) => clue.ok).length;
    const solved = done === CLUES.length;

    return (
        <Figure
            id="checklist-curve"
            onReset={() => {
                setVar("sketchControls", CONTROL_X.map((x) => Math.round((x / 3) * 1000) / 1000));
                setVar("sketchHighlight", "");
            }}
            caption="Grab the curve anywhere, or take hold of a teal handle, and pull it into a shape that satisfies every clue. Each line ticks itself off the moment your curve genuinely meets it."
        >
            <ChecklistCurveDrawing solved={solved} />
            <div className="px-6 pb-5">
                <div
                    className="mb-2 text-[12px] font-medium"
                    style={{ color: solved ? SUCCESS : INK, fontVariantNumeric: "tabular-nums" }}
                >
                    {solved ? `all ${CLUES.length} clues satisfied` : `${done} of ${CLUES.length} clues satisfied`}
                </div>
                <ul className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
                    {results.map((clue) => (
                        <li
                            key={clue.id}
                            className="flex items-center gap-2 text-[12px]"
                            style={{ color: clue.ok ? SUCCESS : "#64748B", transition: "color 150ms ease-out" }}
                        >
                            <span
                                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] leading-none"
                                style={{
                                    borderColor: clue.ok ? SUCCESS : MUTED,
                                    backgroundColor: clue.ok ? SUCCESS : "transparent",
                                    color: "#FFFFFF",
                                    transition: "background-color 150ms ease-out, border-color 150ms ease-out",
                                }}
                            >
                                {clue.ok ? "✓" : ""}
                            </span>
                            {clue.label}
                        </li>
                    ))}
                </ul>
            </div>
            <InteractionHintSequence
                hintKey="checklist-curve-bend"
                steps={[
                    {
                        gesture: "drag-vertical",
                        label: "Drag a teal handle up or down to bend the curve",
                        position: { x: "62%", y: "40%" },
                        dragPath: { type: "line", startOffset: { x: 0, y: 16 }, endOffset: { x: 0, y: -22 } },
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
                outside them and climbing between. Now bend a curve of your own until every one of
                those findings ticks itself off the list.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-build" maxWidth="xl">
        <Block id="sketch-visual" padding="sm" hasVisualization>
            <ChecklistCurveFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-guidance" maxWidth="xl">
        <Block id="sketch-guidance" padding="sm">
            <EditableParagraph id="para-sketch-guidance" blockId="sketch-guidance">
                Every clue on that list came out of the sections above. The two{" "}
                <InlineLinkedHighlight
                    id="highlight-sketch-turning-points"
                    varName="sketchHighlight"
                    highlightId="turningPoints"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('sketchHighlight'))}
                >
                    turning points
                </InlineLinkedHighlight>{" "}
                pin the curve down at x = ±1, the three signs decide which way each stretch leans, and
                the{" "}
                <InlineLinkedHighlight
                    id="highlight-sketch-steepest"
                    varName="sketchHighlight"
                    highlightId="steepest"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('sketchHighlight'))}
                >
                    steepest climb
                </InlineLinkedHighlight>{" "}
                at the origin fixes how hard it swings between them.
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
