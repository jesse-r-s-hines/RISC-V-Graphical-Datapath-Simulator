import {Memory} from "./memory"
import {Bit, Bits, TruthTable} from "./utils"

export class PC {
    // inputs
    public in: Bits = [] // 64 b its
    // output
    public out: Bits = []; // 64 bits
    // state
    private data: Bits = []; // 64 bits

    tick() {
        this.data = this.in
        this.out = this.data
    }
}

export class Control {
    // inputs
    public opCode: Bits = [] // 7 bits

    // outputs
    public aluSrc: Bit = 0
    public memToReg: Bit = 0
    public regWrite: Bit = 0
    public memRead: Bit = 0
    public memWrite: Bit = 0
    public branch: Bit = 0
    public aluOp: Bits = [] // 2 bits

    private static table = new TruthTable<[Bit, Bit, Bit, Bit, Bit, Bit, Bits]>([
        //  opcode   | aluSrc | memToReg | regWrite | memRead | memWrite | branch |        aluOp |
        [["0110011"], [  0,        0,         1,         0,        0,        0,   Bits.from("10")]], // R-format
        [["0000011"], [  1,        1,         1,         1,        0,        0,   Bits.from("00")]], // ld
        [["0100011"], [  1,        0,         0,         0,        1,        0,   Bits.from("00")]], // st
        [["1100011"], [  0,        0,         0,         0,        0,        1,   Bits.from("01")]], // beq
    ])

    public tick() {
        [this.aluSrc, this.memToReg, this.regWrite, this.memRead, this.memWrite, this.branch, this.aluOp] = Control.table.match([this.opCode])
    }
}

export class ALUControl {
    // inputs
    // tells us if op is (00) add for load/store, (01) subtract for beq, (10) determined by funct7 and funct3
    public aluOp: Bits = [] // 7 bits
    public funct7: Bits = [] // 7 bits
    public funct3: Bits = [] // 3 bits

    // output
    public aluControl: Bits = [] // 4 bits

    private static table = new TruthTable([
        // ALUOp | funct7  | funct3 | ALUControl  // instr  -> op
        [[ "00",  "XXXXXXX", "XXX"  ], Bits.from("0010")], // memory -> add
        [[ "01",  "XXXXXXX", "XXX"  ], Bits.from("0110")], // branch -> sub
        [[ "10",  "0000000", "000"  ], Bits.from("0010")], // add    -> add
        [[ "10",  "0100000", "000"  ], Bits.from("0110")], // sub    -> sub
        [[ "10",  "0000000", "111"  ], Bits.from("0000")], // and    -> AND
        [[ "10",  "0000000", "110"  ], Bits.from("0001")], // or     -> OR
        // TODO do I need a catch all?
    ])

    tick() {
        this.aluControl = ALUControl.table.match([this.aluOp, this.funct7, this.funct3])
    }
}

export class ALU {
    // input
    public in1: Bits = [] // 64 bits
    public in2: Bits = [] // 64 bits
    public aluControl: Bits = [] // 4 bits
    
    // output
    public result: Bits = [] // 64 bits
    public zero: Bit = 0

    private static table = new TruthTable<(a: bigint, b: bigint) => bigint>([
        [["0000"], (a, b) => a & b], // AND
        [["0001"], (a, b) => a | b], // OR
        [["0010"], (a, b) => a + b], // add
        [["0110"], (a, b) => a - b], // subtract
    ])

    tick() {
        let op = ALU.table.match([this.aluControl])
        let resultInt = op(Bits.toInt(this.in1), Bits.toInt(this.in2))

        this.result = Bits.from(resultInt, 64, true)
        this.zero = (resultInt == 0n)
    }
}

export class ImmGen {
    // inputs
    public instruction: Bits = [] // 32 bits

    // outputs
    public immediate: Bits = []// 64 bits

    tick() {
        let instr = this.instruction
        let opcode = instr.slice(0, 7)
        let imm: Bits

        // There are 5 possible immediate formats. Only using 3 currently
        // opcode[6] is 0 for data transfer instructions and 1 for conditional branches
        // opcode[5] is 0 for load instructions and 1 for store
        if (opcode[6]) { // branch, SB format
            // imm[12|10:5] | rs2 | rs1 | funct3 | imm[4:1|11]
            imm = [0, ...instr.slice(8, 12), ...instr.slice(25,31), instr[7], instr[32]] // backwards LSB 0
        } else if (opcode[5]) { // store, S format
            // imm[11:5] | rs2 | rs1 | funct3 | imm[4:0]
            imm = [...instr.slice(7, 12), ...instr.slice(25, 32)] // LSB 0
        } else { // load, I format
            // imm[11:0] | rs1 | funct3 | rd
            imm = instr.slice(20, 32)
        }

        this.immediate = Bits.extended(imm, 64, true)
    }
}

export class RegisterFile {
    // inputs
    public readReg1: Bits = [] // 5 bits
    public readReg2: Bits = [] // 5 bits
    public regWrite: Bit = 0
    public writeReg: Bits = [] // 5 bits
    public writeData: Bits = [] // 64 bits

    // outputs
    public readData1: Bits = [] // 64 bits
    public readData2: Bits = [] // 64 bits

    // state
    private registers: bigint[];

    constructor() {
        this.registers = Array(32).fill(0n)
    }

    tick() {
        if (this.regWrite) { // edge-triggered write
            let i = 
            this.registers[Bits.toNumber(this.writeReg)] = Bits.toInt(this.writeData)
        }

        this.readData1 = Bits.from(this.registers[Bits.toNumber(this.readReg1)], 64, true)
        this.readData2 = Bits.from(this.registers[Bits.toNumber(this.readReg2)], 64, true)
    }
}

export class InstructionMemory {
    // inputs
    public address: Bits = [] // 64 bits

    // outputs
    public readData: Bits = [] // 32 bits

    // state
    private data: Memory;

    constructor() {
        this.data = new Memory(2n**64n)
    }

    tick() {
        this.readData = Bits.from(this.data.loadWord(Bits.toInt(this.address)), 32, true)
    }
}

export class DataMemory {
    // inputs
    public memRead: Bit = 0
    public memWrite: Bit = 0
    public address: Bits = [] // 64 bits
    public writeData: Bits = [] // 64 bits

    // outputs
    public readData: Bits = [] // 64 bits

    // state
    private data: Memory;

    constructor() {
        this.data = new Memory(2n**64n)
    }

    tick() {
        if (this.memRead && this.memWrite) throw Error("Only memRead or memWrite allowed")

        if (this.memRead) {
            this.readData = Bits.from(this.data.loadDoubleWord(Bits.toInt(this.address)), 64, true)
        } else if (this.memWrite) {
            this.data.storeDoubleWord(Bits.toInt(this.address), Bits.toInt(this.writeData))
            this.readData = Bits.from(0n, 64) // Not required but will make visualization clearer
        }
    }
}

export class AndGate {
    // input
    public in1: Bit = 0
    public in2: Bit = 0

    // output
    public out: Bit = 0

    tick() {
        this.out = this.in1 && this.in2
    }
}

/** Select between 2 64 bit inputs, in1 on 0, in2 on 1. */
export class Mux2to1 {
    // inputs
    public in1: Bits = []
    public in2: Bits = []
    public select: Bit = 0
    // outputs
    public out: Bits = []

    tick() {
        this.out = this.select ? this.in2 : this.in1
    }
}