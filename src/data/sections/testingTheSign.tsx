import { type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import { EditableH2, EditableParagraph } from "@/components/atoms";
import { FormulaBlock } from "@/components/molecules";
import { VisualOptionCards } from "@/components/organisms";

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
                The bottom of that fraction is a square, so it is positive no matter what x is. All
                the sign information lives in −2(x − 1)(x + 1), and the two turning points cut the
                x-axis into three stretches: x &lt; −1, then −1 &lt; x &lt; 1, then x &gt; 1.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-test-visual" maxWidth="xl">
        <Block id="sign-test-visual" padding="sm">
            <VisualOptionCards
                blockId="sign-test-visual"
                cards={[
                    {
                        id: "commit-peak-or-valley",
                        title: "Two flat points on an empty grid, with the curve between them still missing",
                        looks: "Imagine a grid holding nothing but two marked flat points at (−1, −1) and (1, 1), with no curve joining them. Once a choice of hilltop or valley is made at each one, a curve appears to match that choice, and a small rod can be dropped anywhere to show the real gradient there.",
                        manipulate: "Choose hilltop or valley at each flat point, then drop the test rod into each stretch to see whether the real gradient agrees",
                        reveals: "A flat point on its own cannot tell you which it is, and the gradient either side settles it every time",
                        targetsMisconception: "Students find turning points but never test the sign either side",
                        paradigm: "prediction",
                        recommended: true,
                    },
                    {
                        id: "sign-line-under-curve",
                        title: "A number line cut at −1 and 1, with three empty sign boxes above the curve",
                        looks: "Imagine the x-axis stretched out beneath the curve with cuts at −1 and 1, leaving three stretches, each carrying an empty box. Dropping a test value into a stretch fills its box with a plus or a minus, and the matching piece of the curve above it darkens at the same moment.",
                        manipulate: "Drag a test value into each of the three stretches and watch its sign box and its piece of the curve fill in",
                        reveals: "One sign per stretch is enough to describe the whole stretch, and the pattern minus, plus, minus is the shape of the curve",
                        paradigm: "constructivist",
                        secondView: {
                            shows: "The curve itself, with the stretch matching the filled sign box darkening",
                            role: "constructing",
                            syncedBy: "signTestStretchResults, plus a shared hover highlight linking each box to its piece of the curve",
                        },
                    },
                    {
                        id: "rods-either-side",
                        title: "Two rods resting on the curve, one on each side of the same flat point",
                        looks: "Imagine the curve with a pair of short straight rods lying on it, one to the left of a flat point and one to the right. Each rod tilts to match the steepness where it sits, and each carries a small reading of the gradient at that spot.",
                        manipulate: "Slide the pair of rods nearer to and further from the flat point and compare which way each one tilts",
                        reveals: "At a hilltop the left rod tilts up and the right one tilts down, and at a valley it is the other way round",
                        paradigm: "comparison",
                    },
                ]}
            />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-test-reading" maxWidth="xl">
        <Block id="sign-test-reading" padding="sm">
            <EditableParagraph id="para-sign-test-reading" blockId="sign-test-reading">
                Pick any x inside a stretch and the sign of dy/dx is the same right across it.
                Negative means the curve is falling, positive means it is climbing. Read the three
                signs in order and each turning point names itself.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
