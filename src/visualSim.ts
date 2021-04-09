import {Simulator} from "./simulator";
import {Bits, from_twos_complement, to_twos_complement} from "./utils"
import CodeMirror from "codemirror";
import "codemirror/addon/display/placeholder"
import datapath from "../datapath.svg" // import the string of the optimized svg
import tippy, {followCursor} from 'tippy.js';
import toastr from "toastr";

type CodeMirror = CodeMirror.Editor

// Some utility methods

/**
 * Takes a string an converts into into a positive bigint with the given radix. Throw exception if fails.
 * @param radix on of "hex", "signed", "unsigned"
 * @param bytes the number of bytes the output will be
 */
function parseInt(str: string, radix: string, bytes: number): bigint {
    try {
        if (radix == "hex") {
            var num =  BigInt("0x" + str.replace(/^0x/i, ""))
        } else if (radix = "signed") {
            var num =  to_twos_complement(BigInt(str), bytes)
        } else { // (radix == "unsigned")
            var num =  BigInt(str)
        }
        if (num < 0n || num >= 2n ** (8n * BigInt(bytes))) throw Error() // just trigger catch.
    } catch { // Int to big or parsing failed
        throw Error(`"${str}" is invalid. Expected a ${bytes} byte ${radix} integer.`)
    }
    return num
}

/**
 * Outputs a string from an positive bigint with the radix.
 * @param radix on of "hex", "signed", "unsigned"
 * @param bytes the number of bytes the output will be
 */
 function intToStr(num: bigint, radix: string, bytes: number): string {
    if (radix == "hex") {
        return "0x" + num.toString(16).padStart(bytes * 2, "0")
    } else if (radix == "signed") {
        return from_twos_complement(num, bytes).toString()
    } else { // (radix == "unsigned")
        return num.toString()
    }
}

/** Converts a line number into a hex address. */
function hexLine(num: number, inc: number, start: bigint = 0n): string {
    let numB = start + BigInt((num - 1) * inc)
    return intToStr(numB, "hex", 4)
}

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
        this.sim = new Simulator()

        // Load the SVG
        this.svg = $("#datapath")[0]
        $(this.svg).html(datapath)

        // Set up the Instruction Memory Tab
        this.instrMemEditor = CodeMirror.fromTextArea($("#instrMem-editor textarea")[0] as HTMLTextAreaElement, {
            lineNumbers: true,
            lineNumberFormatter: (l) => hexLine(l, 4, Simulator.text_start),
        });

        // Set up the Data Memory Tab
        this.dataMemEditor = CodeMirror.fromTextArea($("#dataMem-editor textarea")[0] as HTMLTextAreaElement, {
            lineNumbers: true,
            lineNumberFormatter: (l) => hexLine(l, 4),
        });

        // set up the register file tab
        this.regEditor = $("#regFile-editor")[0]
        for (let [i, name] of VisualSim.regNames.entries()) {
            $(this.regEditor).find(".registers").append(`
                <div class="input-group" style="font-family: monospace;">
                    <span class="input-group-text" style="width: 7em">${name} (x${i})</span>
                    <input type="text" name="registers[${i}]" class="register-input form-control"
                           placeholder=${intToStr(this.sim.regFile.registers[i], "hex", 4)}>
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

    /** Show an error popup */
    private error(message: string) {
        toastr.error(message)
    }

    /** Load code/memory/registers and start the simulation */
    private start() {
        // Start the simulator
        // Get memory, instructions, registers
        let codeStr = this.instrMemEditor.getValue().trim()
        if (codeStr == "") {
            this.error("Please enter some code to run.")
            return false
        }
        try {
            var code = codeStr.split("\n").map(s => parseInt(s, "hex", 4))
        } catch (e) {
            this.error(`Couldn't parse code: ${e.message}`)
            return false
        }

        let memStr = this.dataMemEditor.getValue().trim()
        try {
            // split("") equals [""] for some reason
            var mem = memStr.split("\n").filter(s => s).map(s => parseInt(s, "hex", 4));
        } catch (e) {
            this.error(`Couldn't parse data memory: ${e.message}`)
            return false
        }

        let regStrs = $(this.regEditor).find(".register-input").get().map(elem => $(elem).val())
        try {
            var regs: Record<number, bigint> = {}
            for (let [i, s] of regStrs.entries()) {
                if (s) regs[i] = parseInt(s as string, "hex", 4)
            }
        } catch (e) {
            this.error(`Couldn't parse registers: ${e.message}`)
            return false
        }

        // We've got all the data so we can start the simulator
        this.sim.setCode(code)
        this.sim.setRegisters(regs)
        this.sim.dataMem.data.storeArray(0n, 4, mem)

        // Disable editors
        this.setEditorsDisabled(true)

        return true
    }

    /** Disable/Enable the editors */
    private setEditorsDisabled(disabled: boolean) {
        this.instrMemEditor.setOption("readOnly", disabled)
        this.dataMemEditor.setOption("readOnly", disabled)
        $(".editors input").prop("disabled", disabled)
        $(".editors select").prop("disabled", disabled)
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
                $(regInputs[i]).val(`${intToStr(reg, "hex", 4)}`)
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
