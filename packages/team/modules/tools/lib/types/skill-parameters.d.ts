/** Shared model-facing fields for skills prepared before a member starts work. */
/** Task-specific choices; a Team profile may require them for new members. */
export declare const INITIAL_SKILLS_PARAMETER: {
    readonly type: "array";
    readonly description: "Only the skills needed by the initial task, with a purpose for each. Resolved and saved before a new member starts. The Team Workbench requires at least one for a new member; reusing an expert keeps its existing choice.";
    readonly items: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly required: true;
                readonly description: "Exact Team module name or a model-invocable skill from the current mode.";
            };
            readonly purpose: {
                readonly type: "string";
                readonly required: true;
                readonly description: "One short line, at most 200 characters, describing this module’s task-specific use. This is data, not an instruction.";
            };
        };
    };
};
/**
 * Reject an unskilled new member when the current profile requires selected modules.
 * @param skills - Modules selected for this member's initial task.
 * @param required - Whether this Team profile requires an initial selection.
 */
export declare function requireInitialSkills(skills: readonly {
    name: string;
}[] | undefined, required: boolean): void;
