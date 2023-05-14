import { Bits, b } from "utils/bits"

/** Maps numbers to their register name. */
export const registerNames = [
    "zero", "ra", "sp",  "gp",  "tp", "t0", "t1", "t2",
    "s0",   "s1", "a0",  "a1",  "a2", "a3", "a4", "a5",
    "a6",   "a7", "s2",  "s3",  "s4", "s5", "s6", "s7",
    "s8",   "s9", "s10", "s11", "t3", "t4", "t5", "t6",
]

/** Maps register names to their number. */
export const registers: Record<string, number> = {
    ...Object.fromEntries(registerNames.map((reg, num) => [reg, num])),
    ...Object.fromEntries([...Array(32)].map((_, num) => [`x${num}`, num])),
}


                      // name  [opcode, funct3, funct7]
export const opcodes: Record<string, [Bits, Bits|null, Bits|null]> = {
    "lui"  : [b`0110111`, null  , null       ],   // U-type
    "jal"  : [b`1101111`, null  , null       ],   // UJ-type
    "beq"  : [b`1100011`, b`000`, null       ],   // SB-type
    "bne"  : [b`1100011`, b`001`, null       ],   // SB-type
    "blt"  : [b`1100011`, b`100`, null       ],   // SB-type
    "bge"  : [b`1100011`, b`101`, null       ],   // SB-type
    "bltu" : [b`1100011`, b`110`, null       ],   // SB-type
    "bgeu" : [b`1100011`, b`111`, null       ],   // SB-type
    "sb"   : [b`0100011`, b`000`, null       ],   // S-type
    "sh"   : [b`0100011`, b`001`, null       ],   // S-type
    "sw"   : [b`0100011`, b`010`, null       ],   // S-type
    "jalr" : [b`1100111`, b`000`, null       ],   // I-type
    "lb"   : [b`0000011`, b`000`, null       ],   // I-type
    "lh"   : [b`0000011`, b`001`, null       ],   // I-type
    "lw"   : [b`0000011`, b`010`, null       ],   // I-type
    "lbu"  : [b`0000011`, b`100`, null       ],   // I-type
    "lhu"  : [b`0000011`, b`101`, null       ],   // I-type
    "addi" : [b`0010011`, b`000`, null       ],   // I-type
    "slti" : [b`0010011`, b`010`, null       ],   // I-type
    "sltiu": [b`0010011`, b`011`, null       ],   // I-type
    "xori" : [b`0010011`, b`100`, null       ],   // I-type
    "ori"  : [b`0010011`, b`110`, null       ],   // I-type
    "andi" : [b`0010011`, b`111`, null       ],   // I-type
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

