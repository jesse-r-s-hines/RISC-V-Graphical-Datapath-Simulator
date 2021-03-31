import {Bit, Bits, twos_complement} from "./utils"
import * as Comp from "./components"
import {Memory} from "./memory"

export class Simulator {
    // components
    public pc: Comp.PC
    public instrMem: Comp.InstructionMemory
    public dataMem: Comp.DataMemory
    public regFile: Comp.RegisterFile
    public control: Comp.Control
    public immGen: Comp.ImmGen
    public aluControl: Comp.ALUControl
    public alu: Comp.ALU
    
    public pcAdd4: Comp.ALU
    public branchAdder: Comp.ALU
    public jumpControl: Comp.JumpControl

    public pcMux: Comp.Mux
    public aluInputMux: Comp.Mux
    public writeSrcMux: Comp.Mux

    constructor(code: bigint[], regs: Record<number, bigint> = {}) {
        this.pc = new Comp.PC()
        this.instrMem = new Comp.InstructionMemory()
        this.dataMem = new Comp.DataMemory()
        this.regFile = new Comp.RegisterFile()
        this.control = new Comp.Control()
        this.immGen = new Comp.ImmGen()
        this.aluControl = new Comp.ALUControl()
        this.alu = new Comp.ALU()
    
        this.pcAdd4 = new Comp.ALU()
        this.branchAdder = new Comp.ALU()
        this.jumpControl = new Comp.JumpControl()
        
        this.pcMux = new Comp.Mux(2)
        this.aluInputMux = new Comp.Mux(2)
        this.writeSrcMux = new Comp.Mux(3)

        let text_start = 0x0001_0000n

        // initialize code memory
        for (let [i, instr] of code.entries()) {
            this.instrMem.data.storeWord(text_start + 4n * BigInt(i), instr)
        }

        // Initialize registers sp and gp
        regs = Object.assign({2: 0xbffffff0n, 3: 0x10008000n}, regs)
        
        // initialize registers
        for (let reg in regs) {
            this.regFile.registers[reg] = twos_complement(regs[reg])
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

        this.dataMem.address = this.alu.result
        this.dataMem.writeData = this.regFile.readData2
        this.dataMem.memRead = this.control.memRead
        this.dataMem.memWrite = this.control.memWrite
        this.dataMem.tick()

        this.pcAdd4.aluControl = Bits("0010") // add
        this.pcAdd4.in1 = this.pc.out
        this.pcAdd4.in2 = Bits(4n, 32)
        this.pcAdd4.tick()

        this.branchAdder.aluControl = Bits("0010") // add
        this.branchAdder.in1 = this.pc.out
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

        return true
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
