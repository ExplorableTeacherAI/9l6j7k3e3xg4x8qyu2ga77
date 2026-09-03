import { type ReactElement } from "react";
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
} from "@/components/atoms";
import { FormulaBlock } from "@/components/molecules";
import { useVar } from "@/stores";
import {
    getVariableInfo,
    numberPropsFromDefinition,
    clozePropsFromDefinition,
    choicePropsFromDefinition,
    linkedHighlightPropsFromDefinition,
    spotColorPropsFromDefinition,
    scrubVarsFromDefinitions,
} from "../variables";
import { CURVE_COLOR_MAP, ANSWER_COLOR, ANSWER_BG_COLOR, signTerm } from "./curveColors";
import { SignTableFigure } from "./signTableFigure";

const firstDerivative = (x: number) => (2 - 2 * x * x) / Math.pow(1 + x * x, 2);

function GradientSignTable() {
    return (
        <SignTableFigure
            figureId="gradient-sign-table"
            hintKey="gradient-sign-table-drag"
            xVarName="signTestX"
            highlightVarName="signTestHighlight"
            xMin={-3}
            xMax={3}
            resetX={-3}
            criticalPoints={[-1, 1]}
            rangeLabels={["x < −1", "−1 < x < 1", "x > 1"]}
            criticalLabels={["x = −1", "x = 1"]}
            derivative={firstDerivative}
            signRowLabel="Sign of dy/dx"
            conclusionRowLabel="Turning point"
            conclusionFor={(leftPositive, rightPositive) => {
                if (leftPositive === rightPositive) return "no turn";
                return leftPositive ? "maximum" : "minimum";
            }}
            formatReadout={(value) => `dy/dx = ${value.toFixed(2)}`}
            caption="Drag the teal marker into a stretch and that column fills in: the sign of dy/dx and a rod tilted the way the curve leans. Once both sides of a flat point are known, the bottom row names it."
        />
    );
}

function TopLineAtTheMarkerFormula() {
    const testX = useVar<number>("signTestX", -3);
    const topLine = -2 * (testX - 1) * (testX + 1);
    return (
        <FormulaBlock
            latex={`\\left.\\clr{termTopLine}{-2(x-1)(x+1)}\\right|_{x = \\scrub{signTestX}} = \\clr{${signTerm(topLine, 0.03)}}{${topLine.toFixed(2)}}`}
            colorMap={CURVE_COLOR_MAP}
            variables={scrubVarsFromDefinitions(['signTestX'])}
        />
    );
}

export const testingTheSignBlocks: ReactElement[] = [
    <StackLayout key="layout-sign-test-heading" maxWidth="xl">
        <Block id="sign-test-heading" padding="md">
            <EditableH2 id="h2-sign-test-heading" blockId="sign-test-heading">
                The First Derivative Test
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-test-setup" maxWidth="xl">
        <Block id="sign-test-setup" padding="sm">
            <EditableParagraph id="para-sign-test-setup" blockId="sign-test-setup">
                Locating a stationary point is only half the job. The{" "}
                <InlineTooltip
                    id="tooltip-sign-test-first-derivative-test"
                    tooltip="The first derivative test classifies a stationary point from the sign of dy/dx immediately either side of it: plus then minus is a maximum, minus then plus is a minimum, and no change at all is a stationary point of inflection."
                >
                    first derivative test
                </InlineTooltip>{" "}
                settles which kind it is, by reading the sign of the gradient immediately either
                side.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-test-derivative" maxWidth="xl">
        <Block id="sign-test-derivative" padding="lg">
            <FormulaBlock
                latex="\frac{\clr{termGradient}{dy}}{\clr{termGradient}{dx}} = \frac{\clr{termTopLine}{-2(x-1)(x+1)}}{\clr{termBottomLine}{(1+x^2)^2}}"
                colorMap={CURVE_COLOR_MAP}
            />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-test-bottom-line" maxWidth="xl">
        <Block id="sign-test-bottom-line" padding="lg">
            <FormulaBlock
                latex="\clr{termBottomLine}{(1+x^2)^2} \;\text{ is always }\; \choice{signTestBottomSign} \;\text{ for every value of } x"
                colorMap={CURVE_COLOR_MAP}
                clozeChoices={{
                    signTestBottomSign: {
                        correctAnswer: 'positive',
                        options: ['positive', 'negative', 'zero'],
                        placeholder: '???',
                        color: ANSWER_COLOR,
                        bgColor: ANSWER_BG_COLOR,
                    },
                }}
            />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-test-stretches" maxWidth="xl">
        <Block id="sign-test-stretches" padding="sm">
            <EditableParagraph id="para-sign-test-stretches" blockId="sign-test-stretches">
                The{" "}
                <InlineSpotColor
                    id="spot-sign-test-bottom-line"
                    varName="termBottomLine"
                    {...spotColorPropsFromDefinition(getVariableInfo('termBottomLine'))}
                >
                    bottom line
                </InlineSpotColor>{" "}
                is a square, so it can never flip the sign of anything. That leaves all the sign
                information in the{" "}
                <InlineSpotColor
                    id="spot-sign-test-top-line"
                    varName="termTopLine"
                    {...spotColorPropsFromDefinition(getVariableInfo('termTopLine'))}
                >
                    top line
                </InlineSpotColor>
                . Drag the teal marker into each stretch and let the table fill itself in.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-test-visual" maxWidth="xl">
        <Block id="sign-test-visual" padding="sm" hasVisualization>
            <GradientSignTable />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-test-top-line-readout" maxWidth="xl">
        <Block id="sign-test-top-line-readout" padding="lg">
            <TopLineAtTheMarkerFormula />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-test-reading" maxWidth="xl">
        <Block id="sign-test-reading" padding="sm">
            <EditableParagraph id="para-sign-test-reading" blockId="sign-test-reading">
                Drop the marker anywhere, say x ={" "}
                <InlineScrubbleNumber
                    varName="signTestX"
                    {...numberPropsFromDefinition(getVariableInfo('signTestX'))}
                    formatValue={(v) => v.toFixed(1)}
                />
                , and the sign holds right across that stretch. A{" "}
                <InlineLinkedHighlight
                    id="highlight-sign-test-negative"
                    varName="signTestHighlight"
                    highlightId="negative"
                    color={CURVE_COLOR_MAP.termFalling}
                    bgColor="rgba(142, 144, 245, 0.2)"
                >
                    minus
                </InlineLinkedHighlight>{" "}
                means the curve is falling and a{" "}
                <InlineLinkedHighlight
                    id="highlight-sign-test-positive"
                    varName="signTestHighlight"
                    highlightId="positive"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('signTestHighlight'))}
                >
                    plus
                </InlineLinkedHighlight>{" "}
                means it is climbing. Read the three signs in order and each flat point names itself.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-test-question-classify" maxWidth="xl">
        <Block id="sign-test-question-classify" padding="md">
            <EditableParagraph id="para-sign-test-question-classify" blockId="sign-test-question-classify">
                A student meets a new curve with{" "}
                <InlineFormula
                    id="formula-sign-test-classify-derivative"
                    latex="\frac{\clr{termGradient}{dy}}{\clr{termGradient}{dx}} = \clr{termTopLine}{3(x-2)(x+4)}"
                    colorMap={CURVE_COLOR_MAP}
                />
                , finds it flat at x = 2, and writes down{" "}
                <InlineTooltip
                    id="tooltip-sign-test-maximum"
                    tooltip="A maximum is a turning point the curve climbs into and falls away from: the gradient runs positive, then zero, then negative."
                >
                    maximum
                </InlineTooltip>{" "}
                without testing. Putting x = 0 in gives{" "}
                <InlineFormula
                    id="formula-sign-test-classify-left"
                    latex="3(-2)(4) = \clr{termFalling}{-24}"
                    colorMap={CURVE_COLOR_MAP}
                />
                , and putting x = 3 in gives{" "}
                <InlineFormula
                    id="formula-sign-test-classify-right"
                    latex="3(1)(7) = \clr{termGradient}{+21}"
                    colorMap={CURVE_COLOR_MAP}
                />
                . Falling and then climbing means x = 2 is really a{" "}
                <InlineFeedback
                    varName="answerSignTestClassify"
                    correctValue={["minimum", "a minimum", "min"]}
                    position="terminal"
                    successMessage="— exactly. The sign runs minus then plus, so the curve drops into x = 2 and climbs back out of it, which is the bottom of a valley"
                    failureMessage="— have another look."
                    hint="Sketch the two gradients in order: the curve is heading downhill at x = 0 and uphill at x = 3, so what happened in between"
                    visualizationHint={{
                        blockId: "sign-test-visual",
                        hintKey: "feedback-sign-test-classify",
                        label: "Discover it yourself",
                        resetVars: { signTestX: 0, signTestHighlight: "" },
                        steps: [
                            {
                                gesture: "drag-horizontal",
                                label: "Drag the marker left into the far stretch — the sign turns to a minus",
                                position: { x: "26%", y: "22%" },
                                completionVar: "signTestX",
                                completionValue: -2,
                                completionTolerance: 0.7,
                            },
                            {
                                gesture: "drag-horizontal",
                                label: "Now drag it back to the middle stretch — minus then plus is a valley, not a peak",
                                position: { x: "52%", y: "22%" },
                                completionVar: "signTestX",
                                completionValue: 0,
                                completionTolerance: 0.5,
                            },
                        ],
                    }}
                >
                    <InlineClozeInput
                        varName="answerSignTestClassify"
                        correctAnswer={["minimum", "a minimum", "min"]}
                        {...clozePropsFromDefinition(getVariableInfo('answerSignTestClassify'))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-test-question-repeated" maxWidth="xl">
        <Block id="sign-test-question-repeated" padding="md">
            <EditableParagraph id="para-sign-test-question-repeated" blockId="sign-test-question-repeated">
                Now a stranger case. A curve has{" "}
                <InlineFormula
                    id="formula-sign-test-repeated-derivative"
                    latex="\frac{\clr{termGradient}{dy}}{\clr{termGradient}{dx}} = \clr{termTopLine}{(x-4)^2}"
                    colorMap={CURVE_COLOR_MAP}
                />
                , which is flat at x = 4, and testing either side gives{" "}
                <InlineFormula
                    id="formula-sign-test-repeated-tests"
                    latex="\clr{termTopLine}{(-1)^2} \text{ and } \clr{termTopLine}{(1)^2}"
                    colorMap={CURVE_COLOR_MAP}
                />
                . Both of those come out{" "}
                <InlineFeedback
                    varName="answerSignTestRepeated"
                    correctValue="positive"
                    position="terminal"
                    successMessage="— right, and that is the point. A square can never be negative, so the sign never changes and the curve simply pauses at x = 4 before carrying on uphill"
                    failureMessage="— think again."
                    hint="Squaring −1 and squaring 1 both land in the same place, so what does that do to the sign of the gradient"
                >
                    <InlineClozeChoice
                        varName="answerSignTestRepeated"
                        correctAnswer="positive"
                        options={["positive", "negative", "zero"]}
                        {...choicePropsFromDefinition(getVariableInfo('answerSignTestRepeated'))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
