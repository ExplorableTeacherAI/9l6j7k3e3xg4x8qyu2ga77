import { type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import { EditableH2, EditableParagraph } from "@/components/atoms";

export const wrappingUpBlocks: ReactElement[] = [
    <StackLayout key="layout-wrapping-up-heading" maxWidth="xl">
        <Block id="wrapping-up-heading" padding="md">
            <EditableH2 id="h2-wrapping-up-heading" blockId="wrapping-up-heading">
                Wrapping Up
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-wrapping-up-routine" maxWidth="xl">
        <Block id="wrapping-up-routine" padding="sm">
            <EditableParagraph id="para-wrapping-up-routine" blockId="wrapping-up-routine">
                So a curve really does describe itself. Differentiate once and solve for zero to find
                the flat points, then test the sign either side to learn whether each one is a
                hilltop or a valley.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-wrapping-up-second-half" maxWidth="xl">
        <Block id="wrapping-up-second-half" padding="sm">
            <EditableParagraph id="para-wrapping-up-second-half" blockId="wrapping-up-second-half">
                Differentiate again and test the sign the same way to find where the bend changes.
                Four questions, and an equation you had never seen becomes a curve you can draw from
                memory.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-wrapping-up-next" maxWidth="xl">
        <Block id="wrapping-up-next" padding="sm">
            <EditableParagraph id="para-wrapping-up-next" blockId="wrapping-up-next">
                The routine does not care where you point it. Cubics, quartics and rational functions
                all fall to the same four questions. Next you will meet curves whose bottom line does
                hit zero, where the graph tears apart at a vertical asymptote and races off to
                infinity.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
