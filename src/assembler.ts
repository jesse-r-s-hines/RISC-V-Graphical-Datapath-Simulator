import { Parser, Grammar } from 'nearley';
import * as moo from 'moo';
import {Bit, Bits, b} from "./utils"
import grammar from './assembler.ne';

let registers: Record<string, number> = {
    "zero":  0, "ra":  1, "sp" :  2, "gp" :  3, "tp":  4, "t0":  5, "t1":  6, "t2":  7,
    "s0"  :  8, "s1":  9, "a0" : 10, "a1" : 11, "a2": 12, "a3": 13, "a4": 14, "a5": 15,
    "a6"  : 16, "a7": 17, "s2" : 18, "s3" : 19, "s4": 20, "s5": 21, "s6": 22, "s7": 23,
    "s8"  : 24, "s9": 25, "s10": 26, "s11": 27, "t3": 28, "t4": 29, "t5": 30, "t6": 31,

    "x0" :  0,  "x1":  1, "x2" :   2, "x3":   3, "x4":  4,   "x5":  5,  "x6":  6,  "x7":  7,
    "x8" :  8,  "x9":  9, "x10": 10, "x11": 11, "x12": 12, "x13" : 13, "x14": 14, "x15": 15,
    "x16": 16, "x17": 17, "x18": 18, "x19": 19, "x20": 20, "x21" : 21, "x22": 22, "x23": 23,
    "x24": 24, "x25": 25, "x26": 26, "x27": 27, "x28": 28, "x29" : 29, "x30": 30, "x31": 31,
};

                 // name  [opcode, funct3, funct7]
let opcodes: Record<string, [Bits, Bits, Bits]> = {
    "lui"  : [b`0110111`, b``   , b``       ],   // U-type
    "jal"  : [b`1101111`, b``   , b``       ],   // UJ-type
    "j"    : [b`1101111`, b``   , b``       ],   // UJ-type
    "beq"  : [b`1100011`, b`000`, b``       ],   // SB-type
    "bne"  : [b`1100011`, b`001`, b``       ],   // SB-type
    "blt"  : [b`1100011`, b`100`, b``       ],   // SB-type
    "bge"  : [b`1100011`, b`101`, b``       ],   // SB-type
    "bltu" : [b`1100011`, b`110`, b``       ],   // SB-type
    "bgeu" : [b`1100011`, b`111`, b``       ],   // SB-type
    "sb"   : [b`0100011`, b`000`, b``       ],   // S-type
    "sh"   : [b`0100011`, b`001`, b``       ],   // S-type
    "sw"   : [b`0100011`, b`010`, b``       ],   // S-type
    "jalr" : [b`1100111`, b`000`, b``       ],   // I-type
    "lb"   : [b`0000011`, b`000`, b``       ],   // I-type
    "lh"   : [b`0000011`, b`001`, b``       ],   // I-type
    "lw"   : [b`0000011`, b`010`, b``       ],   // I-type
    "lbu"  : [b`0000011`, b`100`, b``       ],   // I-type
    "lhu"  : [b`0000011`, b`101`, b``       ],   // I-type
    "addi" : [b`0010011`, b`000`, b``       ],   // I-type
    "slti" : [b`0010011`, b`010`, b``       ],   // I-type
    "sltiu": [b`0010011`, b`011`, b``       ],   // I-type
    "xori" : [b`0010011`, b`100`, b``       ],   // I-type
    "ori"  : [b`0010011`, b`110`, b``       ],   // I-type
    "andi" : [b`0010011`, b`111`, b``       ],   // I-type
    "slli" : [b`0010011`, b`001`, b`0000000`],   // I-type
    "srli" : [b`0010011`, b`101`, b`0000000`],   // I-type
    "srai" : [b`0010011`, b`101`, b`0100000`],   // I-type
    "add"  : [b`0110011`, b`000`, b`0000000`],   // R-type
    "sub"  : [b`0110011`, b`000`, b`0100000`],   // R-type
    "sll"  : [b`0110011`, b`001`, b`0000000`],   // R-type
    "slt"  : [b`0110011`, b`010`, b`0000000`],   // R-type
    "sltu" : [b`0110011`, b`011`, b`0000000`],   // R-type
    "xor"  : [b`0110011`, b`100`, b`0000000`],   // R-type
    "srl"  : [b`0110011`, b`101`, b`0000000`],   // R-type
    "sra"  : [b`0110011`, b`101`, b`0100000`],   // R-type
    "or"   : [b`0110011`, b`110`, b`0000000`],   // R-type
    "and"  : [b`0110011`, b`111`, b`0000000`],   // R-type
}

/** Assembler error. Shows message and line number with a preview */
class AssemblerError extends Error {
    line: number; col?: number;

    constructor(message: string, program: string, line: number, col?: number) {
        let lines = program.split("\n")
        if (col != undefined) {
            message = `${message}\n` +
                      `at line ${line} col ${col}:\n` +
                      `  ${lines[line - 1]}\n` +
                      `  ${'-'.repeat(col - 1)}^`
        } else {
            message = `${message}\n` +
                      `at line ${line}:\n` +
                      `  ${lines[line - 1]}\n`
        }

        super(message);
        // Hack to allow extending error. https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
        Object.setPrototypeOf(this, new.target.prototype);
        this.line = line; this.col = col;
    }
}

interface Instr {
    instr: string, type: string
    rd: Bits, rs1: Bits, rs2: Bits, // TODO types
    imm: bigint,
    label: string,
}

/**
 * Parses the program using nearley, throws an error if nearley fails.
 * Doesn't check registers, labels, etc.
 */
function parse(program: string): any[] {
    let parser = new Parser(Grammar.fromCompiled(grammar));

    try {
        parser.feed(program);
    } catch(e) {
        throw new AssemblerError("Syntax error", program, e.token.line, e.token.col)
    }
    if (parser.results.length < 1) {
        let lines = program.split("\n")
        throw new AssemblerError(`Unexpected end of program`, program, lines.length, lines[lines.length - 1].length)
    } else if (parser.results.length > 1) {
        throw Error("Code is ambiguous.") // This shouldn't be possible
    }
    return parser.results[0]
}

/** Assembles a single instruction. */
function assemble_instr(instr: Instr): Bits {
    let [opcode, funct3, funct7] = opcodes[instr.instr.toLowerCase()]
    if (instr.type == "R") {
        return [...opcode, ...instr.rd, ...funct3, ...instr.rs1, ...instr.rs2, ...funct7]
    } else if (instr.type == "I") {
        return [...opcode, ...instr.rd, ...funct3, ...instr.rs1, ...Bits(instr.imm, 12, true)]
    } else if (instr.type == "S") {
        let imm = Bits(instr.imm, 12, true)
        return [...opcode, ...imm.slice(0, 5), ...funct3, ...instr.rs1, ...instr.rs2, ...imm.slice(5, 12)]
    } else if (instr.type == "SB") {
        let imm = Bits(instr.imm, 13, true)
        return [...opcode, imm[11], ...imm.slice(1, 5), ...funct3, ...instr.rs1, ...instr.rs2, ...imm.slice(5, 11), imm[12]]
    } else if (instr.type == "U") {
        return [...opcode, ...instr.rd, ...Bits(instr.imm, 20, true)]
    } else if (instr.type == "UJ") {
        let imm = Bits(instr.imm, 21, true)
        return [...opcode, ...instr.rd, ...imm.slice(12, 20), imm[11], ...imm.slice(1, 11), imm[20]]
    } else {
        throw Error("Unknown instruction type")
    }
}

export function assemble(program: string): bigint[] {
    let parsed = parse(program)

    // Pass one, read labels
    let labels: Record<string, number> = {}
    let instructions: any[] = []; // TODO types
    let machine_code: bigint[] = []

    for (let instr of parsed) {
        if (instr.type == "label") {
            labels[instr.label] = instructions.length // Point to next instruction
        } else {
            instructions.push(instr)
        }
    }

    for (let [instr_num, instr] of instructions.entries()) {
        if ("label" in instr) {
            if (!(instr.label in labels))
                throw new AssemblerError(`Unknown label "${instr.label}"`, program, instr.line)
            instr.imm = (labels[instr.label] - instr_num) * 4;
        }
        if ("imm" in instr) instr.imm = BigInt(instr.imm) // TODO modify Bits to take number.
        for (let field of ["rd", "rs1", "rs2"]) {
            if (field in instr) {
                if (!(instr[field] in registers))
                    throw new AssemblerError(`Unknown register "${instr[field]}"`, program, instr.line)
                instr[field] = Bits(BigInt(registers[instr[field]]), 5)
            }
        }

        try {
            var machine_code_instr = assemble_instr(instr)
        } catch (e) {
            throw new AssemblerError(e.message, program, instr.line)
        }
        machine_code.push(Bits.toInt(machine_code_instr))
    }

    return machine_code
}
