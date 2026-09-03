import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import {
    EditableH2,
    EditableParagraph,
    InlineScrubbleNumber,
    InlineLinkedHighlight,
    InlineClozeInput,
    InlineFeedback,
    InlineFormula,
    InlineSpotColor,
    InlineTooltip,
    InlineTrigger,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure, FormulaBlock } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import {
    getVariableInfo,
    numberPropsFromDefinition,
    clozePropsFromDefinition,
    linkedHighlightPropsFromDefinition,
    spotColorPropsFromDefinition,
    scrubVarsFromDefinitions,
} from "../variables";
import { CURVE_COLOR_MAP, ANSWER_COLOR, ANSWER_BG_COLOR, signTerm } from "./curveColors";
import { clamp } from "@/lib/motion";

/* ────────────────────────────────────────────────────────────────────────────
 * Figure — a dot walking along y = 2x/(1 + x²), leaving a gradient arrow behind
 * at every station it passes. Arrows tilt up where the curve climbs, down where
 * it falls, and lie level at the two turning points.
 * ──────────────────────────────────────────────────────────────────────────── */

const VIEWBOX_WIDTH = 560;
const VIEWBOX_HEIGHT = 340;
const PAD_LEFT = 44;
const PAD_RIGHT = 44;
const PAD_TOP = 40;
const PAD_BOTTOM = 48;
const PLOT_WIDTH = VIEWBOX_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = VIEWBOX_HEIGHT - PAD_TOP - PAD_BOTTOM;

const X_MIN = -3.4;
const X_MAX = 3.4;
const Y_MIN = -1.4;
const Y_MAX = 1.4;

const PX_PER_X = PLOT_WIDTH / (X_MAX - X_MIN);
const PX_PER_Y = PLOT_HEIGHT / (Y_MAX - Y_MIN);

const CLIMBING_COLOR = CURVE_COLOR_MAP.termGradient;
const FALLING_COLOR = CURVE_COLOR_MAP.termFalling;
const LEVEL_COLOR = CURVE_COLOR_MAP.termLevel;
const INK = CURVE_COLOR_MAP.termCurve;
const STRUCTURE = "#94A3B8";

const STATIONS = [-3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3];

const toScreenX = (x: number) => PAD_LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_WIDTH;
const toScreenY = (y: number) => PAD_TOP + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * PLOT_HEIGHT;
const curveY = (x: number) => (2 * x) / (1 + x * x);
const curveGradient = (x: number) => (2 - 2 * x * x) / Math.pow(1 + x * x, 2);

const formatPosition = (v: number) => v.toFixed(1);
const formatGradient = (v: number) => v.toFixed(2);

const gradientFamily = (m: number) =>
    m > 0.03 ? "climbing" : m < -0.03 ? "falling" : "level";
const familyColor = (family: string) =>
    family === "climbing" ? CLIMBING_COLOR : family === "falling" ? FALLING_COLOR : LEVEL_COLOR;

const curvePath = (() => {
    const points: string[] = [];
    for (let x = X_MIN; x <= X_MAX + 0.001; x += 0.05) {
        points.push(`${toScreenX(x).toFixed(2)},${toScreenY(curveY(x)).toFixed(2)}`);
    }
    return `M ${points.join(" L ")}`;
})();

interface ArrowGeometry {
    shaft: string;
    head: string;
    family: string;
}

const arrowGeometry = (x: number): ArrowGeometry => {
    const centreX = toScreenX(x);
    const centreY = toScreenY(curveY(x));
    const gradient = curveGradient(x);
    const rawX = PX_PER_X;
    const rawY = -gradient * PX_PER_Y;
    const length = Math.hypot(rawX, rawY);
    const unitX = rawX / length;
    const unitY = rawY / length;
    const half = 14;
    const tailX = centreX - unitX * half;
    const tailY = centreY - unitY * half;
    const tipX = centreX + unitX * half;
    const tipY = centreY + unitY * half;
    const perpX = -unitY;
    const perpY = unitX;
    const baseX = tipX - unitX * 7;
    const baseY = tipY - unitY * 7;
    return {
        shaft: `M ${tailX.toFixed(2)} ${tailY.toFixed(2)} L ${tipX.toFixed(2)} ${tipY.toFixed(2)}`,
        head: `${tipX.toFixed(2)},${tipY.toFixed(2)} ${(baseX + perpX * 4.2).toFixed(2)},${(baseY + perpY * 4.2).toFixed(2)} ${(baseX - perpX * 4.2).toFixed(2)},${(baseY - perpY * 4.2).toFixed(2)}`,
        family: gradientFamily(gradient),
    };
};

function WalkingDotDrawing({ visited, onVisit }: { visited: number[]; onVisit: (x: number) => void }) {
    const setVar = useSetVar();
    const dotX = useVar<number>("flatPointsDotX", -3);
    const highlight = useVar<string>("flatPointsArrowHighlight", "");
    const [dragging, setDragging] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        onVisit(dotX);
    }, [dotX, onVisit]);

    const dimFor = (family: string) => (highlight && highlight !== family ? 0.32 : 1);
    const restDim = highlight ? 0.32 : 1;

    const updateFromPointer = useCallback(
        (clientX: number) => {
            const svg = svgRef.current;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const localX = ((clientX - rect.left) / rect.width) * VIEWBOX_WIDTH;
            const mathX = X_MIN + ((localX - PAD_LEFT) / PLOT_WIDTH) * (X_MAX - X_MIN);
            setVar("flatPointsDotX", Math.round(clamp(mathX, -3, 3) * 10) / 10);
        },
        [setVar],
    );

    const dotScreenX = toScreenX(dotX);
    const dotScreenY = toScreenY(curveY(dotX));
    const dotGradient = curveGradient(dotX);
    const dotFamily = gradientFamily(dotGradient);

    const rodRawY = -dotGradient * PX_PER_Y;
    const rodLength = Math.hypot(PX_PER_X, rodRawY);
    const rodUnitX = PX_PER_X / rodLength;
    const rodUnitY = rodRawY / rodLength;

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            className="block w-full"
            style={{ touchAction: "none" }}
        >
            <defs>
                <filter id="walking-dot-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* readouts */}
            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                <text x={PAD_LEFT} y={26} fill={INK} fontSize="12" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {`x = ${formatPosition(dotX)}`}
                </text>
                <text
                    x={VIEWBOX_WIDTH - 24}
                    y={26}
                    fill={familyColor(dotFamily)}
                    fontSize="12"
                    textAnchor="end"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    {`dy/dx = ${formatGradient(dotGradient)}`}
                </text>
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
                <text x={VIEWBOX_WIDTH - 24} y={toScreenY(0) - 8} fill={STRUCTURE} fontSize="12" textAnchor="end">
                    x
                </text>
                <text x={toScreenX(0) + 8} y={PAD_TOP + 2} fill={STRUCTURE} fontSize="12">
                    y
                </text>
                {[-3, -2, -1, 1, 2, 3].map((tick) => (
                    <text
                        key={`tick-x-${tick}`}
                        x={toScreenX(tick)}
                        y={toScreenY(0) + 18}
                        fill={STRUCTURE}
                        fontSize="11"
                        textAnchor="middle"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {tick}
                    </text>
                ))}
                {[-1, 1].map((tick) => (
                    <text
                        key={`tick-y-${tick}`}
                        x={toScreenX(0) - 8}
                        y={toScreenY(tick) + 4}
                        fill={STRUCTURE}
                        fontSize="11"
                        textAnchor="end"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {tick}
                    </text>
                ))}
            </g>

            {/* the curve */}
            <path
                d={curvePath}
                fill="none"
                stroke={STRUCTURE}
                strokeWidth="2"
                strokeLinecap="round"
                opacity={restDim}
                style={{ transition: "opacity 150ms ease-out" }}
            />

            {/* the trail of arrows left behind */}
            {visited.map((station) => {
                const arrow = arrowGeometry(station);
                const isActive = highlight === arrow.family;
                const color = familyColor(arrow.family);
                return (
                    <g
                        key={`arrow-${station}`}
                        opacity={dimFor(arrow.family)}
                        style={{ transition: "opacity 150ms ease-out", cursor: "default" }}
                        onPointerEnter={() => setVar("flatPointsArrowHighlight", arrow.family)}
                        onPointerLeave={() => setVar("flatPointsArrowHighlight", "")}
                    >
                        {isActive && (
                            <path d={arrow.shaft} fill="none" stroke={color} strokeWidth="9" opacity={0.28} strokeLinecap="round" />
                        )}
                        <path
                            d={arrow.shaft}
                            fill="none"
                            stroke={color}
                            strokeWidth={isActive ? 3.6 : 2.2}
                            strokeLinecap="round"
                            style={{ transition: "stroke-width 150ms ease-out" }}
                        />
                        <polygon points={arrow.head} fill={color} />
                    </g>
                );
            })}

            {/* the current rod and the draggable dot */}
            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                <line
                    x1={dotScreenX - rodUnitX * 30}
                    y1={dotScreenY - rodUnitY * 30}
                    x2={dotScreenX + rodUnitX * 30}
                    y2={dotScreenY + rodUnitY * 30}
                    stroke={familyColor(dotFamily)}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                />
                <circle cx={dotScreenX} cy={dotScreenY} r={dragging ? 10.5 : 9} fill={CLIMBING_COLOR} filter="url(#walking-dot-shadow)" />
                <circle
                    cx={dotScreenX}
                    cy={dotScreenY}
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

function WalkingDotFigure() {
    const setVar = useSetVar();
    const [visited, setVisited] = useState<number[]>([-3]);

    const handleVisit = useCallback((x: number) => {
        setVisited((previous) => {
            const next = STATIONS.filter(
                (station) => previous.includes(station) || Math.abs(station - x) <= 0.26,
            );
            return next.length === previous.length ? previous : next;
        });
    }, []);

    return (
        <Figure
            id="walking-dot-gradient-trail"
            onReset={() => {
                setVar("flatPointsDotX", -3);
                setVar("flatPointsArrowHighlight", "");
                setVisited([-3]);
            }}
            caption="Drag the teal dot along the curve. Every arrow it leaves behind points the way the curve was heading at that spot."
        >
            <WalkingDotDrawing visited={visited} onVisit={handleVisit} />
            <InteractionHintSequence
                hintKey="walking-dot-gradient-trail-drag"
                steps={[
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the teal dot across the curve",
                        position: { x: "14%", y: "57%" },
                        dragPath: { type: "line", startOffset: { x: -8, y: 0 }, endOffset: { x: 34, y: -12 } },
                    },
                ]}
            />
        </Figure>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The same dot, written as a formula. Dragging the teal number here walks the
 * dot in the figure above, and the answer recolours itself: teal while the
 * curve climbs, indigo while it falls, slate at the instant it lies level.
 * ──────────────────────────────────────────────────────────────────────────── */

function GradientAtTheDotFormula() {
    const dotX = useVar<number>("flatPointsDotX", -3);
    const gradient = curveGradient(dotX);
    return (
        <FormulaBlock
            latex={`\\left.\\frac{\\clr{termGradient}{dy}}{\\clr{termGradient}{dx}}\\right|_{x = \\scrub{flatPointsDotX}} = \\clr{${signTerm(gradient, 0.03)}}{${gradient.toFixed(2)}}`}
            colorMap={CURVE_COLOR_MAP}
            variables={scrubVarsFromDefinitions(['flatPointsDotX'])}
        />
    );
}

/* ──────────────────────────────────────────────────────────────────────────── */

export const findingFlatPointsBlocks: ReactElement[] = [
    <StackLayout key="layout-flat-points-heading" maxWidth="xl">
        <Block id="flat-points-heading" padding="md">
            <EditableH2 id="h2-flat-points-heading" blockId="flat-points-heading">
                Stationary Points: Solving dy/dx = 0
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-flat-points-setup" maxWidth="xl">
        <Block id="flat-points-setup" padding="sm">
            <EditableParagraph id="para-flat-points-setup" blockId="flat-points-setup">
                A curve goes flat exactly where its gradient is zero, so every{" "}
                <InlineTooltip
                    id="tooltip-flat-points-stationary-point"
                    tooltip="A stationary point is any point where dy/dx = 0. Most are turning points, a maximum or a minimum, but some are stationary points of inflection where the curve merely pauses."
                >
                    stationary point
                </InlineTooltip>{" "}
                starts with{" "}
                <InlineFormula
                    id="formula-flat-points-condition"
                    latex="\frac{\clr{termGradient}{dy}}{\clr{termGradient}{dx}} = \clr{termLevel}{0}"
                    colorMap={CURVE_COLOR_MAP}
                />
                . The quotient rule hands us a fraction, and factorising its{" "}
                <InlineSpotColor
                    id="spot-flat-points-top-line"
                    varName="termTopLine"
                    {...spotColorPropsFromDefinition(getVariableInfo('termTopLine'))}
                >
                    top line
                </InlineSpotColor>{" "}
                makes the zeros jump straight out.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-flat-points-derivative" maxWidth="xl">
        <Block id="flat-points-derivative" padding="lg">
            <FormulaBlock
                latex="\frac{\clr{termGradient}{dy}}{\clr{termGradient}{dx}} = \frac{2(1+x^2) - 2x(2x)}{(1+x^2)^2} = \frac{\clr{termTopLine}{-2(x-1)(x+1)}}{\clr{termBottomLine}{(1+x^2)^2}}"
                colorMap={CURVE_COLOR_MAP}
            />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-flat-points-solve-top" maxWidth="xl">
        <Block id="flat-points-solve-top" padding="lg">
            <FormulaBlock
                latex="\clr{termTopLine}{-2(x-1)(x+1)} = \clr{termLevel}{0} \quad \Rightarrow \quad x = \cloze{flatPointsRootPositive} \;\text{ or }\; x = \cloze{flatPointsRootNegative}"
                colorMap={CURVE_COLOR_MAP}
                clozeInputs={{
                    flatPointsRootPositive: {
                        correctAnswer: '1 | x = 1 | x=1 | +1',
                        placeholder: '?',
                        color: ANSWER_COLOR,
                        bgColor: ANSWER_BG_COLOR,
                    },
                    flatPointsRootNegative: {
                        correctAnswer: '-1 | −1 | x = -1 | x=-1',
                        placeholder: '?',
                        color: ANSWER_COLOR,
                        bgColor: ANSWER_BG_COLOR,
                    },
                }}
            />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-flat-points-zeros" maxWidth="xl">
        <Block id="flat-points-zeros" padding="sm">
            <EditableParagraph id="para-flat-points-zeros" blockId="flat-points-zeros">
                A fraction is zero only when its top line is zero, so each factor up there hands over
                a flat point of its own. The{" "}
                <InlineSpotColor
                    id="spot-flat-points-bottom-line"
                    varName="termBottomLine"
                    {...spotColorPropsFromDefinition(getVariableInfo('termBottomLine'))}
                >
                    bottom line
                </InlineSpotColor>{" "}
                is a square that never reaches zero, so there are no vertical asymptotes. Drag the
                teal dot across from the far left and watch its trail of arrows.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-flat-points-visual" maxWidth="xl">
        <Block id="flat-points-visual" padding="sm" hasVisualization>
            <WalkingDotFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-flat-points-gradient-readout" maxWidth="xl">
        <Block id="flat-points-gradient-readout" padding="lg">
            <GradientAtTheDotFormula />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-flat-points-coordinates" maxWidth="xl">
        <Block id="flat-points-coordinates" padding="sm">
            <EditableParagraph id="para-flat-points-coordinates" blockId="flat-points-coordinates">
                The trail points{" "}
                <InlineLinkedHighlight
                    id="highlight-flat-points-falling"
                    varName="flatPointsArrowHighlight"
                    highlightId="falling"
                    color="#8E90F5"
                    bgColor="rgba(142, 144, 245, 0.2)"
                >
                    downhill
                </InlineLinkedHighlight>{" "}
                out on the wings and{" "}
                <InlineLinkedHighlight
                    id="highlight-flat-points-climbing"
                    varName="flatPointsArrowHighlight"
                    highlightId="climbing"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('flatPointsArrowHighlight'))}
                >
                    uphill
                </InlineLinkedHighlight>{" "}
                in the middle, and lies level at exactly two spots:{" "}
                <InlineTrigger
                    id="trigger-flat-points-upper-level"
                    varName="flatPointsDotX"
                    value={1}
                    color="#64748B"
                    bgColor="rgba(100, 116, 139, 0.15)"
                >
                    (1, 1)
                </InlineTrigger>{" "}
                and{" "}
                <InlineTrigger
                    id="trigger-flat-points-lower-level"
                    varName="flatPointsDotX"
                    value={-1}
                    color="#64748B"
                    bgColor="rgba(100, 116, 139, 0.15)"
                >
                    (−1, −1)
                </InlineTrigger>
                . With the dot at x ={" "}
                <InlineScrubbleNumber
                    varName="flatPointsDotX"
                    {...numberPropsFromDefinition(getVariableInfo('flatPointsDotX'))}
                    formatValue={(v) => v.toFixed(1)}
                />
                , the rod tilts by exactly the gradient the formula above reports.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-flat-points-question-partner" maxWidth="xl">
        <Block id="flat-points-question-partner" padding="md">
            <EditableParagraph id="para-flat-points-question-partner" blockId="flat-points-question-partner">
                A different curve,{" "}
                <InlineFormula
                    id="formula-flat-points-partner-curve"
                    latex="\clr{termCurve}{y} = \frac{\clr{termTopLine}{x}}{\clr{termBottomLine}{4 + x^2}}"
                    colorMap={CURVE_COLOR_MAP}
                />
                , has{" "}
                <InlineFormula
                    id="formula-flat-points-partner-derivative"
                    latex="\frac{\clr{termGradient}{dy}}{\clr{termGradient}{dx}} = \frac{\clr{termTopLine}{(2-x)(2+x)}}{\clr{termBottomLine}{(4 + x^2)^2}}"
                    colorMap={CURVE_COLOR_MAP}
                />
                . So besides going flat at x = 2 it also goes flat at x ={" "}
                <InlineFeedback
                    varName="answerFlatPointsPartner"
                    correctValue={["-2", "−2", "x = -2", "x=-2"]}
                    position="terminal"
                    successMessage="— exactly. Each factor of the top gives its own flat point, and these two come as a matched pair either side of the origin"
                    failureMessage="— not quite yet."
                    hint="Set each factor to zero on its own: 2 − x = 0 gives x = 2, so what does 2 + x = 0 give"
                    visualizationHint={{
                        blockId: "flat-points-visual",
                        hintKey: "feedback-flat-points-partner",
                        label: "Discover it yourself",
                        resetVars: { flatPointsDotX: 3, flatPointsArrowHighlight: "" },
                        steps: [
                            {
                                gesture: "drag-horizontal",
                                label: "Drag the dot left toward the middle — watch the rod swing from downhill to uphill",
                                position: { x: "62%", y: "40%" },
                                completionVar: "flatPointsDotX",
                                completionValue: 0,
                                completionTolerance: 0.35,
                            },
                            {
                                gesture: "drag-horizontal",
                                label: "Keep going left until the rod lies level again — that is the matching partner",
                                position: { x: "34%", y: "62%" },
                                completionVar: "flatPointsDotX",
                                completionValue: -1,
                                completionTolerance: 0.25,
                            },
                        ],
                    }}
                >
                    <InlineClozeInput
                        varName="answerFlatPointsPartner"
                        correctAnswer={["-2", "−2", "x = -2", "x=-2"]}
                        {...clozePropsFromDefinition(getVariableInfo('answerFlatPointsPartner'))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-flat-points-question-asymptote" maxWidth="xl">
        <Block id="flat-points-question-asymptote" padding="md">
            <EditableParagraph id="para-flat-points-question-asymptote" blockId="flat-points-question-asymptote">
                Our curve had no vertical asymptotes because its bottom line never reached zero. So a
                curve whose derivative is{" "}
                <InlineFormula
                    id="formula-flat-points-asymptote-derivative"
                    latex="\frac{\clr{termTopLine}{x - 3}}{\clr{termBottomLine}{(x-5)^2}}"
                    colorMap={CURVE_COLOR_MAP}
                />
                {" "}must have a vertical asymptote at x ={" "}
                <InlineFeedback
                    varName="answerFlatPointsAsymptote"
                    correctValue={["5", "x = 5", "x=5"]}
                    position="terminal"
                    successMessage="— right. The bottom line collapses to zero there, so the gradient blows up and the curve tears apart"
                    failureMessage="— almost."
                    hint="x = 3 makes the top zero, which is a flat point; the asymptote comes from whatever makes the bottom zero"
                >
                    <InlineClozeInput
                        varName="answerFlatPointsAsymptote"
                        correctAnswer={["5", "x = 5", "x=5"]}
                        {...clozePropsFromDefinition(getVariableInfo('answerFlatPointsAsymptote'))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
