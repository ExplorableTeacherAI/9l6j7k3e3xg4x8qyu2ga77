import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import {
    EditableH2,
    EditableParagraph,
    InlineScrubbleNumber,
    InlineLinkedHighlight,
    InlineClozeInput,
    InlineClozeChoice,
    InlineFeedback,
    InlineFormula,
    InlineSpotColor,
    InlineTooltip,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure, FormulaBlock } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import {
    getVariableInfo,
    numberPropsFromDefinition,
    clozePropsFromDefinition,
    choicePropsFromDefinition,
    linkedHighlightPropsFromDefinition,
    spotColorPropsFromDefinition,
    scrubVarsFromDefinitions,
} from "../variables";
import { CURVE_COLOR_MAP, signTerm } from "./curveColors";
import { clamp } from "@/lib/motion";

/* ────────────────────────────────────────────────────────────────────────────
 * A LINKED PAIR.
 *
 * Above: the curve y = 2x/(1 + x²), cut into four pieces at −√3, 0 and √3.
 * Below: the bend line, the same four stretches with a sign box each.
 *
 * Both views read the SAME store variables — bendTestX, bendTestedValues and
 * bendHighlight — so neither tells the other anything; they simply agree. They
 * share one x-mapping, so a stretch sits directly above its own sign box, and
 * hovering either one pops its counterpart in the other view.
 * ──────────────────────────────────────────────────────────────────────────── */

const ROOT_THREE = Math.sqrt(3);
const X_MIN = -3.4;
const X_MAX = 3.4;
const VIEW_WIDTH = 560;
const PAD_LEFT = 44;
const PAD_RIGHT = 44;
const PLOT_WIDTH = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;

const CUTS = [-ROOT_THREE, 0, ROOT_THREE];
const STRETCH_EDGES = [X_MIN, -ROOT_THREE, 0, ROOT_THREE, X_MAX];
const STRETCH_LABELS = ["x < −√3", "−√3 < x < 0", "0 < x < √3", "x > √3"];

const UP_COLOR = CURVE_COLOR_MAP.termGradient;
const DOWN_COLOR = CURVE_COLOR_MAP.termFalling;
const UNTESTED_COLOR = "#CBD5E1";
const INK = CURVE_COLOR_MAP.termCurve;
const STRUCTURE = "#94A3B8";
const RULE = "#E2E8F0";
const INFLECTION_COLOR = CURVE_COLOR_MAP.termBend;

const toScreenX = (x: number) => PAD_LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_WIDTH;
const curveY = (x: number) => (2 * x) / (1 + x * x);
const secondDerivative = (x: number) => (4 * x * (x * x - 3)) / Math.pow(1 + x * x, 3);

const formatBend = (value: number) => value.toFixed(2);

const stretchIndexFor = (x: number) => {
    for (let index = 0; index < 4; index += 1) {
        if (x <= STRETCH_EDGES[index + 1]) return index;
    }
    return 3;
};

const familyForStretch = (index: number, tested: number[]) => {
    const match = tested.find((value) => stretchIndexFor(value) === index);
    if (match === undefined) return null;
    return secondDerivative(match) > 0 ? "concaveUp" : "concaveDown";
};

const colorForFamily = (family: string | null) =>
    family === "concaveUp" ? UP_COLOR : family === "concaveDown" ? DOWN_COLOR : UNTESTED_COLOR;

function useBendState() {
    const testX = useVar<number>("bendTestX", -3);
    const highlight = useVar<string>("bendHighlight", "");
    const tested = useVar<number[]>("bendTestedValues", []);
    const setVar = useSetVar();

    const isActive = (index: number) => {
        if (!highlight) return false;
        if (highlight === `stretch-${index}`) return true;
        return highlight === familyForStretch(index, tested);
    };
    const dimFor = (index: number) => (highlight && !isActive(index) ? 0.32 : 1);
    const restDim = highlight ? 0.32 : 1;

    const hoverProps = (index: number) => ({
        onPointerEnter: () => setVar("bendHighlight", `stretch-${index}`),
        onPointerLeave: () => setVar("bendHighlight", ""),
    });

    return { testX, highlight, tested, setVar, isActive, dimFor, restDim, hoverProps };
}

const reset = (setVar: (name: string, value: unknown) => void) => {
    setVar("bendTestX", -3);
    setVar("bendHighlight", "");
    setVar("bendTestedValues", []);
};

/* ── View A — the curve ──────────────────────────────────────────────────── */

const CURVE_HEIGHT = 250;
const CURVE_TOP = 30;
const CURVE_PLOT_HEIGHT = 190;
const CURVE_Y_MIN = -1.15;
const CURVE_Y_MAX = 1.15;
const toCurveScreenY = (y: number) =>
    CURVE_TOP + ((CURVE_Y_MAX - y) / (CURVE_Y_MAX - CURVE_Y_MIN)) * CURVE_PLOT_HEIGHT;

const stretchPath = (index: number) => {
    const from = STRETCH_EDGES[index];
    const to = STRETCH_EDGES[index + 1];
    const points: string[] = [];
    const steps = 60;
    for (let step = 0; step <= steps; step += 1) {
        const x = from + ((to - from) * step) / steps;
        points.push(`${toScreenX(x).toFixed(2)},${toCurveScreenY(curveY(x)).toFixed(2)}`);
    }
    return `M ${points.join(" L ")}`;
};

function BendCurveDrawing() {
    const { testX, tested, setVar, isActive, dimFor, restDim, hoverProps } = useBendState();
    const [dragging, setDragging] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    // One source of truth: this effect is the only place a stretch is recorded.
    useEffect(() => {
        const index = stretchIndexFor(testX);
        if (tested.some((value) => stretchIndexFor(value) === index)) return;
        setVar("bendTestedValues", [...tested, testX]);
    }, [testX, tested, setVar]);

    const updateFromPointer = useCallback(
        (clientX: number) => {
            const svg = svgRef.current;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const localX = ((clientX - rect.left) / rect.width) * VIEW_WIDTH;
            const mathX = X_MIN + ((localX - PAD_LEFT) / PLOT_WIDTH) * (X_MAX - X_MIN);
            setVar("bendTestX", Math.round(clamp(mathX, -3, 3) * 10) / 10);
        },
        [setVar],
    );

    const dotX = toScreenX(testX);
    const dotY = toCurveScreenY(curveY(testX));
    const bendValue = secondDerivative(testX);

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${CURVE_HEIGHT}`}
            className="block w-full"
            style={{ touchAction: "none" }}
        >
            <defs>
                <filter id="bend-dot-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                <text x={PAD_LEFT} y={20} fill={INK} fontSize="12">
                    y = 2x / (1 + x²)
                </text>
                <text
                    x={VIEW_WIDTH - 24}
                    y={20}
                    fill={colorForFamily(bendValue > 0 ? "concaveUp" : "concaveDown")}
                    fontSize="12"
                    textAnchor="end"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    {`d²y/dx² = ${formatBend(bendValue)}`}
                </text>
                <line
                    x1={PAD_LEFT}
                    y1={toCurveScreenY(0)}
                    x2={PAD_LEFT + PLOT_WIDTH}
                    y2={toCurveScreenY(0)}
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
                {CUTS.map((cut) => (
                    <line
                        key={`cut-${cut}`}
                        x1={toScreenX(cut)}
                        y1={CURVE_TOP}
                        x2={toScreenX(cut)}
                        y2={CURVE_TOP + CURVE_PLOT_HEIGHT}
                        stroke={RULE}
                        strokeWidth="1.5"
                        strokeDasharray="4 5"
                    />
                ))}
            </g>

            {[0, 1, 2, 3].map((index) => {
                const family = familyForStretch(index, tested);
                const color = colorForFamily(family);
                const active = isActive(index);
                const left = toScreenX(STRETCH_EDGES[index]);
                const right = toScreenX(STRETCH_EDGES[index + 1]);
                return (
                    <g
                        key={`curve-stretch-${index}`}
                        opacity={dimFor(index)}
                        style={{ transition: "opacity 150ms ease-out" }}
                        {...hoverProps(index)}
                    >
                        <rect
                            x={left}
                            y={CURVE_TOP}
                            width={right - left}
                            height={CURVE_PLOT_HEIGHT}
                            fill={family ? color : "transparent"}
                            opacity={active ? 0.16 : 0.07}
                            style={{ transition: "opacity 150ms ease-out" }}
                        />
                        {active && (
                            <path d={stretchPath(index)} fill="none" stroke={color} strokeWidth="10" opacity={0.28} strokeLinecap="round" />
                        )}
                        <path
                            d={stretchPath(index)}
                            fill="none"
                            stroke={color}
                            strokeWidth={active ? 4.2 : family ? 3 : 2}
                            strokeDasharray={family ? undefined : "5 6"}
                            strokeLinecap="round"
                            style={{ transition: "stroke-width 150ms ease-out" }}
                        />
                    </g>
                );
            })}

            {/* confirmed points of inflection, marked in red once their two neighbouring signs disagree */}
            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out", pointerEvents: "none" }}>
                {CUTS.map((cut, index) => {
                    const leftFamily = familyForStretch(index, tested);
                    const rightFamily = familyForStretch(index + 1, tested);
                    if (!leftFamily || !rightFamily || leftFamily === rightFamily) return null;
                    return (
                        <g key={`inflection-dot-${index}`}>
                            <circle
                                cx={toScreenX(cut)}
                                cy={toCurveScreenY(curveY(cut))}
                                r={9}
                                fill={INFLECTION_COLOR}
                                opacity={0.22}
                            />
                            <circle
                                cx={toScreenX(cut)}
                                cy={toCurveScreenY(curveY(cut))}
                                r={5}
                                fill={INFLECTION_COLOR}
                                stroke="#FFFFFF"
                                strokeWidth="1.5"
                            />
                        </g>
                    );
                })}
            </g>

            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                <circle cx={dotX} cy={dotY} r={dragging ? 10.5 : 9} fill={UP_COLOR} filter="url(#bend-dot-shadow)" />
                <circle
                    cx={dotX}
                    cy={dotY}
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

function BendCurveFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="bend-curve-view"
            onReset={() => reset(setVar)}
            caption="The curve, cut into four pieces at −√3, 0 and √3. A piece stays faint and dashed until its stretch has been tested, and a red dot appears at each point of inflection as soon as its two neighbouring signs disagree."
        >
            <BendCurveDrawing />
            <InteractionHintSequence
                hintKey="bend-curve-drag"
                steps={[
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the teal dot along the curve",
                        position: { x: "14%", y: "62%" },
                        dragPath: { type: "line", startOffset: { x: -8, y: 0 }, endOffset: { x: 32, y: -10 } },
                    },
                ]}
            />
        </Figure>
    );
}

/* ── View B — the bend line ──────────────────────────────────────────────── */

const LINE_HEIGHT = 160;
const TRACK_Y = 36;
const BOX_TOP = 64;
const BOX_HEIGHT = 40;
const BOX_WIDTH = 46;
const RANGE_LABEL_Y = 122;
const VERDICT_Y = 144;

function BendLineDrawing() {
    const { testX, tested, setVar, isActive, dimFor, restDim, hoverProps } = useBendState();
    const [dragging, setDragging] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    const updateFromPointer = useCallback(
        (clientX: number) => {
            const svg = svgRef.current;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const localX = ((clientX - rect.left) / rect.width) * VIEW_WIDTH;
            const mathX = X_MIN + ((localX - PAD_LEFT) / PLOT_WIDTH) * (X_MAX - X_MIN);
            setVar("bendTestX", Math.round(clamp(mathX, -3, 3) * 10) / 10);
        },
        [setVar],
    );

    const markerX = toScreenX(testX);
    const labelCentre = clamp(markerX, PAD_LEFT + 30, VIEW_WIDTH - PAD_RIGHT - 30);

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${LINE_HEIGHT}`}
            className="block w-full"
            style={{ touchAction: "none" }}
        >
            <defs>
                <filter id="bend-marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                <line
                    x1={PAD_LEFT}
                    y1={TRACK_Y}
                    x2={PAD_LEFT + PLOT_WIDTH}
                    y2={TRACK_Y}
                    stroke={RULE}
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                {CUTS.map((cut, index) => (
                    <g key={`bend-cut-${index}`}>
                        <line
                            x1={toScreenX(cut)}
                            y1={TRACK_Y - 6}
                            x2={toScreenX(cut)}
                            y2={TRACK_Y + 6}
                            stroke={STRUCTURE}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                        <text x={toScreenX(cut)} y={TRACK_Y + 20} fill={STRUCTURE} fontSize="10" textAnchor="middle">
                            {index === 0 ? "−√3" : index === 1 ? "0" : "√3"}
                        </text>
                    </g>
                ))}
                <text
                    x={labelCentre}
                    y={TRACK_Y - 16}
                    fill={INK}
                    fontSize="12"
                    textAnchor="middle"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    {`x = ${testX.toFixed(1)}`}
                </text>
                <circle cx={markerX} cy={TRACK_Y} r={dragging ? 10.5 : 9} fill={UP_COLOR} filter="url(#bend-marker-shadow)" />
                <circle
                    cx={markerX}
                    cy={TRACK_Y}
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

            {[0, 1, 2, 3].map((index) => {
                const family = familyForStretch(index, tested);
                const color = colorForFamily(family);
                const active = isActive(index);
                const centre = (toScreenX(STRETCH_EDGES[index]) + toScreenX(STRETCH_EDGES[index + 1])) / 2;
                return (
                    <g
                        key={`bend-box-${index}`}
                        opacity={dimFor(index)}
                        style={{ transition: "opacity 150ms ease-out" }}
                        {...hoverProps(index)}
                    >
                        <rect
                            x={centre - BOX_WIDTH / 2}
                            y={BOX_TOP}
                            width={BOX_WIDTH}
                            height={BOX_HEIGHT}
                            rx="6"
                            fill={family ? color : "#FFFFFF"}
                            fillOpacity={family ? (active ? 0.35 : 0.15) : 1}
                            stroke={family ? color : UNTESTED_COLOR}
                            strokeWidth={active ? 3 : 1.5}
                            style={{ transition: "stroke-width 150ms ease-out, fill-opacity 150ms ease-out" }}
                        />
                        <text
                            x={centre}
                            y={BOX_TOP + 28}
                            fill={family ? color : STRUCTURE}
                            fontSize={family ? 22 : 18}
                            fontWeight="600"
                            textAnchor="middle"
                            opacity={family ? 1 : 0.5}
                        >
                            {family === "concaveUp" ? "+" : family === "concaveDown" ? "−" : "?"}
                        </text>
                        <text x={centre} y={RANGE_LABEL_Y} fill={INK} fontSize="11" textAnchor="middle">
                            {STRETCH_LABELS[index]}
                        </text>
                    </g>
                );
            })}

            {CUTS.map((cut, index) => {
                const leftFamily = familyForStretch(index, tested);
                const rightFamily = familyForStretch(index + 1, tested);
                if (!leftFamily || !rightFamily || leftFamily === rightFamily) return null;
                return (
                    <text
                        key={`verdict-${index}`}
                        x={toScreenX(cut)}
                        y={VERDICT_Y}
                        fill={INK}
                        fontSize="10"
                        fontWeight="600"
                        textAnchor="middle"
                        opacity={restDim}
                    >
                        inflection
                    </text>
                );
            })}
        </svg>
    );
}

function BendLineFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="bend-sign-line"
            onReset={() => reset(setVar)}
            caption="Drag the teal marker into a stretch and its box fills with the sign of d²y/dx², while the matching piece of curve above firms up. Where two neighbouring signs disagree, the cut between them is a point of inflection."
        >
            <BendLineDrawing />
            <InteractionHintSequence
                hintKey="bend-line-drag"
                steps={[
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the marker into each stretch",
                        position: { x: "14%", y: "26%" },
                        dragPath: { type: "line", startOffset: { x: -10, y: 0 }, endOffset: { x: 34, y: 0 } },
                    },
                ]}
            />
        </Figure>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The marker, written as a formula. Dragging the teal number moves the marker
 * in both views, and the answer takes the colour of the bend it reports.
 * ──────────────────────────────────────────────────────────────────────────── */

function BendAtTheMarkerFormula() {
    const testX = useVar<number>("bendTestX", -3);
    const bend = secondDerivative(testX);
    return (
        <FormulaBlock
            latex={`\\left.\\frac{\\clr{termBend}{d^2y}}{\\clr{termBend}{dx^2}}\\right|_{x = \\scrub{bendTestX}} = \\clr{${signTerm(bend, 0.005)}}{${bend.toFixed(3)}}`}
            colorMap={CURVE_COLOR_MAP}
            variables={scrubVarsFromDefinitions(['bendTestX'])}
        />
    );
}

/* ──────────────────────────────────────────────────────────────────────────── */

export const whereTheBendChangesBlocks: ReactElement[] = [
    <StackLayout key="layout-bend-heading" maxWidth="xl">
        <Block id="bend-heading" padding="md">
            <EditableH2 id="h2-bend-heading" blockId="bend-heading">
                Concavity and Points of Inflection
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-setup" maxWidth="xl">
        <Block id="bend-setup" padding="sm">
            <EditableParagraph id="para-bend-setup" blockId="bend-setup">
                The{" "}
                <InlineSpotColor
                    id="spot-bend-gradient"
                    varName="termGradient"
                    {...spotColorPropsFromDefinition(getVariableInfo('termGradient'))}
                >
                    first derivative
                </InlineSpotColor>{" "}
                says which way the curve is heading; the{" "}
                <InlineSpotColor
                    id="spot-bend-second"
                    varName="termBend"
                    {...spotColorPropsFromDefinition(getVariableInfo('termBend'))}
                >
                    second
                </InlineSpotColor>{" "}
                says how that heading is changing. That is the curve's{" "}
                <InlineTooltip
                    id="tooltip-bend-concavity"
                    tooltip="Concavity is the direction a curve bends. Where the second derivative is positive the curve is concave up, holding water; where it is negative the curve is concave down."
                >
                    concavity
                </InlineTooltip>
                , and differentiating again hands us three places where it might switch.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-second-derivative" maxWidth="xl">
        <Block id="bend-second-derivative" padding="lg">
            <FormulaBlock
                latex="\frac{\clr{termBend}{d^2y}}{\clr{termBend}{dx^2}} = \frac{\clr{termTopLine}{4x(x-\sqrt3)(x+\sqrt3)}}{\clr{termBottomLine}{(1+x^2)^3}}"
                colorMap={CURVE_COLOR_MAP}
            />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-stretches" maxWidth="xl">
        <Block id="bend-stretches" padding="sm">
            <EditableParagraph id="para-bend-stretches" blockId="bend-stretches">
                So the bend is zero at{" "}
                <InlineFormula
                    id="formula-bend-candidates"
                    latex="\clr{termLevel}{x = 0}, \; \clr{termLevel}{x = \sqrt3} \; \text{ and } \; \clr{termLevel}{x = -\sqrt3}"
                    colorMap={CURVE_COLOR_MAP}
                />
                , but zero alone proves nothing. A{" "}
                <InlineTooltip
                    id="tooltip-bend-inflection"
                    tooltip="A point of inflection is where the curve changes which way it bends: concave up on one side, concave down on the other. The second derivative must change sign there, not merely reach zero."
                >
                    point of inflection
                </InlineTooltip>{" "}
                needs the bend to actually change sign, so drag the teal marker into each of the four
                stretches and watch the curve above firm up.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-curve-view" maxWidth="xl">
        <Block id="bend-visual" padding="sm" hasVisualization>
            <BendCurveFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-line-view" maxWidth="xl">
        <Block id="bend-line-visual" padding="sm" hasVisualization>
            <BendLineFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-readout" maxWidth="xl">
        <Block id="bend-readout" padding="lg">
            <BendAtTheMarkerFormula />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-reading" maxWidth="xl">
        <Block id="bend-reading" padding="sm">
            <EditableParagraph id="para-bend-reading" blockId="bend-reading">
                Wherever you leave the marker, say x ={" "}
                <InlineScrubbleNumber
                    varName="bendTestX"
                    {...numberPropsFromDefinition(getVariableInfo('bendTestX'))}
                    formatValue={(v) => v.toFixed(1)}
                />
                , the whole stretch bends the same way:{" "}
                <InlineLinkedHighlight
                    id="highlight-bend-up"
                    varName="bendHighlight"
                    highlightId="concaveUp"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('bendHighlight'))}
                >
                    concave up
                </InlineLinkedHighlight>{" "}
                where the sign is plus,{" "}
                <InlineLinkedHighlight
                    id="highlight-bend-down"
                    varName="bendHighlight"
                    highlightId="concaveDown"
                    color={CURVE_COLOR_MAP.termFalling}
                    bgColor="rgba(142, 144, 245, 0.2)"
                >
                    concave down
                </InlineLinkedHighlight>{" "}
                where it is minus. All three candidates flip, so all three really are points of
                inflection.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-question-candidate" maxWidth="xl">
        <Block id="bend-question-candidate" padding="md">
            <EditableParagraph id="para-bend-question-candidate" blockId="bend-question-candidate">
                Try the first step on a new curve. If{" "}
                <InlineFormula
                    id="formula-bend-candidate-curve"
                    latex="\clr{termCurve}{y} = x^3 - 6x^2"
                    colorMap={CURVE_COLOR_MAP}
                />
                {" "}then{" "}
                <InlineFormula
                    id="formula-bend-candidate-second"
                    latex="\frac{\clr{termBend}{d^2y}}{\clr{termBend}{dx^2}} = \clr{termTopLine}{6x - 12}"
                    colorMap={CURVE_COLOR_MAP}
                />
                , so the only candidate for a point of inflection sits at x ={" "}
                <InlineFeedback
                    varName="answerBendCandidate"
                    correctValue={["2", "x = 2", "x=2"]}
                    position="terminal"
                    successMessage="— correct. Solving 6x − 12 = 0 gives the one place where the bend could possibly turn over"
                    failureMessage="— close."
                    hint="Set 6x − 12 equal to zero and solve it the way you would any other linear equation"
                >
                    <InlineClozeInput
                        varName="answerBendCandidate"
                        correctAnswer={["2", "x = 2", "x=2"]}
                        {...clozePropsFromDefinition(getVariableInfo('answerBendCandidate'))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-question-nochange" maxWidth="xl">
        <Block id="bend-question-nochange" padding="md">
            <EditableParagraph id="para-bend-question-nochange" blockId="bend-question-nochange">
                Here is the catch. For{" "}
                <InlineFormula
                    id="formula-bend-quartic"
                    latex="\clr{termCurve}{y} = x^4"
                    colorMap={CURVE_COLOR_MAP}
                />
                {" "}the second derivative is{" "}
                <InlineFormula
                    id="formula-bend-quartic-second"
                    latex="\frac{\clr{termBend}{d^2y}}{\clr{termBend}{dx^2}} = \clr{termTopLine}{12x^2}"
                    colorMap={CURVE_COLOR_MAP}
                />
                , which is zero at x = 0, yet testing either side gives{" "}
                <InlineFormula
                    id="formula-bend-quartic-tests"
                    latex="\clr{termGradient}{+12} \text{ and } \clr{termGradient}{+12}"
                    colorMap={CURVE_COLOR_MAP}
                />
                . Across x = 0 the sign{" "}
                <InlineFeedback
                    varName="answerBendNoChange"
                    correctValue="stays the same"
                    position="terminal"
                    successMessage="— exactly, and that settles it. The bend never turns over, so x = 0 is not a point of inflection even though the second derivative vanishes there"
                    failureMessage="— look again at the two test values."
                    hint="Both tests came out as +12, so compare the two signs rather than the two positions"
                    visualizationHint={{
                        blockId: "bend-line-visual",
                        hintKey: "feedback-bend-no-change",
                        label: "Discover it yourself",
                        resetVars: { bendTestX: -3, bendHighlight: "" },
                        steps: [
                            {
                                gesture: "drag-horizontal",
                                label: "Leave the marker in the far left stretch — that box holds a minus",
                                position: { x: "18%", y: "26%" },
                                completionVar: "bendTestX",
                                completionValue: -2.5,
                                completionTolerance: 0.7,
                            },
                            {
                                gesture: "drag-horizontal",
                                label: "Drag it right past −√3 — the sign turns to a plus, and that swap is what an inflection needs",
                                position: { x: "38%", y: "26%" },
                                completionVar: "bendTestX",
                                completionValue: -1,
                                completionTolerance: 0.6,
                            },
                        ],
                    }}
                >
                    <InlineClozeChoice
                        varName="answerBendNoChange"
                        correctAnswer="stays the same"
                        options={["stays the same", "changes", "becomes zero"]}
                        {...choicePropsFromDefinition(getVariableInfo('answerBendNoChange'))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
