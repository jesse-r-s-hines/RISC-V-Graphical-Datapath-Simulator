 // Allow you to import svg's using webpack's magic
declare module '*.svg' { const d: string; export default d; }

declare module '*.ne' { const d: import("nearley").CompiledRules; export default d; }

declare module '*.css' { const d: any; export default d; }
