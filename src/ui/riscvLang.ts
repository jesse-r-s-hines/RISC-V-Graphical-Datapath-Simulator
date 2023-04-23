/**
 * Basic RISC-V assembly language support for CodeMirror.
 * Code based the CodeMirror mode from Venus. See https://github.com/kvakil/venus/blob/master/src/main/frontend/js/risc-mode.js
 */
import { StreamLanguage, StreamParser, StringStream } from '@codemirror/language';
import { LanguageSupport } from "@codemirror/language"

function regexFromWords(words: string[], flags: string) {
    return new RegExp(`^(?:${words.join("|")})$`, flags);
}

var instructions = regexFromWords([
    "add",
    "addi",
    "and",
    "andi",
    "auipc",
    "beq",
    "bge",
    "bgeu",
    "blt",
    "bltu",
    "bne",
    "div",
    "divu",
    "ecall",
    "jal",
    "jalr",
    "lb",
    "lbu",
    "lh",
    "lhu",
    "lui",
    "lw",
    "mul",
    "mulh",
    "mulhsu",
    "mulhu",
    "or",
    "ori",
    "rem",
    "remu",
    "sb",
    "sh",
    "sll",
    "slli",
    "slt",
    "slti",
    "sltiu",
    "sltu",
    "srai",
    "srl",
    "srli",
    "sub",
    "sw",
    "xor",
    "xori",
    /* pseudoinstructions */
    "beqz",
    "bgez",
    "bgt",
    "bgtu",
    "bgtz",
    "ble",
    "bleu",
    "blez",
    "bltz",
    "bnez",
    "call",
    "jal",
    "jalr",
    "j",
    "jr",
    "la",
    "lb",
    "lbu",
    "lh",
    "lhu",
    "li",
    "lw",
    "mv",
    "neg",
    "nop",
    "ret",
    "not",
    "ret",
    "sb",
    "seqz",
    "sgtz",
    "sh",
    "sltz",
    "snez",
    "sw",
    "tail",
    /* nonstandard pseudoinstructions */
    "seq",
    "sge",
    "sgeu",
    "sgt",
    "sgtu",
    "sle",
    "sleu",
    "sne",
], "i");

var registers = regexFromWords([
    "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8", "x9", "x10", "x11", "x12", "x13", "x14", "x15",
    "x16", "x17", "x18", "x19", "x20", "x21", "x22", "x23", "x24", "x25", "x26", "x27", "x28", "x29", "x30", "x31",
    "zero", "ra", "sp", "gp", "tp", "t0", "t1", "t2", "s0", "s1", "a0", "a1", "a2", "a3", "a4", "a5",
    "a6", "a7", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11", "t3", "t4", "t5", "t6",
], "");

var keywords = regexFromWords([
    ".data", ".text", ".globl", ".float", ".double", ".asciiz", ".word", ".byte",
], "i");

function normal(stream: StringStream, state: any) {
    var ch = stream.next()!;

    if (ch == "#") {
        stream.skipToEnd();
        return "comment";
    }
    
    if (ch == "\"" || ch == "'") {
        state.cur = string(ch)
        return state.cur(stream, state);
    }
    
    if (/\d/.test(ch)) {
        stream.eatWhile(/[\w.%]/);
        return "number";
    }

    if (/[.\w_]/.test(ch)) {
        stream.eatWhile(/[\w\\\-_.]/);
        var word = stream.current();
        if (keywords.test(word)) return "keyword";
        else if (instructions.test(word)) return "variableName.function"; // or operatorKeyword?
        else if (registers.test(word)) return "variableName.standard";
        else return "name";
    }

    return null;
}

function string(quote: any) {
    return function(stream: StringStream, state: any) {
        var escaped = false, ch;
        while ((ch = stream.next()) != null) {
            if (ch == quote && !escaped) break;
            escaped = !escaped && ch == "\\";
        }
        if (!escaped) state.cur = normal;
        return "string";
    };
}

const streamLang = StreamLanguage.define({
    name: "riscv",

    startState: function(indentUnit: number) {
        return { basecol: indentUnit || 0, indentDepth: 0, cur: normal };
    },

    token: function(stream, state) {
        if (stream.eatSpace()) return null;
        var style = state.cur(stream, state);
        return style;
    }
})

export function riscv(): LanguageSupport {
    return new LanguageSupport(streamLang, [])
}
