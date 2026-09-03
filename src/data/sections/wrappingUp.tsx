import { type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import {
    EditableH2,
    EditableParagraph,
    InlineFormula,
    InlineSpotColor,
    InlineTooltip,
} from "@/components/atoms";
import { getVariableInfo, spotColorPropsFromDefinition } from "../variables";
import { CURVE_COLOR_MAP } from "./curveColors";

export const wrappingUpBlocks: ReactElement[] = [
    <StackLayout key="layout-wrapping-up-heading" maxWidth="xl">
        <Block id="wrapping-up-heading" padding="md">
            <EditableH2 id="h2-wrapping-up-heading" blockId="wrapping-up-heading">
                Summary: The Four-Step Routine
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-wrapping-up-routine" maxWidth="xl">
        <Block id="wrapping-up-routine" padding="sm">
            <EditableParagraph id="para-wrapping-up-routine" blockId="wrapping-up-routine">
                So a curve really does describe itself. Solve{" "}
                <InlineFormula
                    id="formula-wrapping-up-stationary"
                    latex="\frac{\clr{termGradient}{dy}}{\clr{termGradient}{dx}} = \clr{termLevel}{0}"
                    colorMap={CURVE_COLOR_MAP}
                />
                {" "}for the stationary points, then apply the first derivative test to classify each
                one as a maximum, a minimum or a{" "}
                <InlineTooltip
                    id="tooltip-wrapping-up-stationary-inflection"
                    tooltip="A stationary point of inflection has dy/dx = 0, yet the gradient keeps its sign either side, so the curve pauses rather than turns."
                >
                    stationary point of inflection
                </InlineTooltip>
                .
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-wrapping-up-second-half" maxWidth="xl">
        <Block id="wrapping-up-second-half" padding="sm">
            <EditableParagraph id="para-wrapping-up-second-half" blockId="wrapping-up-second-half">
                Differentiate again and test the sign of{" "}
                <InlineFormula
                    id="formula-wrapping-up-second"
                    latex="\frac{\clr{termBend}{d^2y}}{\clr{termBend}{dx^2}}"
                    colorMap={CURVE_COLOR_MAP}
                />
                {" "}the same way to map the concavity and pin down the points of inflection. Mark the
                asymptotes last, and four steps turn an unfamiliar equation into a curve you can draw
                from memory.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-wrapping-up-next" maxWidth="xl">
        <Block id="wrapping-up-next" padding="sm">
            <EditableParagraph id="para-wrapping-up-next" blockId="wrapping-up-next">
                The routine does not care where you point it. Cubics, quartics and rational functions
                all yield to the same four steps. Next you will meet rational functions whose{" "}
                <InlineSpotColor
                    id="spot-wrapping-up-denominator"
                    varName="termBottomLine"
                    {...spotColorPropsFromDefinition(getVariableInfo('termBottomLine'))}
                >
                    denominator
                </InlineSpotColor>{" "}
                really does reach zero, where the graph breaks apart at a vertical asymptote and
                diverges to infinity.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
