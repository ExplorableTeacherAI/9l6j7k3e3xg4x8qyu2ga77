import { type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import { EditableH2, EditableParagraph } from "@/components/atoms";
import { FormulaBlock } from "@/components/molecules";
import { VisualOptionCards } from "@/components/organisms";

export const findingFlatPointsBlocks: ReactElement[] = [
    <StackLayout key="layout-flat-points-heading" maxWidth="xl">
        <Block id="flat-points-heading" padding="md">
            <EditableH2 id="h2-flat-points-heading" blockId="flat-points-heading">
                Where the Curve Flattens
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-flat-points-setup" maxWidth="xl">
        <Block id="flat-points-setup" padding="sm">
            <EditableParagraph id="para-flat-points-setup" blockId="flat-points-setup">
                A curve goes flat exactly where its gradient is zero, so the hunt for turning points
                starts by differentiating and solving dy/dx = 0. For y = 2x / (1 + x²) the quotient
                rule gives a fraction, and factorising the top makes the zeros jump straight out.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-flat-points-derivative" maxWidth="xl">
        <Block id="flat-points-derivative" padding="lg">
            <FormulaBlock latex="\frac{dy}{dx} = \frac{2(1+x^2) - 2x(2x)}{(1+x^2)^2} = \frac{-2(x-1)(x+1)}{(1+x^2)^2}" />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-flat-points-zeros" maxWidth="xl">
        <Block id="flat-points-zeros" padding="sm">
            <EditableParagraph id="para-flat-points-zeros" blockId="flat-points-zeros">
                A fraction is zero only when its top is zero, so x = 1 or x = −1. The bottom,
                (1 + x²)², is a square that never reaches zero, which tells us this curve has no
                vertical asymptotes anywhere.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-flat-points-visual" maxWidth="xl">
        <Block id="flat-points-visual" padding="sm">
            <VisualOptionCards
                blockId="flat-points-visual"
                cards={[
                    {
                        id: "tangent-rod-with-gradient-graph",
                        title: "A curve with a tilting rod resting on it, and the gradient graph it draws underneath",
                        looks: "Imagine the curve y = 2x/(1 + x²) with a short straight rod balanced on it at one point, tilting to match how steep the curve is there. Underneath, a second graph plots that steepness against x, drawing the gradient curve as the rod travels.",
                        manipulate: "Slide the rod along the curve and stop it wherever it sits perfectly level",
                        reveals: "The rod is level at exactly two spots, and those are the two places where the gradient graph underneath crosses zero",
                        paradigm: "conventional",
                        recommended: true,
                        secondView: {
                            shows: "A graph of dy/dx against x, with a marker at the rod's current position",
                            role: "complementary",
                            syncedBy: "flatPointsTouchX, plus a shared hover highlight on the two zero crossings",
                        },
                    },
                    {
                        id: "plant-the-flags",
                        title: "A curve with two flags students plant where they think it goes flat",
                        looks: "Imagine the curve drawn plainly on a grid, with two small flags parked at the side waiting to be used. Wherever a flag is planted on the curve, a short straight rod appears there, tilted to match the steepness of the curve at that exact spot.",
                        manipulate: "Plant the two flags where they think the curve stops climbing and turns back",
                        reveals: "Only two places on the whole curve leave the rod level, and every other guess leaves it visibly tilted",
                        paradigm: "prediction",
                    },
                    {
                        id: "walking-dot-arrow-trail",
                        title: "A dot walking along the curve, leaving behind an arrow at every step",
                        looks: "Imagine a dot sitting on the curve at the far left. As it is dragged to the right it leaves a trail of short arrows behind it, each one pointing the way the curve was heading at that spot: tilted up where it climbs, tilted down where it falls.",
                        manipulate: "Drag the dot the whole way across and watch where the trail of arrows changes from pointing down to pointing up",
                        reveals: "The arrows swap direction only at the flat points, so the flat points are the borders between falling and climbing",
                        paradigm: "temporal",
                    },
                ]}
            />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-flat-points-coordinates" maxWidth="xl">
        <Block id="flat-points-coordinates" padding="sm">
            <EditableParagraph id="para-flat-points-coordinates" blockId="flat-points-coordinates">
                Putting x = 1 and x = −1 back into the original equation gives the two flat points:
                (1, 1) and (−1, −1). But flat does not mean peak. A curve can go flat at the top of
                a hill, at the bottom of a valley, or pause for a moment and carry on the same way.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
