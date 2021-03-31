import {Memory} from "./memory"
import {Bit, Bits, TruthTable} from "./utils"

export class PC {
    // inputs
    public in: Bits = [] // 32 bits
    // output
    public out: Bits = []; // 32 bits
    // state
    public data: bigint = 0n; // 32 bits

    constructor() {
    }

    tick() {
        this.data = Bits.toInt(this.in) // edge-triggered write
        this.out = Bits(this.data, 32)
    }
}

export class Control {
    // inputs
    public opCode: Bits = [] // 7 bits
    public funct3: Bits = [] // 3 bits

    // outputs
    public aluSrc: Bit = 0
    public memToReg: Bit = 0
    public regWrite: Bit = 0
    public memRead: Bit = 0
    public memWrite: Bit = 0
    public branchZero: Bit = 0
    public branchNotZero: Bit = 0
    public aluOp: Bits = [] // 3 bits

    private static table = new TruthTable<[Bit, Bit, Bit, Bit, Bit, Bits]>([
        //  opcode   | aluSrc | memToReg | regWrite | memRead | memWrite |  aluOp |
        [["0110011"], [  0,        0,         1,         0,        0,    Bits("010")]], // R-format
        [["0010011"], [  1,        0,         1,         0,        0,    Bits("011")]], // I-format
        [["0000011"], [  1,        1,         1,         1,        0,    Bits("000")]], // ld
        [["0100011"], [  1,        0,         0,         0,        1,    Bits("000")]], // st
        [["1100011"], [  0,        0,         0,         0,        0,    Bits("001")]], // branch
        [["0110111"], [  1,        0,         1,         0,        0,    Bits("100")]], // lui
    ])

    private static branch_table = new TruthTable<[Bit, Bit]>([
        // opcode  | funct3 | branchZero | branchNotZero |
        [["1100011", "000"], [     1,           0,  ]], // beq
        [["1100011", "1X1"], [     1,           0,  ]], // bge, bgeu
        [["1100011", "001"], [     0,           1,  ]], // bne
        [["1100011", "1X0"], [     0,           1,  ]], // blt, bltu
        [["XXXXXXX", "XXX"], [     0,           0,  ]], // not a branch
    ])

    public tick() {
        [this.aluSrc, this.memToReg, this.regWrite, this.memRead, this.memWrite, this.aluOp] = Control.table.match(this.opCode);
        [this.branchZero, this.branchNotZero] = Control.branch_table.match(this.opCode, this.funct3)
    }
}

export class ALUControl {
    // inputs
    // tells us if op is (000) load/store, (001) branch, (010) R-type, (011) I-type, (100) lui
    public aluOp: Bits = [] // 3 bits
    public funct7: Bits = [] // 7 bits
    public funct3: Bits = [] // 3 bits

    // output
    public aluControl: Bits = [] // 4 bits

    private static table = new TruthTable([
        // ALUOp |  funct7  | funct3 |   ALUControl    // instr  -> op
        [[ "000",  "XXXXXXX", "XXX"  ], Bits("0010")], // memory -> add

        [[ "001",  "XXXXXXX", "00X"  ], Bits("0110")], // beq/bne   -> sub
        [[ "001",  "XXXXXXX", "10X"  ], Bits("0111")], // blt/bge   -> slt
        [[ "001",  "XXXXXXX", "11X"  ], Bits("1111")], // bltu/bgeu -> sltu

        [[ "010",  "0000000", "000"  ], Bits("0010")], // add    -> add
        [[ "011",  "XXXXXXX", "000"  ], Bits("0010")], // addi   -> add
        [[ "010",  "0100000", "000"  ], Bits("0110")], // sub    -> sub
        [[ "010",  "0000000", "111"  ], Bits("0000")], // and    -> AND
        [[ "011",  "XXXXXXX", "111"  ], Bits("0000")], // andi   -> AND
        [[ "010",  "0000000", "110"  ], Bits("0001")], // or     -> OR
        [[ "011",  "XXXXXXX", "110"  ], Bits("0001")], // ori    -> OR
        [[ "010",  "0000000", "100"  ], Bits("1100")], // xor    -> XOR
        [[ "011",  "XXXXXXX", "100"  ], Bits("1100")], // xori   -> XOR
        [[ "010",  "0000000", "010"  ], Bits("0111")], // slt    -> slt
        [[ "011",  "XXXXXXX", "010"  ], Bits("0111")], // slti   -> slt
        [[ "010",  "0000000", "011"  ], Bits("1111")], // sltu   -> sltu
        [[ "011",  "XXXXXXX", "011"  ], Bits("1111")], // sltiu  -> sltu
        [[ "01X",  "0000000", "001"  ], Bits("1000")], // sll(i) -> sll
        [[ "01X",  "0000000", "101"  ], Bits("1001")], // srl(i) -> srl
        [[ "01X",  "0100000", "101"  ], Bits("1011")], // sra(i) -> sra
        [[ "100",  "XXXXXXX", "XXX"  ], Bits("1101")], // lui    -> lui
    ])

    tick() {
        this.aluControl = ALUControl.table.match(this.aluOp, this.funct7, this.funct3)
    }
}

export class ALU {
    // input
    public in1: Bits = [] // 32 bits
    public in2: Bits = [] // 32 bits
    public aluControl: Bits = [] // 4 bits
    
    // output
    public result: Bits = [] // 32 bits
    public zero: Bit = 0

    // whether to interpret operands as signed or unsigned
    private static table_signed = new TruthTable([
        // (bigint doesn't have >>>, but if we interpret as unsigned it will work)
        [["1001"], false], // shift right logical 
        [["1111"], false], // set on less than unsigned
        [["XXXX"], true],
    ])

    private static table = new TruthTable<(a: bigint, b: bigint) => bigint>([
        [["0000"], (a, b) => a & b], // AND
        [["0001"], (a, b) => a | b], // OR
        [["0010"], (a, b) => a + b], // add
        [["0110"], (a, b) => a - b], // subtract
        [["X111"], (a, b) => BigInt(a < b)], // set on less than (unsigned)
        [["1000"], (a, b) => a << (b & 0x1Fn)], // shift left logical
        [["10X1"], (a, b) => a >> (b & 0x1Fn)], // shift right logical/arithmetic
        [["1100"], (a, b) => a ^ b], // xor
        [["1101"], (a, b) => (b << 12n)], // lui
    ])

    tick() {
        let signed = ALU.table_signed.match(this.aluControl)
        let [a, b] = [Bits.toInt(this.in1, signed), Bits.toInt(this.in2, signed)]

        let op = ALU.table.match(this.aluControl)
        let resultInt = op(a, b)

        this.result = Bits(resultInt, 32, signed)
        this.zero = (resultInt == 0n)
    }
}

export class ImmGen {
    // inputs
    public instruction: Bits = [] // 32 bits

    // outputs
    public immediate: Bits = []// 32 bits

    private static table = new TruthTable<(i: Bits) => Bits>([
        [["1100011"], (i) => // SB-type -> imm[12|10:5] | rs2 | rs1 | funct3 | imm[4:1|11]
            [0, ...i.slice(8, 12), ...i.slice(25,31), i[7], i[32]] // backwards LSB 0
        ], 
        [["0100011"], (i) => // S-type -> imm[11:5] | rs2 | rs1 | funct3 | imm[4:0]
            [...i.slice(7, 12), ...i.slice(25, 32)] // LSB 0
        ],
        [["0X10111"], (i) => // U-type -> imm[31:12] | rd | opcode
            i.slice(12, 32)
        ],
        [["1101111"], (i) => // UJ-type -> imm[20|10:1|11|19:12] | rd | opcode
            [0, ...i.slice(21,31), i[20], ...i.slice(12, 20), i[31]] // backwards LSB 0
        ],
        [["1100111"], (i) => // I-type (JALR) -> imm[11:0] | rs1 | funct3 | rd
            i.slice(20, 32)
        ],
        [["00X0011"], (i) => // I-type -> imm[11:0] | rs1 | funct3 | rd
            i.slice(20, 32)
        ],
        [["0110011"], (i) => // R-type -> no immediate
            Bits("0")
        ],
    ])

    tick() {
        let opcode = this.instruction.slice(0, 7)
        let fun = ImmGen.table.match(opcode)
        let imm = fun(this.instruction)
        this.immediate = Bits.extended(imm, 32, true)
    }
}

export class RegisterFile {
    // inputs
    public readReg1: Bits = [] // 5 bits
    public readReg2: Bits = [] // 5 bits
    public regWrite: Bit = 0
    public writeReg: Bits = [] // 5 bits
    public writeData: Bits = [] // 32 bits

    // outputs
    public readData1: Bits = [] // 32 bits
    public readData2: Bits = [] // 32 bits

    // state
    public registers: bigint[];

    constructor() {
        this.registers = Array(32).fill(0n)
    }

    tick() {
        if (this.regWrite) { // edge-triggered write
            let writeReg = Bits.toNumber(this.writeReg)
            if (writeReg != 0) { // Ignore writes to zero reg
                this.registers[writeReg] = Bits.toInt(this.writeData, true)
            }
        }

        this.readData1 = Bits(this.registers[Bits.toNumber(this.readReg1)], 32, true)
        this.readData2 = Bits(this.registers[Bits.toNumber(this.readReg2)], 32, true)
    }
}

export class InstructionMemory {
    // inputs
    public address: Bits = [] // 32 bits

    // outputs
    public instruction: Bits = [] // 32 bits

    // state
    public data: Memory;

    constructor() {
        this.data = new Memory(2n**32n)
    }

    tick() {
        this.instruction = Bits(this.data.loadWord(Bits.toInt(this.address)), 32)
    }
}

export class DataMemory {
    // inputs
    public memRead: Bit = 0
    public memWrite: Bit = 0
    public address: Bits = [] // 32 bits
    public writeData: Bits = [] // 32 bits

    // outputs
    public readData: Bits = [] // 32 bits

    // state
    public data: Memory;

    constructor() {
        this.data = new Memory(2n**32n)
    }

    tick() {
        if (this.memRead && this.memWrite) throw Error("Only memRead or memWrite allowed")

        if (this.memRead) {
            this.readData = Bits(this.data.loadWord(Bits.toInt(this.address)), 32, true)
        } else if (this.memWrite) {
            this.data.storeWord(Bits.toInt(this.address), Bits.toInt(this.writeData, true))
            this.readData = Bits(0n, 32) // Not required but will make visualization clearer
        }
    }
}

export class JumpControl {
    // inputs
    public branchZero: Bit = 0
    public branchNotZero: Bit = 0
    public zero: Bit = 0

    // outputs
    public takeBranch: Bit = 0

    tick() {
        this.takeBranch = +((this.branchZero && this.zero) || (this.branchNotZero && !this.zero))
    }
}

export class And {
    // input
    public in: Bit[] = []

    // output
    public out: Bit = 0

    tick() {
        this.out = +this.in.every(x => x)
    }
}


export class Or {
    // input
    public in: Bit[] = []

    // output
    public out: Bit = 0

    tick() {
        this.out = +this.in.some(x => x)
    }
}

export class Not {
    // input
    public in: Bit = 0

    // output
    public out: Bit = 0

    tick() {
        this.out = +!this.in
    }
}

/** Select between inputs */
export class Mux {
    // inputs
    public in: Bits[] = []
    public select: Bit[] = []

    // outputs
    public out: Bits = []

    readonly size;

    constructor(size: number) {
        this.size = size
    }

    tick() {
        this.out = this.in[Bits.toNumber(this.select)]
    }
}