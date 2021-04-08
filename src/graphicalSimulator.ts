import {Simulator} from "./simulator";
import {Bits} from "./utils"
import CodeMirror from "codemirror";
import "codemirror/addon/display/placeholder"
import datapath from "../datapath.svg" // import the string of the optimized svg
import tippy, {followCursor} from 'tippy.js';

type CodeMirror = CodeMirror.Editor


/**
 * Handles the GUI
 */
export class GraphicalSimulator {
    private svg: HTMLElement
    private instrMemEditor: CodeMirror
    private dataMemEditor: CodeMirror
    private regEditor: HTMLElement

    private sim: Simulator

    public static readonly regNames = [
        "zero", "ra", "sp",  "gp",  "tp", "t0", "t1", "t2",
        "s0",   "s1", "a0",  "a1",  "a2", "a3", "a4", "a5",
        "a6",   "a7", "s2",  "s3",  "s4", "s5", "s6", "s7",
        "s8",   "s9", "s10", "s11", "t3", "t4", "t5", "t6",
    ]

    constructor() {
        // Load the SVG
        this.svg = $("#datapath")[0]
        $(this.svg).html(datapath)

        // Set up the Instruction Memory Tab
        this.instrMemEditor = CodeMirror.fromTextArea($("#instrMem-editor textarea")[0] as HTMLTextAreaElement, {
            lineNumbers: true,
            lineNumberFormatter: (l) => this.hexLine(l, 4),
        });

        // Set up the Data Memory Tab
        this.dataMemEditor = CodeMirror.fromTextArea($("#dataMem-editor textarea")[0] as HTMLTextAreaElement, {
            lineNumbers: true,
            lineNumberFormatter: (l) => this.hexLine(l, 4),
        });

        // set up the register file tab
        this.regEditor = $("#regFile-editor")[0]
        for (let [i, name] of GraphicalSimulator.regNames.entries()) {
            $(this.regEditor).find(".registers").append(`
                <div class="input-group" style="font-family: monospace;">
                    <span class="input-group-text" style="width: 7em">${name} (x${i})</span>
                    <input type="text" name="registers[${i}]" class="register-input form-control">
                </div>
            `)
        }

        // Add events
        $("#editor-tabs").on("shown.bs.tab", (event) => {
            let tab = $( $(event.target).data("bs-target") ).find(".CodeMirror")[0] as any
            if (tab) tab.CodeMirror.refresh() // We have to refresh the CodeMirror after it is shown
        })

        $("#run-simulation").on("click", (event) => this.start())
        $("#step-simulation").on("click", (event) => this.step())

        this.sim = new Simulator()
    }

    private hexLine(num: number, inc: number, start: number = 0): string {
        num = (start + num - 1) * inc
        return "0x" + num.toString(16).padStart(8, "0")
    }

    /** Takes a string an converts into into a bigint with the given radix */
    private bigintFromStr(str: string, radix: number): bigint {
        return BigInt(parseInt(str, 16)) // TODO make this work with different radix
    }

    private start() {
        // Disable editors
        this.instrMemEditor.setOption("readOnly", true)
        this.dataMemEditor.setOption("readOnly", true)
        $(".editors input").prop("disabled", true)
        $(".editors select").prop("disabled", true)

        // Start the simulator
        let code = this.instrMemEditor.getValue().trim().split("\n")
                                      .map(s => this.bigintFromStr(s, 16));

        let mem = this.dataMemEditor.getValue().trim().split("\n")
                                    .map(s => BigInt(parseInt(s, 16)));

        let regStrs = $(this.regEditor).find(".register-input").get().map(i => $(i).val())
        let regs: Record<number, bigint> = {}
        for (let [i, s] of regStrs.entries()) {
            if (s) regs[i] = this.bigintFromStr(s as string, 16)
        }

        this.sim.setCode(code)
        this.sim.setRegisters(regs)
        this.sim.dataMem.data.storeArray(0n, 4, mem)

        console.log("Starting Simulation")
    }

    private static datpathElements: Record<string, (sim: Simulator) => string> = {
        // Components
        "pc":          (sim) => "Program Counter",
        "instrMem":    (sim) => "Instruction Memory",
        "control":     (sim) => "Control",
        "regFile":     (sim) => "Register FIle",
        "immGen":      (sim) => "Immediate Generator",
        "aluControl":  (sim) => "ALU Control",
        "aluInputMux": (sim) => "ALU Input Mux",
        "alu":         (sim) => "ALU",
        "dataMem":     (sim) => "Data Memory",
        "pcAdd4":      (sim) => "PC + 4",
        "jalrMux":     (sim) => "Jalr Mux",
        "branchAdder": (sim) => "Branch Address Adder",
        "jumpControl": (sim) => "Jump Control",
        "pcMux":       (sim) => "PC Write Mux",
        "writeSrcMux": (sim) => "Write Source Mux",

        // Wires
        "pc-out":                      (sim) => Bits.toString(sim.pc.out),
        "instrMem-instruction":        (sim) => Bits.toString(sim.instrMem.instruction),
        "instrMem-instruction-opcode": (sim) => Bits.toString(sim.instrMem.instruction.slice(0, 7)),
        "instrMem-instruction-rd":     (sim) => Bits.toString(sim.instrMem.instruction.slice(7, 12)),
        "instrMem-instruction-funct3": (sim) => Bits.toString(sim.instrMem.instruction.slice(12, 15)),
        "instrMem-instruction-rs1":    (sim) => Bits.toString(sim.instrMem.instruction.slice(15, 20)),
        "instrMem-instruction-rs2":    (sim) => Bits.toString(sim.instrMem.instruction.slice(20, 25)),
        "instrMem-instruction-funct7": (sim) => Bits.toString(sim.instrMem.instruction.slice(25, 32)),
        "control-regWrite":            (sim) => sim.control.regWrite.toString(),
        "control-aluSrc":              (sim) => sim.control.aluSrc.toString(),
        "control-memWrite":            (sim) => sim.control.memWrite.toString(),
        "control-aluOp":               (sim) => Bits.toString(sim.control.aluOp),
        "control-writeSrc":            (sim) => Bits.toString(sim.control.writeSrc),
        "control-memRead":             (sim) => sim.control.memRead.toString(),
        "control-branchZero":          (sim) => sim.control.branchZero.toString(),
        "control-branchNotZero":       (sim) => sim.control.branchNotZero.toString(),
        "control-jump":                (sim) => sim.control.jump.toString(),
        "control-jalr":                (sim) => sim.control.jalr.toString(),
        "immGen-immediate":            (sim) => Bits.toString(sim.immGen.immediate),
        "regFile-readData1":           (sim) => Bits.toString(sim.regFile.readData1),
        "regFile-readData2":           (sim) => Bits.toString(sim.regFile.readData2),
        "aluControl-aluControl":       (sim) => Bits.toString(sim.aluControl.aluControl),
        "aluInputMux-out":             (sim) => Bits.toString(sim.aluInputMux.out),
        "alu-result":                  (sim) => Bits.toString(sim.alu.result),
        "alu-zero":                    (sim) => sim.alu.zero.toString(),
        "literalFour":                 (sim) => "4",
        "pcAdd4-result":               (sim) => Bits.toString(sim.pcAdd4.result),
        "branchAdder-result":          (sim) => Bits.toString(sim.branchAdder.result),
        "jumpControl-takeBranch":      (sim) => sim.jumpControl.takeBranch.toString(),
        "dataMem-readData":            (sim) => Bits.toString(sim.dataMem.readData),
        "pcMux-out":                   (sim) => Bits.toString(sim.pcMux.out),
        "writeSrcMux-out":             (sim) => Bits.toString(sim.writeSrcMux.out),
        "jalrMux-out":                 (sim) => Bits.toString(sim.jalrMux.out),
    } 

    private step() {
        if (this.sim.canContinue()) { // TODO grey out buttons when done.
            console.log("Stepping Simulation")

            let line = Number((this.sim.pc.data - Simulator.text_start) / 4n)
            this.instrMemEditor.removeLineClass(line, "wrap", "current-instruction")

            this.sim.tick()

            line = Number((this.sim.pc.data - Simulator.text_start) / 4n)
            this.instrMemEditor.addLineClass(line, "wrap", "current-instruction")

            this.dataMemEditor.setValue(this.sim.dataMem.data.toString(4, true))

            let regInputs = $(this.regEditor).find(".registers .register-input").get()
            for (let [i, reg] of this.sim.regFile.registers.entries()) {
                $(regInputs[i]).val(`0x${reg.toString(16).padStart(8, "0")}`)
            }

            // update svg
            for (let id in GraphicalSimulator.datpathElements) {
                if (!$(`#${id}`).length) throw Error(`${id} doesn't exist`)
                let func = GraphicalSimulator.datpathElements[id]
    
                tippy(`#${id}`, {
                    content: func(this.sim),
                    followCursor: true,
                    plugins: [followCursor],
                });
            }
        }
    }
}
