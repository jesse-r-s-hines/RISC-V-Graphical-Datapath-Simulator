import {Simulator} from "./simulator";
import {Bits} from "./utils"
import CodeMirror from "codemirror";
import "codemirror/addon/display/placeholder"
import datapath from "../datapath.svg" // import the string of the optimized svg
import tippy, {followCursor} from 'tippy.js';

type CodeMirror = CodeMirror.Editor

interface DataPathElem {
    // description?: string,
    // label?: (sim: Simulator) => string,
    tooltip?: (sim: Simulator) => string
    // onclick?: () => void,
}

/**
 * Handles the GUI
 */
export class VisualSim {
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

    // tooltip, label, 

    private static datpathElements: Record<string, DataPathElem> = {
        // Components
        "pc": {
            tooltip: (sim) => "Program Counter",
        },
        "instrMem": {
            tooltip: (sim) => "Instruction Memory",
        },
        "control": {
            tooltip: (sim) => "Control",
        },
        "regFile": {
            tooltip: (sim) => "Register File",
        },
        "immGen": {
            tooltip: (sim) => "Immediate Generator",
        },
        "aluControl": {
            tooltip: (sim) => "ALU Control",
        },
        "aluInputMux": {
            tooltip: (sim) => "ALU Input Mux",
        },
        "alu": {
            tooltip: (sim) => "ALU",
        },
        "dataMem": {
            tooltip: (sim) => "Data Memory",
        },
        "pcAdd4": {
            tooltip: (sim) => "PC + 4",
        },
        "jalrMux": {
            tooltip: (sim) => "Jalr Mux",
        },
        "branchAdder": {
            tooltip: (sim) => "Branch Address Adder",
        },
        "jumpControl": {
            tooltip: (sim) => "Jump Control",
        },
        "pcMux": {
            tooltip: (sim) => "PC Write Mux",
        },
        "writeSrcMux": {
            tooltip: (sim) => "Write Source Mux",
        },

        // Wires
        "pc-out": {
            tooltip: (sim) => Bits.toString(sim.pc.out),
        },
        "instrMem-instruction": {
            tooltip: (sim) => Bits.toString(sim.instrMem.instruction),
        },
        "instrMem-instruction-opcode": {
            tooltip: (sim) => Bits.toString(sim.instrMem.instruction.slice(0, 7)),
        },
        "instrMem-instruction-rd": {
            tooltip: (sim) => Bits.toString(sim.instrMem.instruction.slice(7, 12)),
        },
        "instrMem-instruction-funct3": {
            tooltip: (sim) => Bits.toString(sim.instrMem.instruction.slice(12, 15)),
        },
        "instrMem-instruction-rs1": {
            tooltip: (sim) => Bits.toString(sim.instrMem.instruction.slice(15, 20)),
        },
        "instrMem-instruction-rs2": {
            tooltip: (sim) => Bits.toString(sim.instrMem.instruction.slice(20, 25)),
        },
        "instrMem-instruction-funct7": {
            tooltip: (sim) => Bits.toString(sim.instrMem.instruction.slice(25, 32)),
        },
        "control-regWrite": {
            tooltip: (sim) => sim.control.regWrite.toString(),
        },
        "control-aluSrc": {
            tooltip: (sim) => sim.control.aluSrc.toString(),
        },
        "control-memWrite": {
            tooltip: (sim) => sim.control.memWrite.toString(),
        },
        "control-aluOp": {
            tooltip: (sim) => Bits.toString(sim.control.aluOp),
        },
        "control-writeSrc": {
            tooltip: (sim) => Bits.toString(sim.control.writeSrc),
        },
        "control-memRead": {
            tooltip: (sim) => sim.control.memRead.toString(),
        },
        "control-branchZero": {
            tooltip: (sim) => sim.control.branchZero.toString(),
        },
        "control-branchNotZero": {
            tooltip: (sim) => sim.control.branchNotZero.toString(),
        },
        "control-jump": {
            tooltip: (sim) => sim.control.jump.toString(),
        },
        "control-jalr": {
            tooltip: (sim) => sim.control.jalr.toString(),
        },
        "immGen-immediate": {
            tooltip: (sim) => Bits.toString(sim.immGen.immediate),
        },
        "regFile-readData1": {
            tooltip: (sim) => Bits.toString(sim.regFile.readData1),
        },
        "regFile-readData2": {
            tooltip: (sim) => Bits.toString(sim.regFile.readData2),
        },
        "aluControl-aluControl": {
            tooltip: (sim) => Bits.toString(sim.aluControl.aluControl),
        },
        "aluInputMux-out": {
            tooltip: (sim) => Bits.toString(sim.aluInputMux.out),
        },
        "alu-result": {
            tooltip: (sim) => Bits.toString(sim.alu.result),
        },
        "alu-zero": {
            tooltip: (sim) => sim.alu.zero.toString(),
        },
        "literalFour": {
            tooltip: (sim) => "4",
        },
        "pcAdd4-result": {
            tooltip: (sim) => Bits.toString(sim.pcAdd4.result),
        },
        "branchAdder-result": {
            tooltip: (sim) => Bits.toString(sim.branchAdder.result),
        },
        "jumpControl-takeBranch": {
            tooltip: (sim) => sim.jumpControl.takeBranch.toString(),
        },
        "dataMem-readData": {
            tooltip: (sim) => Bits.toString(sim.dataMem.readData),
        },
        "pcMux-out": {
            tooltip: (sim) => Bits.toString(sim.pcMux.out),
        },
        "writeSrcMux-out": {
            tooltip: (sim) => Bits.toString(sim.writeSrcMux.out),
        },
        "jalrMux-out": {
            tooltip: (sim) => Bits.toString(sim.jalrMux.out),
        },
    } 

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
        for (let [i, name] of VisualSim.regNames.entries()) {
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

        // Setup datapath elements
        for (let id in VisualSim.datpathElements) {
            let elem = VisualSim.datpathElements[id]
            if (elem.tooltip != undefined) {
                tippy(`#${id}`, {
                    content: "", // no content yet
                    followCursor: true,
                    plugins: [followCursor],
                });
            }
        }
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
            for (let id in VisualSim.datpathElements) {
                let elem = VisualSim.datpathElements[id];
                if (!$(`#${id}`).length) throw Error(`${id} doesn't exist`);
                
                if (elem.tooltip != undefined) {
                    ($(`#${id}`)[0] as any)._tippy.setContent(elem.tooltip(this.sim))
                }
            }
        }
    }
}
