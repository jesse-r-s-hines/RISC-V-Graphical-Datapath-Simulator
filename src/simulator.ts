import {Bit, Bits} from "./utils"
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
    public branchAnd: Comp.AndGate
    public pcMux: Comp.Mux2to1
    public aluInputMux: Comp.Mux2to1
    public memOrAluMux: Comp.Mux2to1

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
        this.branchAnd = new Comp.AndGate()
        this.pcMux = new Comp.Mux2to1()
        this.aluInputMux = new Comp.Mux2to1()
        this.memOrAluMux = new Comp.Mux2to1()

        // These values need to be initialized since they are set until the end of the tick
        this.pc.in = Bits(0x0001_0000n, 32)
        this.regFile.regWrite = 0

        // initialize code memory
        for (let [i, instr] of code.entries()) {
            this.instrMem.data.storeWord(this.pc.data + 4n * BigInt(i), instr)
        }

        // Initialize registers sp and gp
        regs = Object.assign({2: 0xbffffff0n, 3: 0x10008000n}, regs)
        
        // initialize registers
        for (let reg in regs) {
            this.regFile.registers[reg] = regs[reg]
        }
    }

    tick() {
        // this.pc.in is set at the end.
        // tick() will set it to the value set during the previous tick.
        this.pc.tick()

        this.instrMem.address = this.pc.out
        this.instrMem.tick()
        let instr = this.instrMem.instruction

        this.control.opCode = instr.slice(0, 7)
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

        this.aluInputMux.in0 = this.regFile.readData2
        this.aluInputMux.in1 = this.immGen.immediate
        this.aluInputMux.select = this.control.aluSrc 
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

        this.memOrAluMux.in0 = this.alu.result
        this.memOrAluMux.in1 = this.dataMem.readData
        this.memOrAluMux.select = this.control.memToReg
        this.memOrAluMux.tick()

        this.pcAdd4.aluControl = Bits("0010") // add
        this.pcAdd4.in1 = this.pc.out
        this.pcAdd4.in2 = Bits(4n, 32)
        this.pcAdd4.tick()

        this.branchAdder.aluControl = Bits("0010") // add
        this.branchAdder.in1 = this.pc.out
        this.branchAdder.in2 = this.immGen.immediate
        this.branchAdder.tick()

        this.branchAnd.in1 = this.control.branch
        this.branchAnd.in2 = this.alu.zero
        this.branchAnd.tick()

        this.pcMux.in0 = this.pcAdd4.result
        this.pcMux.in1 = this.branchAdder.result
        this.pcMux.select = this.branchAnd.out
        this.pcMux.tick()

        // The backwards wires
        this.pc.in = this.pcMux.out
        this.regFile.regWrite = this.control.regWrite
        this.regFile.writeData = this.memOrAluMux.out
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
