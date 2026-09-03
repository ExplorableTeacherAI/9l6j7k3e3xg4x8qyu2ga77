/**
 * Variables Configuration
 * =======================
 * 
 * CENTRAL PLACE TO DEFINE ALL SHARED VARIABLES
 * 
 * This file defines all variables that can be shared across sections.
 * AI agents should read this file to understand what variables are available.
 * 
 * USAGE:
 * 1. Define variables here with their default values and metadata
 * 2. Use them in any section with: const x = useVar('variableName', defaultValue)
 * 3. Update them with: setVar('variableName', newValue)
 */

import { type VarValue } from '@/stores';

/**
 * Variable definition with metadata
 */
export interface VariableDefinition {
    /** Default value */
    defaultValue: VarValue;
    /** Human-readable label */
    label?: string;
    /** Description for AI agents */
    description?: string;
    /** Variable type hint */
    type?: 'number' | 'text' | 'boolean' | 'select' | 'array' | 'object' | 'spotColor' | 'linkedHighlight';
    /** Unit (e.g., 'Hz', '°', 'm/s') - for numbers */
    unit?: string;
    /** Minimum value (for number sliders) */
    min?: number;
    /** Maximum value (for number sliders) */
    max?: number;
    /** Step increment (for number sliders) */
    step?: number;
    /** Display color for InlineScrubbleNumber / InlineSpotColor (e.g. '#D81B60') */
    color?: string;
    /** Options for 'select' type variables */
    options?: string[];
    /** Placeholder text for text inputs */
    placeholder?: string;
    /**
     * Correct answer for cloze input validation.
     * Accepts a single string, pipe-separated alternates (e.g. "first | 1 | 1st"),
     * or an array of accepted answers (e.g. ["first", "1", "1st"]).
     */
    correctAnswer?: string | string[];
    /** Whether cloze matching is case sensitive */
    caseSensitive?: boolean;
    /** Background color for inline components */
    bgColor?: string;
    /** Schema hint for object types (for AI agents) */
    schema?: string;
}

/**
 * =====================================================
 * 🎯 DEFINE YOUR VARIABLES HERE
 * =====================================================
 * 
 * SUPPORTED TYPES:
 * 
 * 1. NUMBER (slider):
 *    { defaultValue: 5, type: 'number', min: 0, max: 10, step: 1 }
 * 
 * 2. TEXT (free text):
 *    { defaultValue: 'Hello', type: 'text', placeholder: 'Enter text...' }
 * 
 * 3. SELECT (dropdown):
 *    { defaultValue: 'sine', type: 'select', options: ['sine', 'cosine', 'tangent'] }
 * 
 * 4. BOOLEAN (toggle):
 *    { defaultValue: true, type: 'boolean' }
 * 
 * 5. ARRAY (list of numbers):
 *    { defaultValue: [1, 2, 3], type: 'array' }
 * 
 * 6. OBJECT (complex data):
 *    { defaultValue: { x: 5, y: 10 }, type: 'object', schema: '{ x: number, y: number }' }
 */
export const variableDefinitions: Record<string, VariableDefinition> = {
    // ─────────────────────────────────────────
    // SECTION: Stationary Points
    // ─────────────────────────────────────────
    flatPointsDotX: {
        defaultValue: -3,
        type: 'number',
        label: 'Walking dot position',
        description: 'x-coordinate of the dot the student drags along y = 2x/(1 + x^2)',
        min: -3,
        max: 3,
        step: 0.1,
        color: '#62D0AD',
    },
    flatPointsArrowHighlight: {
        defaultValue: '',
        type: 'linkedHighlight',
        label: 'Gradient arrow highlight',
        description: 'Which family of trail arrows is highlighted: climbing, falling or level',
        color: '#62D0AD',
        bgColor: 'rgba(98, 208, 173, 0.2)',
    },
    answerFlatPointsPartner: {
        defaultValue: '',
        type: 'text',
        label: 'Partner turning point',
        description: 'Second x value where dy/dx = 0 for y = x/(4 + x^2)',
        placeholder: '???',
        correctAnswer: ['-2', '\u22122', 'x = -2', 'x=-2'],
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
    },
    // ─────────────────────────────────────────
    // SECTION: The First Derivative Test
    // ─────────────────────────────────────────
    signTestX: {
        defaultValue: -3,
        type: 'number',
        label: 'Gradient test value',
        description: 'x value the student drops into each stretch to test the sign of dy/dx',
        min: -3,
        max: 3,
        step: 0.1,
        color: '#62D0AD',
    },
    signTestHighlight: {
        defaultValue: '',
        type: 'linkedHighlight',
        label: 'Sign column highlight',
        description: 'Which family of sign-table columns is highlighted: positive or negative',
        color: '#62D0AD',
        bgColor: 'rgba(98, 208, 173, 0.2)',
    },
    answerSignTestClassify: {
        defaultValue: '',
        type: 'text',
        label: 'Classify the stationary point',
        description: 'Student answer naming x = 2 as a minimum after the sign test',
        placeholder: '???',
        correctAnswer: ['minimum', 'a minimum', 'min'],
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
    },
    answerSignTestRepeated: {
        defaultValue: '',
        type: 'select',
        label: 'Repeated factor sign',
        description: 'Sign of dy/dx either side of x = 4 when dy/dx = (x - 4)^2',
        placeholder: '???',
        correctAnswer: 'positive',
        options: ['positive', 'negative', 'zero'],
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
    },
    // ─────────────────────────────────────────
    // SECTION: Concavity and Points of Inflection
    // ─────────────────────────────────────────
    bendTestX: {
        defaultValue: -3,
        type: 'number',
        label: 'Bend test value',
        description: 'x value the student drops into each stretch to test the sign of the second derivative',
        min: -3,
        max: 3,
        step: 0.1,
        color: '#62D0AD',
    },
    bendHighlight: {
        defaultValue: '',
        type: 'linkedHighlight',
        label: 'Bend highlight',
        description: 'Active highlight linking a sign box to its piece of curve: concaveUp, concaveDown or stretch-N',
        color: '#62D0AD',
        bgColor: 'rgba(98, 208, 173, 0.2)',
    },
    bendTestedValues: {
        defaultValue: [],
        type: 'array',
        label: 'Tested bend stretches',
        description: 'The x values the student has dropped the marker into, one per stretch discovered',
    },
    answerBendCandidate: {
        defaultValue: '',
        type: 'text',
        label: 'Inflection candidate',
        description: 'x value where 6x - 12 equals zero',
        placeholder: '???',
        correctAnswer: ['2', 'x = 2', 'x=2'],
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
    },
    answerBendNoChange: {
        defaultValue: '',
        type: 'select',
        label: 'Sign behaviour for x to the fourth',
        description: 'Whether the sign of 12x^2 changes either side of zero',
        placeholder: '???',
        correctAnswer: 'stays the same',
        options: ['stays the same', 'changes', 'becomes zero'],
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
    },
    // ─────────────────────────────────────────
    // SECTION: Synthesising the Complete Sketch
    // ─────────────────────────────────────────
    sketchPenX: {
        defaultValue: -3.6,
        type: 'number',
        label: 'Pen position',
        description: 'Where the drawing pen currently sits along the curve',
        min: -3.6,
        max: 3.6,
        step: 0.05,
        color: '#62D0AD',
    },
    sketchDrawnTo: {
        defaultValue: -3.6,
        type: 'number',
        label: 'Curve drawn as far as',
        description: 'The furthest x the pen has reached, so the inked curve and its landmarks stay put',
        min: -3.6,
        max: 3.6,
        step: 0.05,
    },
    sketchHighlight: {
        defaultValue: '',
        type: 'linkedHighlight',
        label: 'Sketch highlight',
        description: 'Links the flat points and the steepest climb across the curve and its gradient graph',
        color: '#62D0AD',
        bgColor: 'rgba(98, 208, 173, 0.2)',
    },
    answerSketchSecondTest: {
        defaultValue: '',
        type: 'text',
        label: 'Second derivative test',
        description: 'Classifying (1, -2) on y = x^3 - 3x using d2y/dx2 = 6x',
        placeholder: '???',
        correctAnswer: ['minimum', 'a minimum', 'min'],
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
    },
    answerSketchTail: {
        defaultValue: '',
        type: 'select',
        label: 'Sign of the gradient far right',
        description: 'Sign of dy/dx far out to the right, where the curve sinks back toward zero',
        placeholder: '???',
        correctAnswer: 'negative',
        options: ['positive', 'negative', 'zero'],
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
    },
    // ─────────────────────────────────────────
    // SECTION: Horizontal and Vertical Asymptotes
    // ─────────────────────────────────────────
    asymptoteCurve: {
        defaultValue: '1 + x\u00B2',
        type: 'select',
        label: 'Bottom line of the fraction',
        description: 'Which denominator the annotated summary curve uses',
        options: ['1 + x\u00B2', 'x\u00B2 \u2212 1'],
        color: '#AC8BF9',
        bgColor: 'rgba(172, 139, 249, 0.2)',
    },
    asymptoteDotX: {
        defaultValue: 3.5,
        type: 'number',
        label: 'Travelling dot position',
        description: 'x position of the dot the student drags along the annotated summary curve',
        min: -5,
        max: 5,
        step: 0.1,
        color: '#62D0AD',
    },
    asymptoteHighlight: {
        defaultValue: '',
        type: 'linkedHighlight',
        label: 'Asymptote highlight',
        description: 'Which dotted asymptote is highlighted: horizontal or vertical',
        color: '#AC8BF9',
        bgColor: 'rgba(172, 139, 249, 0.2)',
    },
    answerAsymptoteHorizontal: {
        defaultValue: '',
        type: 'text',
        label: 'Horizontal asymptote',
        description: 'The line the curve levels off toward far from the origin',
        placeholder: '???',
        correctAnswer: ['0', 'y = 0', 'y=0'],
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
    },
    answerFlatPointsAsymptote: {
        defaultValue: '',
        type: 'text',
        label: 'Vertical asymptote',
        description: 'x value where the denominator of the derivative is zero',
        placeholder: '???',
        correctAnswer: ['5', 'x = 5', 'x=5'],
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
    },

    // ─────────────────────────────────────────
    // SHARED COLOUR LANGUAGE
    // One meaning, one colour — used by every figure, formula and prose term.
    // ─────────────────────────────────────────
    termCurve: {
        defaultValue: '',
        type: 'spotColor',
        label: 'The curve itself',
        description: 'Ink colour for the curve y and its plotted line',
        color: '#334155',
    },
    termTopLine: {
        defaultValue: '',
        type: 'spotColor',
        label: 'Top line of the fraction',
        description: 'Coral — the numerator, which is where the flat points come from',
        color: '#F4A89A',
    },
    termBottomLine: {
        defaultValue: '',
        type: 'spotColor',
        label: 'Bottom line of the fraction',
        description: 'Violet — the denominator, which is where asymptotes come from',
        color: '#AC8BF9',
    },
    termGradient: {
        defaultValue: '',
        type: 'spotColor',
        label: 'First derivative',
        description: 'Teal — dy/dx, climbing, a positive gradient, a maximum',
        color: '#62D0AD',
    },
    termFalling: {
        defaultValue: '',
        type: 'spotColor',
        label: 'Falling and bending down',
        description: 'Indigo — a negative gradient, a minimum, concave down',
        color: '#8E90F5',
    },
    termBend: {
        defaultValue: '',
        type: 'spotColor',
        label: 'Second derivative',
        description: 'Red — the bend, and the points of inflection where it changes',
        color: '#ef4444',
    },
    termLevel: {
        defaultValue: '',
        type: 'spotColor',
        label: 'Level and zero',
        description: 'Slate — a gradient of exactly zero',
        color: '#64748B',
    },

    // ─────────────────────────────────────────
    // IN-FORMULA ANSWERS
    // ─────────────────────────────────────────
    flatPointsRootPositive: {
        defaultValue: '',
        type: 'text',
        label: 'First root of the top line',
        description: 'x value from the factor (x - 1) of the top line',
        placeholder: '?',
        correctAnswer: ['1', 'x = 1', 'x=1', '+1'],
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
    },
    flatPointsRootNegative: {
        defaultValue: '',
        type: 'text',
        label: 'Second root of the top line',
        description: 'x value from the factor (x + 1) of the top line',
        placeholder: '?',
        correctAnswer: ['-1', '\u22121', 'x = -1', 'x=-1'],
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
    },
    signTestBottomSign: {
        defaultValue: '',
        type: 'select',
        label: 'Sign of the bottom line',
        description: 'Whether (1 + x^2)^2 can ever be negative',
        placeholder: '???',
        correctAnswer: 'positive',
        options: ['positive', 'negative', 'zero'],
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
    },

    // Uncomment and modify these examples for your lesson:

    /*
    // ─────────────────────────────────────────
    // NUMBER - Use with sliders
    // ─────────────────────────────────────────
    myValue: {
        defaultValue: 5,
        type: 'number',
        label: 'My Value',
        description: 'A number that controls something',
        unit: 'm',           // optional unit display
        min: 0,
        max: 10,
        step: 0.5,
    },

    // ─────────────────────────────────────────
    // TEXT - Free text input
    // ─────────────────────────────────────────
    lessonTitle: {
        defaultValue: 'My Lesson',
        type: 'text',
        label: 'Lesson Title',
        description: 'The title of your lesson',
        placeholder: 'Enter a title...',
    },

    // ─────────────────────────────────────────
    // SELECT - Dropdown with options
    // ─────────────────────────────────────────
    difficulty: {
        defaultValue: 'medium',
        type: 'select',
        label: 'Difficulty',
        description: 'The difficulty level of the lesson',
        options: ['easy', 'medium', 'hard', 'expert'],
    },

    // ─────────────────────────────────────────
    // BOOLEAN - Toggle switch
    // ─────────────────────────────────────────
    showHints: {
        defaultValue: true,
        type: 'boolean',
        label: 'Show Hints',
        description: 'Toggle to show or hide hints',
    },

    // ─────────────────────────────────────────
    // ARRAY - List of numbers
    // ─────────────────────────────────────────
    dataPoints: {
        defaultValue: [1, 4, 9, 16, 25],
        type: 'array',
        label: 'Data Points',
        description: 'Y-values for plotting a graph',
    },

    // ─────────────────────────────────────────
    // OBJECT - Complex structured data
    // ─────────────────────────────────────────
    graphSettings: {
        defaultValue: { 
            xMin: -10, 
            xMax: 10, 
            showGrid: true 
        },
        type: 'object',
        label: 'Graph Settings',
        description: 'Configuration for the graph display',
        schema: '{ xMin: number, xMax: number, showGrid: boolean }',
    },
    */
};

/**
 * Get all variable names (for AI agents to discover)
 */
export const getVariableNames = (): string[] => {
    return Object.keys(variableDefinitions);
};

/**
 * Get a variable's default value
 */
export const getDefaultValue = (name: string): VarValue => {
    return variableDefinitions[name]?.defaultValue ?? 0;
};

/**
 * Get a variable's metadata
 */
export const getVariableInfo = (name: string): VariableDefinition | undefined => {
    return variableDefinitions[name];
};

/**
 * Get all default values as a record (for initialization)
 */
export const getDefaultValues = (): Record<string, VarValue> => {
    const defaults: Record<string, VarValue> = {};
    for (const [name, def] of Object.entries(variableDefinitions)) {
        defaults[name] = def.defaultValue;
    }
    return defaults;
};

/**
 * Get number props for InlineScrubbleNumber from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx, or getExampleVariableInfo(name) in exampleBlocks.tsx.
 */
export function numberPropsFromDefinition(def: VariableDefinition | undefined): {
    defaultValue?: number;
    min?: number;
    max?: number;
    step?: number;
    color?: string;
} {
    if (!def || def.type !== 'number') return {};
    return {
        defaultValue: def.defaultValue as number,
        min: def.min,
        max: def.max,
        step: def.step,
        ...(def.color ? { color: def.color } : {}),
    };
}

/**
 * Get cloze input props for InlineClozeInput from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx, or getExampleVariableInfo(name) in exampleBlocks.tsx.
 */
/**
 * Get cloze choice props for InlineClozeChoice from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx.
 */
export function choicePropsFromDefinition(def: VariableDefinition | undefined): {
    placeholder?: string;
    color?: string;
    bgColor?: string;
} {
    if (!def || def.type !== 'select') return {};
    return {
        ...(def.placeholder ? { placeholder: def.placeholder } : {}),
        ...(def.color ? { color: def.color } : {}),
        ...(def.bgColor ? { bgColor: def.bgColor } : {}),
    };
}

/**
 * Get toggle props for InlineToggle from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx.
 */
export function togglePropsFromDefinition(def: VariableDefinition | undefined): {
    color?: string;
    bgColor?: string;
} {
    if (!def || def.type !== 'select') return {};
    return {
        ...(def.color ? { color: def.color } : {}),
        ...(def.bgColor ? { bgColor: def.bgColor } : {}),
    };
}

export function clozePropsFromDefinition(def: VariableDefinition | undefined): {
    placeholder?: string;
    color?: string;
    bgColor?: string;
    caseSensitive?: boolean;
} {
    if (!def || def.type !== 'text') return {};
    return {
        ...(def.placeholder ? { placeholder: def.placeholder } : {}),
        ...(def.color ? { color: def.color } : {}),
        ...(def.bgColor ? { bgColor: def.bgColor } : {}),
        ...(def.caseSensitive !== undefined ? { caseSensitive: def.caseSensitive } : {}),
    };
}

/**
 * Get spot-color props for InlineSpotColor from a variable definition.
 * Extracts the `color` field.
 *
 * @example
 * <InlineSpotColor
 *     varName="radius"
 *     {...spotColorPropsFromDefinition(getVariableInfo('radius'))}
 * >
 *     radius
 * </InlineSpotColor>
 */
export function spotColorPropsFromDefinition(def: VariableDefinition | undefined): {
    color: string;
} {
    return {
        color: def?.color ?? '#8B5CF6',
    };
}

/**
 * Get linked-highlight props for InlineLinkedHighlight from a variable definition.
 * Extracts the `color` and `bgColor` fields.
 *
 * @example
 * <InlineLinkedHighlight
 *     varName="activeHighlight"
 *     highlightId="radius"
 *     {...linkedHighlightPropsFromDefinition(getVariableInfo('activeHighlight'))}
 * >
 *     radius
 * </InlineLinkedHighlight>
 */
export function linkedHighlightPropsFromDefinition(def: VariableDefinition | undefined): {
    color?: string;
    bgColor?: string;
} {
    return {
        ...(def?.color ? { color: def.color } : {}),
        ...(def?.bgColor ? { bgColor: def.bgColor } : {}),
    };
}

/**
 * Build the `variables` prop for FormulaBlock from variable definitions.
 *
 * Takes an array of variable names and returns the config map expected by
 * `<FormulaBlock variables={...} />`.
 *
 * @example
 * import { scrubVarsFromDefinitions } from './variables';
 *
 * <FormulaBlock
 *     latex="\scrub{mass} \times \scrub{accel}"
 *     variables={scrubVarsFromDefinitions(['mass', 'accel'])}
 * />
 */
export function scrubVarsFromDefinitions(
    varNames: string[],
): Record<string, { min?: number; max?: number; step?: number; color?: string }> {
    const result: Record<string, { min?: number; max?: number; step?: number; color?: string }> = {};
    for (const name of varNames) {
        const def = variableDefinitions[name];
        if (!def) continue;
        result[name] = {
            ...(def.min !== undefined ? { min: def.min } : {}),
            ...(def.max !== undefined ? { max: def.max } : {}),
            ...(def.step !== undefined ? { step: def.step } : {}),
            ...(def.color ? { color: def.color } : {}),
        };
    }
    return result;
}
