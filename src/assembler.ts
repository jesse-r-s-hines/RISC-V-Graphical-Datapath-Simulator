import { Parser, Grammar } from 'nearley';
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

interface Instr {
    instr: string, type: string
    rd: Bits, rs1: Bits, rs2: Bits,
    imm: bigint,
    label: string,
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
    let parser = new Parser(Grammar.fromCompiled(grammar));
    parser.feed(program);
    let parsed: any[] = parser.results[0]

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

    for (let [line, instr] of instructions.entries()) {
        if ("label" in instr) instr.imm = (labels[instr.label] - line) * 4;
        if ("imm" in instr) instr.imm = BigInt(instr.imm) // TODO modify Bits to take number.
        for (let field of ["rd", "rs1", "rs2"])
            if (field in instr) instr[field] = Bits(BigInt(registers[instr[field]]), 5)

        machine_code.push(Bits.toInt(assemble_instr(instr)))
    }

    return machine_code
}
