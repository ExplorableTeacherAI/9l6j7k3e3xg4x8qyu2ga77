import { type ReactElement } from "react";
import { Block } from "@/components/templates";
import { StackLayout } from "@/components/layouts";
import { EditableH2, EditableParagraph } from "@/components/atoms";
import { VisualOptionCards } from "@/components/organisms";

export const puttingTheSketchTogetherBlocks: ReactElement[] = [
    <StackLayout key="layout-sketch-heading" maxWidth="xl">
        <Block id="sketch-heading" padding="md">
            <EditableH2 id="h2-sketch-heading" blockId="sketch-heading">
                Putting the Sketch Together
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-setup" maxWidth="xl">
        <Block id="sketch-setup" padding="sm">
            <EditableParagraph id="para-sketch-setup" blockId="sketch-setup">
                Everything is now on the table. A valley at (−1, −1), a hilltop at (1, 1), falling
                outside them and climbing between, and the bend changing at −√3, 0 and √3. That is
                enough to draw the whole curve without plotting a single extra point.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-visual" maxWidth="xl">
        <Block id="sketch-visual" padding="sm">
            <VisualOptionCards
                blockId="sketch-visual"
                cards={[
                    {
                        id: "draw-it-yourself",
                        title: "An empty grid holding only the hilltop, the valley and the three bend points",
                        looks: "Imagine a grid marked with five dots and nothing else: a valley, a hilltop, and three points where the bend must change. A freehand line can be drawn straight through them, and once it is finished the true curve fades in on top so the two can be compared.",
                        manipulate: "Draw the curve freehand through the marked points, then watch the true curve fade in over the attempt",
                        reveals: "The five marked points pin the shape down so tightly that almost any careful sketch lands on the real curve",
                        paradigm: "constructivist",
                        recommended: true,
                    },
                    {
                        id: "bend-to-match-the-clues",
                        title: "A bendable curve with handles, beside a checklist of clues waiting to be satisfied",
                        looks: "Imagine a loose curve stretched across a grid with a few round handles along it, and beside it a list of the clues found so far: flat at −1, flat at 1, falling on the outside, climbing between. Each clue ticks itself off the moment the curve actually satisfies it.",
                        manipulate: "Pull the handles until every clue on the list has ticked itself off",
                        reveals: "The clues do not just describe the curve, they trap it, leaving only one shape that can satisfy them all",
                        paradigm: "goal",
                    },
                    {
                        id: "match-the-gradient-graph",
                        title: "A curve students bend, with the gradient graph it produces shown underneath",
                        looks: "Imagine a bendable curve on a grid with a second graph beneath it showing the gradient of whatever shape has been made so far. Behind that second graph sits a faint target: the real gradient curve, waiting to be matched.",
                        manipulate: "Bend the curve with its handles until the gradient graph beneath settles onto the faint target",
                        reveals: "Getting the gradient graph right forces the curve above to be right, because a curve and its gradient cannot disagree",
                        paradigm: "inversion",
                        secondView: {
                            shows: "The gradient of the student's current curve, over a faint plot of the true dy/dx",
                            role: "constraining",
                            syncedBy: "sketchHandlePositions, plus a shared hover highlight linking each handle to its point on the gradient graph",
                        },
                    },
                ]}
            />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-tails" maxWidth="xl">
        <Block id="sketch-tails" padding="sm">
            <EditableParagraph id="para-sketch-tails" blockId="sketch-tails">
                One last thing the derivatives never told us: what happens far out. For large x the
                x² underneath grows far faster than the 2x on top, so both tails of the curve sink
                quietly back toward zero without ever touching it.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
