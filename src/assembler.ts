import { Parser, Grammar } from 'nearley';
import * as moo from 'moo';
import {Bit, Bits, b} from "./utils"
import grammar from './assembler.ne';

const registers: Record<string, number> = {
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
const opcodes: Record<string, [Bits, Bits, Bits]> = {
    "lui"  : [b`0110111`, b``   , b``       ],   // U-type
    "jal"  : [b`1101111`, b``   , b``       ],   // UJ-type
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


// AST types that are returned from the parser.
interface Arg { type: string, value: any }
type AsmStatement = AsmLabel | AsmInstr
interface AsmLabel {
    type: "label"; label: string
}
interface AsmInstr {
    type: "basic"|"displacement"
    line: number,
    op: string; args: Arg[]
}

// Represents each instruction type
type Instr = RType | IType | ISType | SType | SBType | UType | UJype
interface RType { type: "R", line: number, op: string, rd: string, rs1: string, rs2: number; }
interface IType { type: "I", line: number, op: string, rd: string, rs1: string, imm: number|string } // string imm is a label
// Shifts use a specialized I format, with 5 bit imm and funct7. There's no official name, so we'll just call the format "IS"
interface ISType { type: "IS", line: number, op: string, rd: string, rs1: string, imm: number|string }
interface SType { type: "S", line: number, op: string, rs1: string, rs2: string, imm: number|string }
interface SBType { type: "SB", line: number, op: string, rs1: string, rs2: string, imm: number|string }
interface UType { type: "U", line: number, op: string, rd: string, imm: number|string }
interface UJype { type: "UJ", line: number, op: string, rd: string, imm: number|string }

/** Contains rules for the args and types of instructions and how to convert them. */
interface Rule {
    instructions: string[]
    format: "basic"|"displacement"
    signature: string[],
    conv: (op: string, args: any[], line: number) => Instr
}

function ruleMatch(rule: Rule, instr: AsmInstr) {
    return (rule.instructions.includes(instr.op.toLowerCase())) &&
           (instr.type == rule.format) && (instr.args.length == rule.signature.length) &&
           instr.args.every((arg, i) => arg.type == rule.signature[i])
}

const instr_rules: Rule[]  = [
    {
        instructions: ["add", "sub", "and", "or", "xor", "sll", "sra", "srl", "slt", "sltu"],
        format: "basic",
        signature: ["id", "id", "id"],
        conv: (op, [rd, rs1, rs2], line) => ({type: "R", op: op, rd: rd, rs1: rs1, rs2: rs2, line: line}),
    }, {
        instructions: ["addi", "andi", "ori", "xori", "slti", "sltiu"],
        format: "basic",
        signature: ["id", "id", "num"],
        conv: (op, [rd, rs1, imm], line) => ({type: "I", op: op, rd: rd, rs1: rs1, imm: imm, line: line}),
    }, {
        instructions: ["slli", "srai", "srli"], // shifts are stored as a specialized I-format, 
        format: "basic",
        signature: ["id", "id", "num"],
        conv: (op, [rd, rs1, imm], line) => ({type: "IS", op: op, rd: rd, rs1: rs1, imm: imm, line: line}),
    }, {
        instructions: ["beq", "bge", "bgeu", "blt", "bltu", "bne"],
        format: "basic",
        signature: ["id", "id", "id"],
        conv: (op, [rs1, rs2, label], line) => ({type: "SB", op: op, rs1: rs1, rs2: rs2, imm: label, line: line}),
    }, {
        instructions: ["jal"],
        format: "basic",
        signature: ["id", "id"],
        conv: (op, [rd, label], line) => ({type: "UJ", op: op, rd: rd, imm: label, line: line}),
    }, {
        instructions: ["j"],
        format: "basic",
        signature: ["id"],
        conv: (op, [label], line) => ({type: "UJ", op: "jal", rd: "zero", imm: label, line: line}),
    }, {
        instructions: ["lui"],
        format: "basic",
        signature: ["id", "num"],
        conv: (op, [rd, imm], line) => ({type: "U", op: op, rd: rd, imm: imm, line: line}),
    }, {
        instructions: ["lb", "lbu", "lh", "lhu", "lw", "jalr"],
        format: "displacement",
        signature: ["id", "num", "id"],
        conv: (op, [rd, imm, rs1], line) => ({type: "I", op: op, rd: rd, rs1: rs1, imm: imm, line: line}),
    }, {
        instructions: ["sb","sh", "sw"],
        format: "displacement",
        signature: ["id", "num", "id"],
        conv: (op, [rs2, imm, rs1], line) => ({type: "S", op: op, rs1: rs1, rs2: rs2, imm: imm, line: line}),
    }, {
        instructions: ["jal"],
        format: "basic",
        signature: ["id", "id"],
        conv: (op, [rd, label], line) => ({type: "UJ", op: op, rd: rd, imm: label, line: line}),
    }, {
        instructions: ["jal"],
        format: "basic",
        signature: ["id"],
        conv: (op, [label], line) => ({type: "UJ", op: op, rd: "ra", imm: label, line: line}),
    }, {
        instructions: ["mv"],
        format: "basic",
        signature: ["id", "id"],
        conv: (op, [rd, rs1], line) => ({type: "I", op: "addi", rd: rd, rs1: rs1, imm: 0, line: line}),
    }, {
        instructions: ["li"], // Does not support greater than 12-bit immediates. You have to `lui` and `li` yourself
        format: "basic",
        signature: ["id", "num"],
        conv: (op, [rd, imm], line) => ({type: "I", op: "addi", rd: rd, rs1: "zero", imm: imm, line: line}),
    },
]


/**
 * Parses the program using nearley, throws an error if nearley fails.
 * Doesn't check registers, labels, etc.
 */
function parse(program: string): AsmStatement[] {
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

/**
 * Assembles a RISC-V assembly program.
 * Returns a list of [line_num, machine_code_instruction] tuples, where line_num is the 1 indexed line in the string.
 */
export function assemble_keep_line_info(program: string): [number, bigint][] {
    let parsed = parse(program)

    let labels: Record<string, number> = {}
    let instructions: Instr[] = [];
    let machine_code: [number, bigint][] = []

    // Pass 1, read labels, convert AST into Instruction types
    for (let instr of parsed) {
        if (instr.type == "label") {
            labels[instr.label] = instructions.length // Point to next instruction
        } else {
            let matchingRule = instr_rules.find(r => ruleMatch(r, instr as AsmInstr))
            if (matchingRule) {
                let newInstr = matchingRule.conv(instr.op.toLowerCase(), instr.args.map((a) => a.value), instr.line)
                instructions.push(newInstr)
            } else {
                throw new AssemblerError("Unknown instruction or incorrect args", program, instr.line)
            }
        }
    }

    // Pass 2, actually assemble the assembly
    for (let [instr_num, instr] of instructions.entries()) {
        try {
            var machine_code_instr = assemble_instr(instr_num, instr, labels)
        } catch (e) {
            throw new AssemblerError(e.message, program, instr.line)
        }
        machine_code.push([instr.line, Bits.toInt(machine_code_instr)])
    }

    return machine_code
}

/**
 * Assembles a RISC-V assembly program.
 * Returns a list of bigints representing the machine code
 */
 export function assemble(program: string): bigint[] {
     return assemble_keep_line_info(program).map(([line, instr]) => instr)
 }

/** Assembles a single instruction. */
function assemble_instr(instr_num: number, instr: Instr, labels: Record<string, number>): Bits {
    let temp: any = {...instr} // Copy instr into an any so we can store Bits and BigInts in it.
    if ("imm" in instr) {
        if (typeof instr.imm == "string") {
            if (!(instr.imm in labels)) throw Error(`Unknown label "${temp.imm}"`)
            temp.imm = (labels[instr.imm] - instr_num) * 4;
        }
        temp.imm = BigInt(temp.imm) // TODO modify Bits to take number.
    }
    for (let field of ["rd", "rs1", "rs2"]) {
        if (field in temp) {
            if (!(temp[field] in registers))
                throw Error(`Unknown register "${temp[field]}"`)
            temp[field] = Bits(BigInt(registers[temp[field]]), 5)
        }
    }

    let [opcode, funct3, funct7] = opcodes[instr.op]
    if (instr.type == "R") {
        return Bits.join(funct7, temp.rs2, temp.rs1, funct3, temp.rd, opcode)
    } else if (instr.type == "I") {
        return Bits.join(Bits(temp.imm, 12, true), temp.rs1, funct3, temp.rd, opcode)
    } else if (instr.type == "IS") {
        return Bits.join(funct7, Bits(temp.imm, 5, true), temp.rs1, funct3, temp.rd, opcode)
    } else if (instr.type == "S") {
        let imm = Bits(temp.imm, 12, true)
        return Bits.join(imm.slice(5, 12), temp.rs2, temp.rs1, funct3, imm.slice(0, 5), opcode)
    } else if (instr.type == "SB") {
        let imm = Bits(temp.imm, 13, true)
        return Bits.join(imm[12], imm.slice(5, 11), temp.rs2, temp.rs1, funct3, imm.slice(1, 5), imm[11], opcode)
    } else if (instr.type == "U") {
        return Bits.join(Bits(temp.imm, 20, true), temp.rd, opcode)
    } else if (instr.type == "UJ") {
        let imm = Bits(temp.imm, 21, true)
        return Bits.join(imm[20], imm.slice(1, 11), imm[11], imm.slice(12, 20), temp.rd, opcode)
    } else {
        throw Error("Unknown instruction type")
    }
}


/** Assembler error. Shows message and line number with a preview */
class AssemblerError extends Error {
    line: number; col?: number;

    constructor(message: string, program: string, line: number, col?: number) {
        let lines = program.split("\n")
        let preview = lines[line - 1].trimLeft()
        let whitespace = lines[line - 1].length - preview.length
        if (col != undefined) {
            message = `${message}\n` +
                      `at line ${line} col ${col}:\n` +
                      `  ${preview}\n` +
                      `  ${'-'.repeat(col - 1 - whitespace)}^`
        } else {
            message = `${message}\n` +
                      `at line ${line}:\n` +
                      `  ${preview}\n`
        }

        super(message);
        // Hack to allow extending error. https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
        Object.setPrototypeOf(this, new.target.prototype);
        this.line = line; this.col = col;
    }
}