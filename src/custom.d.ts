declare module '*.svg' { // Allow you to import svg's using webpack's magic
    const content: string;
    export default content;
}

declare module '*.ne' {
    const content: import("nearley").CompiledRules;
    export default content;
}