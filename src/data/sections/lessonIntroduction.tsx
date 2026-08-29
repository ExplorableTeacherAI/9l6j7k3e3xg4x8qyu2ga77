import { type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import { EditableH1, EditableParagraph } from "@/components/atoms";

export const lessonIntroductionBlocks: ReactElement[] = [
    <StackLayout key="layout-introduction-title" maxWidth="xl">
        <Block id="introduction-title" padding="md">
            <EditableH1 id="h1-introduction-title" blockId="introduction-title">
                Drawing Graphs Using Differentiation
            </EditableH1>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-introduction-hook" maxWidth="xl">
        <Block id="introduction-hook" padding="sm">
            <EditableParagraph id="para-introduction-hook" blockId="introduction-hook">
                Here is a curve nobody has plotted yet: y = 2x / (1 + x²). No table of values, no
                calculator, no forty points joined up with a ruler. By the end of this lesson you
                will draw its shape from the equation alone, and you will know the shape is right.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-introduction-promise" maxWidth="xl">
        <Block id="introduction-promise" padding="sm">
            <EditableParagraph id="para-introduction-promise" blockId="introduction-promise">
                The trick is to let the curve describe itself. The first derivative reports where it
                climbs, where it falls and where it goes flat. The second reports which way it bends.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-introduction-prerequisites" maxWidth="xl">
        <Block id="introduction-prerequisites" padding="sm">
            <EditableParagraph id="para-introduction-prerequisites" blockId="introduction-prerequisites">
                You can already differentiate with the quotient rule, factorise an expression and
                solve it for zero, and test whether an expression comes out positive or negative.
                Those three skills are everything this needs.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
