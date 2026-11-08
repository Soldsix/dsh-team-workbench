import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
/**
 * Render structured plans as labelled sections and retain historical prose verbatim.
 * @param props - Saved plan text and locale.
 * @returns full plan details; no member or task is truncated.
 */
export declare function ProjectPlanView({ text, t }: {
    text: string;
} & PropsLocale<typeof NS>): import("react").JSX.Element;
