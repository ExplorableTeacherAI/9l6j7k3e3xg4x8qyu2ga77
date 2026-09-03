import { type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import {
    EditableH1,
    EditableParagraph,
    InlineFormula,
    InlineSpotColor,
    InlineTooltip,
} from "@/components/atoms";
import { getVariableInfo, spotColorPropsFromDefinition } from "../variables";
import { CURVE_COLOR_MAP } from "./curveColors";

export const lessonIntroductionBlocks: ReactElement[] = [
    <StackLayout key="layout-introduction-title" maxWidth="xl">
        <Block id="introduction-title" padding="md">
            <EditableH1 id="h1-introduction-title" blockId="introduction-title">
                Curve Sketching Using the First and Second Derivatives
            </EditableH1>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-introduction-hook" maxWidth="xl">
        <Block id="introduction-hook" padding="sm">
            <EditableParagraph id="para-introduction-hook" blockId="introduction-hook">
                Here is a curve nobody has plotted yet:{" "}
                <InlineFormula
                    id="formula-introduction-curve"
                    latex="\clr{termCurve}{y} = \frac{\clr{termTopLine}{2x}}{\clr{termBottomLine}{1 + x^2}}"
                    colorMap={CURVE_COLOR_MAP}
                />
                . No table of values, no calculator, no forty points joined up with a ruler. By the
                end of this lesson you will draw its shape from the equation alone, and you will know
                the shape is right.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-introduction-promise" maxWidth="xl">
        <Block id="introduction-promise" padding="sm">
            <EditableParagraph id="para-introduction-promise" blockId="introduction-promise">
                The trick is to let the curve describe itself. The{" "}
                <InlineSpotColor
                    id="spot-introduction-gradient"
                    varName="termGradient"
                    {...spotColorPropsFromDefinition(getVariableInfo('termGradient'))}
                >
                    first derivative
                </InlineSpotColor>{" "}
                reports where it climbs, where it falls and where it goes flat. The{" "}
                <InlineSpotColor
                    id="spot-introduction-bend"
                    varName="termBend"
                    {...spotColorPropsFromDefinition(getVariableInfo('termBend'))}
                >
                    second
                </InlineSpotColor>{" "}
                reports which way it bends. Those two colours follow you through every figure ahead.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-introduction-prerequisites" maxWidth="xl">
        <Block id="introduction-prerequisites" padding="sm">
            <EditableParagraph id="para-introduction-prerequisites" blockId="introduction-prerequisites">
                You can already differentiate with the{" "}
                <InlineTooltip
                    id="tooltip-introduction-quotient-rule"
                    tooltip="For y = u/v, the derivative is (v·du/dx − u·dv/dx) / v². It turns any fraction into a new fraction whose bottom line is a square."
                >
                    quotient rule
                </InlineTooltip>
                , factorise an expression and solve it for zero, and test whether an expression comes
                out positive or negative. Those three skills are everything this needs.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
