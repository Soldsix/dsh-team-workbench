/** Authoritative expert catalog schemas and storage declaration. */
import { z } from 'zod';
import type { TeamExpertDefinition, TeamExpertId, TeamExpertRecord } from './expert-types.ts';
/** Profile validation shared by model input parsing and durable catalog reads. */
export declare const expertDefinitionSchema: z.ZodType<TeamExpertDefinition>;
/** Personal expert catalog; Team logs own the member-to-expert references. */
export declare const teamExpertDomainSpec: {
    name: string;
    version: number;
    tables: {
        experts: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<TeamExpertId, TeamExpertRecord>;
    };
};
