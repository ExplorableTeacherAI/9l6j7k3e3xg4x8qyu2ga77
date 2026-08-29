import { type ReactElement } from "react";

// Initialize variables and their colors from this file's variable definitions
import { useVariableStore, initializeVariableColors } from "@/stores";
import { getDefaultValues, variableDefinitions } from "./variables";
useVariableStore.getState().initialize(getDefaultValues());
initializeVariableColors(variableDefinitions);

import { lessonIntroductionBlocks } from "./sections/lessonIntroduction";
import { findingFlatPointsBlocks } from "./sections/findingFlatPoints";
import { testingTheSignBlocks } from "./sections/testingTheSign";
import { whereTheBendChangesBlocks } from "./sections/whereTheBendChanges";
import { puttingTheSketchTogetherBlocks } from "./sections/puttingTheSketchTogether";
import { linesNeverReachedBlocks } from "./sections/linesNeverReached";
import { wrappingUpBlocks } from "./sections/wrappingUp";

export const blocks: ReactElement[] = [
    ...lessonIntroductionBlocks,
    ...findingFlatPointsBlocks,
    ...testingTheSignBlocks,
    ...whereTheBendChangesBlocks,
    ...puttingTheSketchTogetherBlocks,
    ...linesNeverReachedBlocks,
    ...wrappingUpBlocks,
];
