declare module '*.svg' { // Allow you to import svg's using webpack's magic
    const content: string;
    export default content;
}