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
} from "@/components/atoms";
import { FormulaBlock } from "@/components/molecules";
import {
    getVariableInfo,
    numberPropsFromDefinition,
    clozePropsFromDefinition,
    choicePropsFromDefinition,
    linkedHighlightPropsFromDefinition,
} from "../variables";
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

export const testingTheSignBlocks: ReactElement[] = [
    <StackLayout key="layout-sign-test-heading" maxWidth="xl">
        <Block id="sign-test-heading" padding="md">
            <EditableH2 id="h2-sign-test-heading" blockId="sign-test-heading">
                Testing the Sign Either Side
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-test-setup" maxWidth="xl">
        <Block id="sign-test-setup" padding="sm">
            <EditableParagraph id="para-sign-test-setup" blockId="sign-test-setup">
                Finding where a curve flattens is only half of finding a turning point. The only way
                to tell a hilltop from a valley floor is to check the gradient on both sides of it.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-test-derivative" maxWidth="xl">
        <Block id="sign-test-derivative" padding="lg">
            <FormulaBlock latex="\frac{dy}{dx} = \frac{-2(x-1)(x+1)}{(1+x^2)^2}" />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-test-stretches" maxWidth="xl">
        <Block id="sign-test-stretches" padding="sm">
            <EditableParagraph id="para-sign-test-stretches" blockId="sign-test-stretches">
                The bottom of that fraction is a square, so it is positive whatever x is. All the sign
                information lives in −2(x − 1)(x + 1). Drag the teal marker into each stretch and let
                the table fill itself in.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-test-visual" maxWidth="xl">
        <Block id="sign-test-visual" padding="sm" hasVisualization>
            <GradientSignTable />
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
                    color="#8E90F5"
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
                A student meets a new curve with dy/dx = 3(x − 2)(x + 4), finds it flat at x = 2, and
                writes down "maximum" without testing. Putting x = 0 in gives 3(−2)(4) = −24, and
                putting x = 3 in gives 3(1)(7) = +21. Falling and then climbing means x = 2 is really
                a{" "}
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
                Now a stranger case. A curve has dy/dx = (x − 4)², which is flat at x = 4, and testing
                x = 3 gives (−1)² and testing x = 5 gives (1)². Both of those come out{" "}
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
