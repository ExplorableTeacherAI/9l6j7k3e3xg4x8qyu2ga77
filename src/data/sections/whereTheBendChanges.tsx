import { type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import { EditableH2, EditableParagraph } from "@/components/atoms";
import { FormulaBlock } from "@/components/molecules";
import { VisualOptionCards } from "@/components/organisms";

export const whereTheBendChangesBlocks: ReactElement[] = [
    <StackLayout key="layout-bend-heading" maxWidth="xl">
        <Block id="bend-heading" padding="md">
            <EditableH2 id="h2-bend-heading" blockId="bend-heading">
                The Bend, and Where It Changes
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-setup" maxWidth="xl">
        <Block id="bend-setup" padding="sm">
            <EditableParagraph id="para-bend-setup" blockId="bend-setup">
                The first derivative says which way the curve is heading. The second says how that
                heading is changing, and that is the curve's bend. Differentiating once more and
                factorising hands us three places where the bend might switch.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-second-derivative" maxWidth="xl">
        <Block id="bend-second-derivative" padding="lg">
            <FormulaBlock latex="\frac{d^2y}{dx^2} = \frac{4x(x-\sqrt{3})(x+\sqrt{3})}{(1+x^2)^3}" />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-stretches" maxWidth="xl">
        <Block id="bend-stretches" padding="sm">
            <EditableParagraph id="para-bend-stretches" blockId="bend-stretches">
                So the second derivative is zero at x = 0, x = √3 and x = −√3, though zero on its own
                proves nothing. A point of inflection needs the bend to genuinely change sign, so the
                four stretches these three values create each need testing.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-visual" maxWidth="xl">
        <Block id="bend-visual" padding="sm">
            <VisualOptionCards
                blockId="bend-visual"
                cards={[
                    {
                        id: "hugging-circle",
                        title: "A large circle hugging the inside of the curve, flipping to the other side as it travels",
                        looks: "Imagine the curve with a big faint circle nestled into its bend, touching at a single point and curving the same way the curve does there. As that touching point travels, the circle swells, shrinks, and at certain spots swings across to hug the curve from the other side instead.",
                        manipulate: "Slide the touching point along the curve and stop wherever the circle swings across to the other side",
                        reveals: "The circle changes sides at exactly three places, and those three places are where the curve stops bending one way and starts bending the other",
                        paradigm: "temporal",
                        recommended: true,
                    },
                    {
                        id: "bend-sign-line",
                        title: "A curve above and a bend line beneath, cut at the three candidate points",
                        looks: "Imagine the x-axis beneath the curve cut at −√3, 0 and √3, leaving four stretches with an empty box above each. Dropping a test value into a stretch fills its box with a plus or a minus, and the matching piece of the curve above shades as a smile or a frown.",
                        manipulate: "Drop a test value into each of the four stretches and watch the boxes and the shaded pieces of curve appear",
                        reveals: "The bend flips at all three candidates here, so all three really are points of inflection",
                        paradigm: "constructivist",
                        secondView: {
                            shows: "The curve, with each stretch shading as cup-up or cup-down once its sign is known",
                            role: "constructing",
                            syncedBy: "bendStretchResults, plus a shared hover highlight linking each box to its piece of the curve",
                        },
                    },
                    {
                        id: "smile-or-frown-guess",
                        title: "Four blank stretches of curve waiting to be labelled as a smile or a frown",
                        looks: "Imagine the curve drawn as four separate faint pieces split at −√3, 0 and √3, with a smile card and a frown card sitting beside each piece. Once a card is placed on a piece, that piece firms up in the shape the card claims, ready to be checked against the real curve.",
                        manipulate: "Place a smile or a frown card on each of the four pieces before the real curve is revealed",
                        reveals: "The bend cannot repeat itself across a genuine inflection point, so smile and frown have to alternate",
                        paradigm: "prediction",
                    },
                ]}
            />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-reading" maxWidth="xl">
        <Block id="bend-reading" padding="sm">
            <EditableParagraph id="para-bend-reading" blockId="bend-reading">
                Wherever the sign flips from positive to negative, or back the other way, the curve
                really does change its bend. All three candidates pass that test here, giving
                inflection points at x = −√3, x = 0 and x = √3.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
