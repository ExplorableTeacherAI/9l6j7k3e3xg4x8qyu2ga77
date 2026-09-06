/**
 * The lesson's colour language.
 * ==============================
 *
 * One meaning, one colour — in every figure, every formula and every prose term.
 * The hex values live in `variables.ts` under the `term*` definitions; this map
 * is what the formula components read, and the variable store overrides any
 * entry whose key matches a defined variable, so a teacher recolouring a term
 * recolours it everywhere at once.
 */
export const CURVE_COLOR_MAP: Record<string, string> = {
    /** the curve itself */
    termCurve: '#334155',
    /** the top line of a fraction — where the flat points come from */
    termTopLine: '#E07A5F',
    /** the bottom line of a fraction — where the asymptotes come from */
    termBottomLine: '#8B5CF6',
    /** dy/dx, climbing, a positive gradient, a maximum */
    termGradient: '#62D0AD',
    /** a negative gradient, a minimum, bending downward */
    termFalling: '#8E90F5',
    /** d2y/dx2, the bend, and the points of inflection where it changes */
    termBend: '#ef4444',
    /** a gradient of exactly zero */
    termLevel: '#64748B',
};

/** Student answers carry their own identity, so they never read as a maths colour. */
export const ANSWER_COLOR = '#3B82F6';
export const ANSWER_BG_COLOR = 'rgba(59, 130, 246, 0.15)';

/** Colour a signed quantity the way every figure in the lesson colours it. */
export const signTerm = (value: number, tolerance = 0.005): string =>
    value > tolerance ? 'termGradient' : value < -tolerance ? 'termFalling' : 'termLevel';
