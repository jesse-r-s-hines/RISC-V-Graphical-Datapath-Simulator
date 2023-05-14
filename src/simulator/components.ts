import { Memory } from "./memory"
import { Bit, Bits, b, bits, bit } from "utils/bits"
import { TruthTable } from "utils/truthTable"

export class PC {
    // inputs
    public in = bits(0n, 32)
    // output
    public out = bits(0n, 32)
    // state
    public data = 0n; // 32 bits

    tick() {
        this.data = this.in.toInt() // edge-triggered write
        this.out = bits(this.data, 32)
    }
}

export class Control {
    // inputs
    public opCode = bits(0n, 7)
    public funct3 = bits(0n, 3)

    // outputs
    public aluSrc: Bit = 0
    public writeSrc = bits(0n, 2)
    public regWrite: Bit = 0
    public memRead: Bit = 0
    public memWrite: Bit = 0
    public branchZero: Bit = 0
    public branchNotZero: Bit = 0
    public jump: Bit = 0
    public jalr: Bit = 0
    public aluOp = bits(0n, 3)

    private static table = new TruthTable<[Bit, Bits, Bit, Bit, Bit, Bits]>([
        //  opcode   | aluSrc | writeSrc | regWrite | memRead | memWrite |  aluOp |
        [["0110011"], [  0,      b`00`,       1,         0,        0,      b`010`]], // R-format
        [["0010011"], [  1,      b`00`,       1,         0,        0,      b`011`]], // I-format
        [["0000011"], [  1,      b`01`,       1,         1,        0,      b`000`]], // ld
        [["0100011"], [  1,      b`00`,       0,         0,        1,      b`000`]], // st
        [["1100011"], [  0,      b`00`,       0,         0,        0,      b`001`]], // branch
        [["110X111"], [  0,      b`10`,       1,         0,        0,      b`000`]], // jal/jalr (Don't care aluOp)
        [["0110111"], [  1,      b`00`,       1,         0,        0,      b`100`]], // lui
    ])

    private static branchTable = new TruthTable<[Bit, Bit, Bit, Bit]>([
        // opcode  | funct3 | branchZero | branchNotZero | jump | jalr
        [["1100011", "000"], [     1,           0,          0,     0]], // beq
        [["1100011", "1X1"], [     1,           0,          0,     0]], // bge, bgeu
        [["1100011", "001"], [     0,           1,          0,     0]], // bne
        [["1100011", "1X0"], [     0,           1,          0,     0]], // blt, bltu
        [["1101111", "XXX"], [     0,           0,          1,     0]], // jal
        [["1100111", "000"], [     0,           0,          1,     1]], // jalr
        [["XXXXXXX", "XXX"], [     0,           0,          0,     0]], // not a branch
    ])

    public tick() {
        [this.aluSrc, this.writeSrc, this.regWrite, this.memRead, this.memWrite, this.aluOp] = Control.table.match(this.opCode);
        [this.branchZero, this.branchNotZero, this.jump, this.jalr] = Control.branchTable.match(this.opCode, this.funct3)
    }
}

export class ALUControl {
    // inputs
    // tells us if op is (000) load/store, (001) branch, (010) R-type, (011) I-type, (100) lui
    public aluOp = bits(0n, 3)
    public funct7 = bits(0n, 7)
    public funct3 = bits(0n, 3)

    // output
    public aluControl = bits(0n, 4)

    private static table = new TruthTable([
        // ALUOp |  funct7  | funct3 |   ALUControl // instr  -> op
        [[ "000",  "XXXXXXX", "XXX"  ],   b`0010`], // memory -> add

        [[ "001",  "XXXXXXX", "00X"  ],   b`0110`], // beq/bne   -> sub
        [[ "001",  "XXXXXXX", "10X"  ],   b`0111`], // blt/bge   -> slt
        [[ "001",  "XXXXXXX", "11X"  ],   b`1111`], // bltu/bgeu -> sltu

        [[ "010",  "0000000", "000"  ],   b`0010`], // add    -> add
        [[ "011",  "XXXXXXX", "000"  ],   b`0010`], // addi   -> add
        [[ "010",  "0100000", "000"  ],   b`0110`], // sub    -> sub
        [[ "010",  "0000000", "111"  ],   b`0000`], // and    -> AND
        [[ "011",  "XXXXXXX", "111"  ],   b`0000`], // andi   -> AND
        [[ "010",  "0000000", "110"  ],   b`0001`], // or     -> OR
        [[ "011",  "XXXXXXX", "110"  ],   b`0001`], // ori    -> OR
        [[ "010",  "0000000", "100"  ],   b`1100`], // xor    -> XOR
        [[ "011",  "XXXXXXX", "100"  ],   b`1100`], // xori   -> XOR
        [[ "010",  "0000000", "010"  ],   b`0111`], // slt    -> slt
        [[ "011",  "XXXXXXX", "010"  ],   b`0111`], // slti   -> slt
        [[ "010",  "0000000", "011"  ],   b`1111`], // sltu   -> sltu
        [[ "011",  "XXXXXXX", "011"  ],   b`1111`], // sltiu  -> sltu
        [[ "01X",  "0000000", "001"  ],   b`1000`], // sll(i) -> sll
        [[ "01X",  "0000000", "101"  ],   b`1001`], // srl(i) -> srl
        [[ "01X",  "0100000", "101"  ],   b`1011`], // sra(i) -> sra
        [[ "100",  "XXXXXXX", "XXX"  ],   b`1101`], // lui    -> lui
    ])

    tick() {
        this.aluControl = ALUControl.table.match(this.aluOp, this.funct7, this.funct3)
    }
}

export class ALU {
    // input
    public in1 = bits(0n, 32)
    public in2 = bits(0n, 32)
    public aluControl = bits(0n, 4)
    
    // output
    public result = bits(0n, 32)
    public zero: Bit = 0

    // whether to interpret operands as signed or unsigned
    private static tableSigned = new TruthTable([
        // (bigint doesn't have >>>, but if we interpret as unsigned it will work)
        [["1001"], false], // shift right logical 
        [["1111"], false], // set on less than unsigned
        [["XXXX"], true],
    ])

    private static table = new TruthTable<(a: bigint, b: bigint) => bigint>([
        [["0000"], (a, b) => a & b           ], // AND
        [["0001"], (a, b) => a | b           ], // OR
        [["0010"], (a, b) => a + b           ], // add
        [["0110"], (a, b) => a - b           ], // subtract
        [["X111"], (a, b) => BigInt(a < b)   ], // set on less than (unsigned)
        [["1000"], (a, b) => a << (b & 0x1Fn)], // shift left logical
        [["10X1"], (a, b) => a >> (b & 0x1Fn)], // shift right logical/arithmetic
        [["1100"], (a, b) => a ^ b           ], // xor
        [["1101"], (a, b) => (b << 12n)      ], // lui
    ])

    tick() {
        const signed = ALU.tableSigned.match(this.aluControl)
        const [a, b] = [this.in1.toInt(signed), this.in2.toInt(signed)]

        const op = ALU.table.match(this.aluControl)
        const resultInt = op(a, b)

        this.result = bits(resultInt, 33).slice(0, 32) // give room for overflow, then discard extra.
        this.zero = bit(this.result.toInt() == 0n)
    }
}

export class ImmGen {
    // inputs
    public instruction = bits(0n, 32)

    // outputs
    public immediate: Bits = bits(0n, 32)

    private static table = new TruthTable<(i: Bits) => Bits>([
        [["1100011"], (i) => // SB-type -> imm[12|10:5] | rs2 | rs1 | funct3 | imm[4:1|11]
            Bits.join([i.at(31)], [i.at(7)], i.slice(25,31), i.slice(8, 12), [0]) // RISC-V uses LSB 0
        ], 
        [["0100011"], (i) => // S-type -> imm[11:5] | rs2 | rs1 | funct3 | imm[4:0]
            Bits.join(i.slice(25, 32), i.slice(7, 12))
        ],
        [["0X10111"], (i) => // U-type -> imm[19:0] | rd | opcode
            i.slice(12, 32)
        ],
        [["1101111"], (i) => // UJ-type -> imm[20|10:1|11|19:12] | rd | opcode
            Bits.join([i.at(31)], i.slice(12, 20), [i.at(20)], i.slice(21,31), [0])
        ],
        [["1100111"], (i) => // I-type (JALR) -> imm[11:0] | rs1 | funct3 | rd
            i.slice(20, 32)
        ],
        [["00X0011"], (i) => // I-type -> imm[11:0] | rs1 | funct3 | rd
            i.slice(20, 32)
        ],
        [["0110011"], (i) => // R-type -> no immediate
            b`0`
        ],
    ])

    tick() {
        const opcode = this.instruction.slice(0, 7)
        const fun = ImmGen.table.match(opcode)
        const imm = fun(this.instruction)
        this.immediate = imm.extend(32, true)
    }
}

export class RegisterFile {
    // inputs
    public readReg1 = bits(0n, 5)
    public readReg2 = bits(0n, 5)
    public regWrite: Bit = 0
    public writeReg = bits(0n, 5)
    public writeData = bits(0n, 32)

    // outputs
    public readData1 = bits(0n, 32)
    public readData2 = bits(0n, 32)

    // state
    public registers: bigint[]; // stored as unsigned ints

    constructor() {
        this.registers = Array(32).fill(0n)
    }

    tick() {
        if (this.regWrite) { // edge-triggered write
            const writeReg = this.writeReg.toNumber()
            if (writeReg != 0) { // Ignore writes to zero reg
                this.registers[writeReg] = this.writeData.toInt()
            }
        }

        this.readData1 = bits(this.registers[this.readReg1.toNumber()], 32)
        this.readData2 = bits(this.registers[this.readReg2.toNumber()], 32)
    }
}

export class InstructionMemory {
    // inputs
    public address = bits(0n, 32)

    // outputs
    public instruction = bits(0n, 32)

    // state
    public data: Memory;

    constructor() {
        this.data = new Memory(2n**32n)
    }

    tick() {
        this.instruction = bits(this.data.loadWord(this.address.toInt()), 32)
    }
}

/** Splits the instruction into named logical sections. */
export class InstructionSplitter {
    // inputs
    public instruction = bits(0n, 32)

    // outputs
    public opCode = bits(0n, 7)
    public rd = bits(0n, 5)
    public funct3 = bits(0n, 3)
    public rs1 = bits(0n, 5)
    public rs2 = bits(0n, 5)
    public funct7 = bits(0n, 7)

    tick() {
        this.opCode = this.instruction.slice(0, 7)
        this.rd = this.instruction.slice(7, 12)
        this.funct3 = this.instruction.slice(12, 15)
        this.rs1 = this.instruction.slice(15, 20)
        this.rs2 = this.instruction.slice(20, 25)
        this.funct7 = this.instruction.slice(25, 32)
    }

}

/**
 * Chooses between signed/unsigned and byte/half-word/word
 * This component won't be rendered to keep the animation simpler.
 * Doesn't worry about whether we are actually using memory this cycle, since memRead/memWrite will be off
 * anyways.
 */
export class MemoryControl {
    // inputs
    public funct3 = bits(0n, 3)

    // outputs
    public size = bits(0n, 2)
    public signed: Bit = 0

    private static table = new TruthTable<[Bits, Bit]>([
        [["000"], [b`00`, 1]], // lb/sb
        [["001"], [b`01`, 1]], // lh/sh
        [["010"], [b`10`, 1]], // lw/sw
        [["100"], [b`00`, 0]], // lbu
        [["101"], [b`01`, 0]], // lhu
        [["XXX"], [b`00`, 0]], // don't care
    ])

    tick() {
        [this.size, this.signed] = MemoryControl.table.match(this.funct3)
    }
}

export class DataMemory {
    // inputs
    public memRead: Bit = 0
    public memWrite: Bit = 0
    public address = bits(0n, 32)
    public writeData = bits(0n, 32)

    public size = bits(0n, 2)
    public signed: Bit = 0 // 1 bit (whether to sign extend the output from memory)

    // outputs
    public readData = bits(0n, 32)

    // state
    public data: Memory;
    private static table = new TruthTable<number>([
        [["00"], 1], // byte
        [["01"], 2], // half-word
        [["10"], 4], // word
    ])

    constructor() {
        this.data = new Memory(2n**32n)
    }

    tick() {
        if (this.memRead && this.memWrite) throw Error("Only memRead or memWrite allowed")
        const bytes = DataMemory.table.match(this.size)
 
        this.readData = bits(0n, 32) // Not required but will make visualization clearer
        if (this.memRead) {
            const dataInt = this.data.load(this.address.toInt(), bytes)
            const dataBits = bits(dataInt, bytes * 8) // memory returns an unsigned int.
            this.readData = dataBits.extend(32, !!this.signed) // sign extend to 32 bits (if signed)
        } else if (this.memWrite) {
            const data = this.writeData.slice(0, bytes * 8)
            this.data.store(this.address.toInt(), bytes, data.toInt()) // always store as unsigned
        }
    }
}

export class JumpControl {
    // inputs
    public branchZero: Bit = 0
    public branchNotZero: Bit = 0
    public jump: Bit = 0
    public zero: Bit = 0

    // outputs
    public takeBranch: Bit = 0

    tick() {
        this.takeBranch = bit(this.jump || (this.branchZero && this.zero) || (this.branchNotZero && !this.zero))
    }
}

/**
 * Just an adder, but word-aligns the output (to 2-byte words).
 * RISC-V JALR drops the lowest bit of the calculated address.
 * 
 */
export class BranchAdder {
    // input
    public in1 = bits(0n, 32)
    public in2 = bits(0n, 32)
    
    // output
    public result = bits(0n, 32)

    tick() {
        const resultInt = this.in1.toInt(true) + this.in2.toInt(true)
        // handle overflow (which can occur when non-branch instructions are run) and drop lowest bit to word-align to 2-byte instructions
        this.result = bits(resultInt, 33).slice(0, 32).set(0, 0)
    }
}

export class And {
    // input
    public in

    // output
    public out: Bit = 0

    constructor(public readonly length: number) {
        this.in = bits(0n, length)
    }

    tick() {
        this.out = bit(~this.in.toInt() == 0n)
    }
}


export class Or {
    // input
    public in = bits(0n, 2)

    // output
    public out: Bit = 0

    constructor(public readonly length: number) {
        this.in = bits(0n, length)
    }

    tick() {
        this.out = bit(this.in.toInt() != 0n)
    }
}

export class Not {
    // input
    public in: Bit = 0

    // output
    public out: Bit = 0

    tick() {
        this.out = bit(!this.in)
    }
}

/** Select between inputs */
export class Mux {
    // inputs
    public in: Bits[]
    public select: Bits

    // outputs
    public out: Bits

    constructor(public readonly choices: number, public readonly length: number) {
        this.in = Array(choices).fill(undefined).map(() => bits(0n, length))
        this.select = bits(0n, Math.ceil(Math.log2(choices)))
        this.out = bits(0n, length)
    }

    tick() {
        const index = this.select.toNumber()
        if (index >= this.choices) throw Error(`Mux select ${index} out of range`)
        this.out = this.in[index]
    }
}