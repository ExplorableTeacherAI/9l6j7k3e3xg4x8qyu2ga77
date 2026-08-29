import { useCallback, useEffect, useRef, useState } from "react";
import { Figure } from "@/components/molecules";
import { InteractionHintSequence } from "@/components/atoms";
import { useVar, useSetVar } from "@/stores";
import { clamp } from "@/lib/motion";

/* ────────────────────────────────────────────────────────────────────────────
 * A sign table the student fills in themselves.
 *
 * A draggable marker slides along a strip that is split into the same columns
 * as the table beneath it: one column per stretch of the x-axis, one narrow
 * column per critical value. Wherever the marker is dropped, that column's sign
 * of the derivative and its little tilted rod appear and stay. Once both
 * neighbours of a critical value are known, the bottom row names it.
 * ──────────────────────────────────────────────────────────────────────────── */

const POSITIVE_COLOR = "#62D0AD";
const NEGATIVE_COLOR = "#8E90F5";
const ZERO_COLOR = "#64748B";
const INK = "#334155";
const STRUCTURE = "#94A3B8";
const RULE = "#E2E8F0";

const VIEW_HEIGHT = 300;
const LABEL_RIGHT = 104;
const TABLE_X0 = 112;
const RIGHT_PAD = 24;

const HEADER_Y0 = 84;
const HEADER_Y1 = 118;
const SIGN_Y1 = 170;
const ROD_Y1 = 222;
const CONCLUSION_Y1 = 262;
const TRACK_Y = 60;

const RANGE_WEIGHT = 1.45;
const POINT_WEIGHT = 1;

export interface SignTableFigureProps {
    figureId: string;
    hintKey: string;
    /** Store variable holding the marker's x value */
    xVarName: string;
    /** Store variable holding the active highlight ("positive" | "negative" | "") */
    highlightVarName: string;
    xMin: number;
    xMax: number;
    /** Where the marker returns to on reset */
    resetX: number;
    /** The critical values, in increasing order */
    criticalPoints: number[];
    /** Column headers for the stretches, length = criticalPoints.length + 1 */
    rangeLabels: string[];
    /** Column headers for the critical values, length = criticalPoints.length */
    criticalLabels: string[];
    /** The derivative being sign-tested */
    derivative: (x: number) => number;
    /** Row label for the sign row, e.g. "Sign of dy/dx" */
    signRowLabel: string;
    /** Row label for the bottom row, e.g. "Turning point" */
    conclusionRowLabel: string;
    /** Names the critical value once both neighbouring signs are known */
    conclusionFor: (leftPositive: boolean, rightPositive: boolean) => string;
    /** Formats the live readout, e.g. (v) => `dy/dx = ${v.toFixed(2)}` */
    formatReadout: (value: number) => string;
    caption: string;
}

const textWidth = (text: string, fontSize: number) => text.length * fontSize * 0.6;

const fittedFontSize = (text: string, columnWidth: number, preferred: number) => {
    const available = columnWidth - 8;
    if (textWidth(text, preferred) <= available) return preferred;
    return Math.max(9, available / (text.length * 0.6));
};

export function SignTableFigure(props: SignTableFigureProps) {
    const {
        figureId,
        hintKey,
        xVarName,
        highlightVarName,
        xMin,
        xMax,
        resetX,
        criticalPoints,
        rangeLabels,
        criticalLabels,
        derivative,
        signRowLabel,
        conclusionRowLabel,
        conclusionFor,
        formatReadout,
        caption,
    } = props;

    const setVar = useSetVar();
    const markerX = useVar<number>(xVarName, resetX);
    const highlight = useVar<string>(highlightVarName, "");
    const [dragging, setDragging] = useState(false);
    const [tested, setTested] = useState<Record<number, number>>({});
    const svgRef = useRef<SVGSVGElement>(null);

    const criticalCount = criticalPoints.length;
    const columnCount = 2 * criticalCount + 1;
    const viewWidth = criticalCount >= 3 ? 680 : 560;
    const tableX1 = viewWidth - RIGHT_PAD;
    const tableWidth = tableX1 - TABLE_X0;

    const totalWeight = criticalCount * POINT_WEIGHT + (criticalCount + 1) * RANGE_WEIGHT;
    const unit = tableWidth / totalWeight;
    const pointWidth = unit * POINT_WEIGHT;
    const rangeWidth = unit * RANGE_WEIGHT;

    // Column pixel boundaries, and the matching x-value boundaries.
    const tolerance = (xMax - xMin) * 0.03;
    const columnEdges: number[] = [TABLE_X0];
    const xEdges: number[] = [xMin];
    for (let index = 0; index < columnCount; index += 1) {
        const isPoint = index % 2 === 1;
        columnEdges.push(columnEdges[index] + (isPoint ? pointWidth : rangeWidth));
        if (isPoint) {
            xEdges.push(criticalPoints[(index - 1) / 2] + tolerance);
        } else if (index < columnCount - 1) {
            xEdges.push(criticalPoints[index / 2] - tolerance);
        } else {
            xEdges.push(xMax);
        }
    }

    const columnIndexFor = useCallback(
        (x: number) => {
            for (let index = 0; index < columnCount; index += 1) {
                if (x <= xEdges[index + 1] + 1e-9) return index;
            }
            return columnCount - 1;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [columnCount, xEdges.join(",")],
    );

    const positionForX = (x: number) => {
        const index = columnIndexFor(x);
        const spanX = xEdges[index + 1] - xEdges[index];
        const ratio = spanX <= 0 ? 0.5 : (x - xEdges[index]) / spanX;
        return columnEdges[index] + clamp(ratio, 0, 1) * (columnEdges[index + 1] - columnEdges[index]);
    };

    const xForPosition = (position: number) => {
        const clamped = clamp(position, TABLE_X0, tableX1);
        for (let index = 0; index < columnCount; index += 1) {
            if (clamped <= columnEdges[index + 1] + 1e-9) {
                const ratio = (clamped - columnEdges[index]) / (columnEdges[index + 1] - columnEdges[index]);
                return xEdges[index] + ratio * (xEdges[index + 1] - xEdges[index]);
            }
        }
        return xMax;
    };

    useEffect(() => {
        const index = columnIndexFor(markerX);
        setTested((previous) => (index in previous ? previous : { ...previous, [index]: markerX }));
    }, [markerX, columnIndexFor]);

    const updateFromPointer = useCallback(
        (clientX: number) => {
            const svg = svgRef.current;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const localX = ((clientX - rect.left) / rect.width) * viewWidth;
            const nextX = xForPosition(localX);
            setVar(xVarName, Math.round(clamp(nextX, xMin, xMax) * 10) / 10);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [setVar, xVarName, viewWidth, xMin, xMax],
    );

    const familyFor = (index: number) => {
        if (index % 2 === 1) return "zero";
        const testedAt = tested[index];
        if (testedAt === undefined) return null;
        return derivative(testedAt) > 0 ? "positive" : "negative";
    };

    const colorFor = (family: string | null) =>
        family === "positive" ? POSITIVE_COLOR : family === "negative" ? NEGATIVE_COLOR : ZERO_COLOR;

    const dimFor = (family: string | null) => (highlight && highlight !== family ? 0.32 : 1);
    const restDim = highlight ? 0.32 : 1;

    const markerPosition = positionForX(markerX);
    const markerValue = derivative(markerX);
    const labelCentre = clamp(markerPosition, TABLE_X0 + 34, tableX1 - 34);

    return (
        <Figure
            id={figureId}
            onReset={() => {
                setVar(xVarName, resetX);
                setVar(highlightVarName, "");
                setTested({});
            }}
            caption={caption}
        >
            <svg
                ref={svgRef}
                viewBox={`0 0 ${viewWidth} ${VIEW_HEIGHT}`}
                className="block w-full"
                style={{ touchAction: "none" }}
            >
                <defs>
                    <filter id={`${figureId}-marker-shadow`} x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                    </filter>
                </defs>

                {/* highlighted columns sit behind everything */}
                {Array.from({ length: columnCount }, (_, index) => {
                    const family = familyFor(index);
                    if (!highlight || family !== highlight) return null;
                    return (
                        <rect
                            key={`highlight-${index}`}
                            x={columnEdges[index]}
                            y={HEADER_Y0}
                            width={columnEdges[index + 1] - columnEdges[index]}
                            height={CONCLUSION_Y1 - HEADER_Y0}
                            fill={colorFor(family)}
                            opacity={0.16}
                        />
                    );
                })}

                {/* live readout and the marker */}
                <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                    <text x={16} y={26} fill={colorFor(markerValue > 0 ? "positive" : markerValue < 0 ? "negative" : "zero")} fontSize="12" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatReadout(markerValue)}
                    </text>
                    <text x={16} y={TRACK_Y + 4} fill={STRUCTURE} fontSize="11" >
                        Test value
                    </text>
                    <line
                        x1={TABLE_X0}
                        y1={TRACK_Y}
                        x2={tableX1}
                        y2={TRACK_Y}
                        stroke={RULE}
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    {criticalPoints.map((critical) => (
                        <line
                            key={`track-tick-${critical}`}
                            x1={positionForX(critical)}
                            y1={TRACK_Y - 5}
                            x2={positionForX(critical)}
                            y2={TRACK_Y + 5}
                            stroke={STRUCTURE}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    ))}
                    <text
                        x={labelCentre}
                        y={TRACK_Y - 16}
                        fill={INK}
                        fontSize="12"
                        textAnchor="middle"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {`x = ${markerX.toFixed(1)}`}
                    </text>
                    <circle
                        cx={markerPosition}
                        cy={TRACK_Y}
                        r={dragging ? 10.5 : 9}
                        fill={POSITIVE_COLOR}
                        filter={`url(#${figureId}-marker-shadow)`}
                    />
                    <circle
                        cx={markerPosition}
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

                {/* row labels */}
                <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                    <text x={LABEL_RIGHT} y={(HEADER_Y0 + HEADER_Y1) / 2 + 4} fill={STRUCTURE} fontSize="11" textAnchor="end">
                        Range
                    </text>
                    <text x={LABEL_RIGHT} y={(HEADER_Y1 + SIGN_Y1) / 2 + 4} fill={STRUCTURE} fontSize="11" textAnchor="end">
                        {signRowLabel}
                    </text>
                    <text x={LABEL_RIGHT} y={(SIGN_Y1 + ROD_Y1) / 2 + 4} fill={STRUCTURE} fontSize="11" textAnchor="end">
                        Gradient
                    </text>
                    <text x={LABEL_RIGHT} y={(ROD_Y1 + CONCLUSION_Y1) / 2 + 4} fill={STRUCTURE} fontSize="11" textAnchor="end">
                        {conclusionRowLabel}
                    </text>
                </g>

                {/* grid rules */}
                <g opacity={restDim} style={{ transition: "opacity 150ms ease-out" }}>
                    <line x1={TABLE_X0} y1={HEADER_Y1} x2={tableX1} y2={HEADER_Y1} stroke={RULE} strokeWidth="1.5" />
                    <line x1={TABLE_X0} y1={ROD_Y1} x2={tableX1} y2={ROD_Y1} stroke={RULE} strokeWidth="1.5" />
                    {columnEdges.slice(1, -1).map((edge) => (
                        <line
                            key={`divider-${edge}`}
                            x1={edge}
                            y1={HEADER_Y0}
                            x2={edge}
                            y2={CONCLUSION_Y1}
                            stroke={RULE}
                            strokeWidth="1.5"
                        />
                    ))}
                </g>

                {/* the columns themselves */}
                {Array.from({ length: columnCount }, (_, index) => {
                    const isPoint = index % 2 === 1;
                    const left = columnEdges[index];
                    const width = columnEdges[index + 1] - left;
                    const centre = left + width / 2;
                    const family = familyFor(index);
                    const isTested = index in tested;
                    const heading = isPoint ? criticalLabels[(index - 1) / 2] : rangeLabels[index / 2];
                    const headingSize = fittedFontSize(heading, width, 12);
                    const color = colorFor(family);
                    const active = Boolean(highlight) && family === highlight;

                    let conclusion: string | null = null;
                    if (isPoint) {
                        const leftFamily = familyFor(index - 1);
                        const rightFamily = familyFor(index + 1);
                        if (leftFamily && rightFamily) {
                            conclusion = conclusionFor(leftFamily === "positive", rightFamily === "positive");
                        }
                    }
                    const conclusionSize = conclusion ? fittedFontSize(conclusion, width, 11) : 11;

                    const rodHalf = Math.min(22, width * 0.3);
                    const rodTilt = family === "positive" ? -0.45 : family === "negative" ? 0.45 : 0;
                    const rodY = (SIGN_Y1 + ROD_Y1) / 2;

                    return (
                        <g
                            key={`column-${index}`}
                            opacity={dimFor(family)}
                            style={{ transition: "opacity 150ms ease-out" }}
                            onPointerEnter={() => {
                                if (family === "positive" || family === "negative") setVar(highlightVarName, family);
                            }}
                            onPointerLeave={() => setVar(highlightVarName, "")}
                        >
                            <rect
                                x={left}
                                y={HEADER_Y0}
                                width={width}
                                height={CONCLUSION_Y1 - HEADER_Y0}
                                fill="transparent"
                            />
                            <text x={centre} y={(HEADER_Y0 + HEADER_Y1) / 2 + 4} fill={INK} fontSize={headingSize} textAnchor="middle">
                                {heading}
                            </text>

                            {isTested ? (
                                <>
                                    <text
                                        x={centre}
                                        y={(HEADER_Y1 + SIGN_Y1) / 2 + 8}
                                        fill={color}
                                        fontSize={active ? 26 : 23}
                                        fontWeight="600"
                                        textAnchor="middle"
                                        style={{ transition: "font-size 150ms ease-out" }}
                                    >
                                        {family === "positive" ? "+" : family === "negative" ? "−" : "0"}
                                    </text>
                                    {active && (
                                        <line
                                            x1={centre - rodHalf}
                                            y1={rodY + rodHalf * rodTilt}
                                            x2={centre + rodHalf}
                                            y2={rodY - rodHalf * rodTilt}
                                            stroke={color}
                                            strokeWidth="9"
                                            opacity={0.28}
                                            strokeLinecap="round"
                                        />
                                    )}
                                    <line
                                        x1={centre - rodHalf}
                                        y1={rodY + rodHalf * rodTilt}
                                        x2={centre + rodHalf}
                                        y2={rodY - rodHalf * rodTilt}
                                        stroke={color}
                                        strokeWidth={active ? 4.2 : 2.8}
                                        strokeLinecap="round"
                                        style={{ transition: "stroke-width 150ms ease-out" }}
                                    />
                                </>
                            ) : (
                                <text
                                    x={centre}
                                    y={(HEADER_Y1 + SIGN_Y1) / 2 + 8}
                                    fill={STRUCTURE}
                                    fontSize="22"
                                    textAnchor="middle"
                                    opacity={0.4}
                                >
                                    ?
                                </text>
                            )}

                            {conclusion && (
                                <text
                                    x={centre}
                                    y={(ROD_Y1 + CONCLUSION_Y1) / 2 + 4}
                                    fill={INK}
                                    fontSize={conclusionSize}
                                    fontWeight="600"
                                    textAnchor="middle"
                                >
                                    {conclusion}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            <InteractionHintSequence
                hintKey={hintKey}
                steps={[
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the teal marker into each stretch",
                        position: { x: "22%", y: "22%" },
                        dragPath: { type: "line", startOffset: { x: -12, y: 0 }, endOffset: { x: 34, y: 0 } },
                    },
                ]}
            />
        </Figure>
    );
}
