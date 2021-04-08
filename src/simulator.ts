import { Bit, Bits, b, to_twos_complement } from "./utils"
import * as Comp from "./components"

export class Simulator {
    // static fields
    public static readonly regNames = [
        "zero", "ra", "sp",  "gp",  "tp", "t0", "t1", "t2",
        "s0",   "s1", "a0",  "a1",  "a2", "a3", "a4", "a5",
        "a6",   "a7", "s2",  "s3",  "s4", "s5", "s6", "s7",
        "s8",   "s9", "s10", "s11", "t3", "t4", "t5", "t6",
    ]

    // components
    public pc: Comp.PC
    public instrMem: Comp.InstructionMemory
    public memControl: Comp.MemoryControl // We don't render this to keep things simple
    public dataMem: Comp.DataMemory
    public regFile: Comp.RegisterFile
    public control: Comp.Control
    public immGen: Comp.ImmGen
    public aluControl: Comp.ALUControl
    public alu: Comp.ALU
    
    public pcAdd4: Comp.ALU
    public jalrMux: Comp.Mux
    public branchAdder: Comp.ALU
    public jumpControl: Comp.JumpControl

    public pcMux: Comp.Mux
    public aluInputMux: Comp.Mux
    public writeSrcMux: Comp.Mux

    constructor(code: bigint[], regs: Record<number, bigint> = {}) {
        this.pc = new Comp.PC()
        this.instrMem = new Comp.InstructionMemory()
        this.memControl = new Comp.MemoryControl()
        this.dataMem = new Comp.DataMemory()
        this.regFile = new Comp.RegisterFile()
        this.control = new Comp.Control()
        this.immGen = new Comp.ImmGen()
        this.aluControl = new Comp.ALUControl()
        this.alu = new Comp.ALU()
    
        this.pcAdd4 = new Comp.ALU()
        this.jalrMux = new Comp.Mux(2)
        this.branchAdder = new Comp.ALU()
        this.jumpControl = new Comp.JumpControl()
        
        this.pcMux = new Comp.Mux(2)
        this.aluInputMux = new Comp.Mux(2)
        this.writeSrcMux = new Comp.Mux(3)

        let text_start = 0x0000_0000n // typically this would be 0x0001_0000 but lets use zero for simplicity.

        // initialize code memory
        this.instrMem.data.storeArray(text_start, 4, code)

        // Initialize registers sp and gp
        regs = Object.assign({2: 0xbffffff0n, 3: 0x10008000n}, regs)
        
        // initialize registers
        for (let reg in regs) {
            this.regFile.registers[reg] = to_twos_complement(regs[reg])
        }

        // These values need to be initialized since they are set until the end of the tick
        this.pc.in = Bits(text_start, 32)
        this.regFile.regWrite = 0
    }

    tick() {
        // this.pc.in is set at the end.
        // tick() will set it to the value set during the previous tick.
        this.pc.tick()

        this.instrMem.address = this.pc.out
        this.instrMem.tick()
        let instr = this.instrMem.instruction

        this.control.opCode = instr.slice(0, 7)
        this.control.funct3 = instr.slice(12, 15)
        this.control.tick()

        this.regFile.readReg1 = instr.slice(15, 20)
        this.regFile.readReg2 = instr.slice(20, 25)
        // regWrite, writeReg, and writeData are set at the end.
        // tick() will write data from the previous tick.
        this.regFile.tick()

        this.immGen.instruction = instr
        this.immGen.tick()

        this.aluControl.aluOp = this.control.aluOp
        this.aluControl.funct3 = instr.slice(12, 15)
        this.aluControl.funct7 = instr.slice(25, 32)
        this.aluControl.tick()

        this.aluInputMux.in[0] = this.regFile.readData2
        this.aluInputMux.in[1] = this.immGen.immediate
        this.aluInputMux.select = [this.control.aluSrc] 
        this.aluInputMux.tick()

        this.alu.in1 = this.regFile.readData1
        this.alu.in2 = this.aluInputMux.out
        this.alu.aluControl = this.aluControl.aluControl
        this.alu.tick()

        this.memControl.funct3 = instr.slice(12, 15)
        this.memControl.tick()

        this.dataMem.address = this.alu.result
        this.dataMem.writeData = this.regFile.readData2
        this.dataMem.memRead = this.control.memRead
        this.dataMem.memWrite = this.control.memWrite
        this.dataMem.signed = this.memControl.signed
        this.dataMem.size = this.memControl.size
        this.dataMem.tick()

        this.pcAdd4.aluControl = b`0010` // add
        this.pcAdd4.in1 = this.pc.out
        this.pcAdd4.in2 = Bits(4n, 32)
        this.pcAdd4.tick()

        this.jalrMux.in[0] = this.pc.out
        this.jalrMux.in[1] = this.regFile.readData1
        this.jalrMux.select = [this.control.jalr]
        this.jalrMux.tick()

        this.branchAdder.aluControl = b`0010` // add
        this.branchAdder.in1 = this.jalrMux.out
        this.branchAdder.in2 = this.immGen.immediate
        this.branchAdder.tick()

        this.jumpControl.branchZero = this.control.branchZero
        this.jumpControl.branchNotZero = this.control.branchNotZero
        this.jumpControl.jump = this.control.jump
        this.jumpControl.zero = this.alu.zero
        this.jumpControl.tick()

        this.pcMux.in[0] = this.pcAdd4.result
        this.pcMux.in[1] = this.branchAdder.result
        this.pcMux.select = [this.jumpControl.takeBranch]
        this.pcMux.tick()

        this.writeSrcMux.in[0] = this.alu.result
        this.writeSrcMux.in[1] = this.dataMem.readData
        this.writeSrcMux.in[2] = this.pcAdd4.result
        this.writeSrcMux.select = this.control.writeSrc
        this.writeSrcMux.tick()

        // The backwards wires
        this.pc.in = this.pcMux.out
        this.regFile.regWrite = this.control.regWrite
        this.regFile.writeData = this.writeSrcMux.out
        this.regFile.writeReg = instr.slice(7, 12)
    }

    /** Runs the simulator until the end of the code. */
    run() {
        // 0000000 is not a valid opcode, so we can just quit when we hit all 0s.
        while (this.instrMem.data.loadWord(Bits.toInt(this.pc.in)) != 0n) {
            this.tick()
        }
        // Make the pc and regFile update for the final tick.
        this.pc.tick()
        this.regFile.tick()
    }
}
