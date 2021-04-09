import {Simulator} from "./simulator";
import {Bits, from_twos_complement, to_twos_complement} from "./utils"
import CodeMirror from "codemirror";
import "codemirror/addon/display/placeholder"
import datapath from "../datapath.svg" // import the string of the optimized svg
import tippy, {followCursor} from 'tippy.js';
import toastr from "toastr";

type CodeMirror = CodeMirror.Editor
type Radix = "hex" | "bin" | "signed" | "unsigned"

// Some utility methods

/**
 * Takes a string an converts into into a positive bigint with the given radix. Throw exception if fails.
 * @param bits the number of bits the output will be
 */
function parseInt(str: string, radix: Radix, bits: number): bigint {
    try {
        if (radix == "hex") {
            var num = BigInt("0x" + str.replace(/^0x/i, ""))
        } else if (radix == "bin") {
            var num = BigInt("0b" + str.replace(/^0b/i, ""))
        } else if (radix == "signed") {
            var num =  to_twos_complement(BigInt(str), bits)
        } else { // (radix == "unsigned")
            var num =  BigInt(str)
        }
        if (num < 0n || num >= 2n ** BigInt(bits)) throw Error() // just trigger catch.
    } catch { // Int to big or parsing failed
        throw Error(`"${str}" is invalid. Expected a ${bits} bit ${radix} integer.`)
    }
    return num
}

/**
 * Outputs a string from an positive bigint or Bits with the radix.
 * @param bits the number of bits the output will be
 */
 function intToStr(num: bigint|Bits, radix: string, bits: number = 32): string {
    if (typeof num == "object") num = Bits.toInt(num)
    if (radix == "hex") {
        return "0x" + num.toString(16).padStart(Math.ceil(bits / 4), "0")
    } else if (radix == "bin") {
        return num.toString(2).padStart(bits, "0")
    } else if (radix == "signed") {
        return from_twos_complement(num, bits).toString()
    } else { // (radix == "unsigned")
        return num.toString()
    }
}

/** Converts a line number into a hex address. */
function hexLine(num: number, inc: number, start: bigint = 0n): string {
    let numB = start + BigInt((num - 1) * inc)
    return intToStr(numB, "hex")
}

interface DataPathElem {
    description?: string,
    // label?: (sim: Simulator) => string,
    value?: (sim: Simulator) => string
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
            description: "The program counter stores the address of the current instruction.",
            value: (sim) => `Current Instruction: ${intToStr(sim.pc.data, "hex", 4)}`,
        },
        "instrMem": {
            description: "",
            value: (sim) => "Instruction Memory",
        },
        "control": {
            description: "",
            value: (sim) => "Control",
        },
        "regFile": {
            description: "",
            value: (sim) => "Register File",
        },
        "immGen": {
            description: "",
            value: (sim) => "Immediate Generator",
        },
        "aluControl": {
            description: "",
            value: (sim) => "ALU Control",
        },
        "aluInputMux": {
            description: "",
            value: (sim) => "ALU Input Mux",
        },
        "alu": {
            description: "",
            value: (sim) => "ALU",
        },
        "dataMem": {
            description: "",
            value: (sim) => "Data Memory",
        },
        "pcAdd4": {
            description: "",
            value: (sim) => "PC + 4",
        },
        "jalrMux": {
            description: "",
            value: (sim) => "Jalr Mux",
        },
        "branchAdder": {
            description: "",
            value: (sim) => "Branch Address Adder",
        },
        "jumpControl": {
            description: "",
            value: (sim) => "Jump Control",
        },
        "pcMux": {
            description: "",
            value: (sim) => "PC Write Mux",
        },
        "writeSrcMux": {
            description: "",
            value: (sim) => "Write Source Mux",
        },

        // Wires
        "pc-out": {
            description: "",
            value: (sim) => Bits.toString(sim.pc.out),
        },
        "instrMem-instruction": {
            description: "",
            value: (sim) => Bits.toString(sim.instrMem.instruction),
        },
        "instrMem-instruction-opcode": {
            description: "",
            value: (sim) => Bits.toString(sim.instrMem.instruction.slice(0, 7)),
        },
        "instrMem-instruction-rd": {
            description: "",
            value: (sim) => Bits.toString(sim.instrMem.instruction.slice(7, 12)),
        },
        "instrMem-instruction-funct3": {
            description: "",
            value: (sim) => Bits.toString(sim.instrMem.instruction.slice(12, 15)),
        },
        "instrMem-instruction-rs1": {
            description: "",
            value: (sim) => Bits.toString(sim.instrMem.instruction.slice(15, 20)),
        },
        "instrMem-instruction-rs2": {
            description: "",
            value: (sim) => Bits.toString(sim.instrMem.instruction.slice(20, 25)),
        },
        "instrMem-instruction-funct7": {
            description: "",
            value: (sim) => Bits.toString(sim.instrMem.instruction.slice(25, 32)),
        },
        "control-regWrite": {
            description: "",
            value: (sim) => sim.control.regWrite.toString(),
        },
        "control-aluSrc": {
            description: "",
            value: (sim) => sim.control.aluSrc.toString(),
        },
        "control-memWrite": {
            description: "",
            value: (sim) => sim.control.memWrite.toString(),
        },
        "control-aluOp": {
            description: "",
            value: (sim) => Bits.toString(sim.control.aluOp),
        },
        "control-writeSrc": {
            description: "",
            value: (sim) => Bits.toString(sim.control.writeSrc),
        },
        "control-memRead": {
            description: "",
            value: (sim) => sim.control.memRead.toString(),
        },
        "control-branchZero": {
            description: "",
            value: (sim) => sim.control.branchZero.toString(),
        },
        "control-branchNotZero": {
            description: "",
            value: (sim) => sim.control.branchNotZero.toString(),
        },
        "control-jump": {
            description: "",
            value: (sim) => sim.control.jump.toString(),
        },
        "control-jalr": {
            description: "",
            value: (sim) => sim.control.jalr.toString(),
        },
        "immGen-immediate": {
            description: "",
            value: (sim) => Bits.toString(sim.immGen.immediate),
        },
        "regFile-readData1": {
            description: "",
            value: (sim) => Bits.toString(sim.regFile.readData1),
        },
        "regFile-readData2": {
            description: "",
            value: (sim) => Bits.toString(sim.regFile.readData2),
        },
        "aluControl-aluControl": {
            description: "",
            value: (sim) => Bits.toString(sim.aluControl.aluControl),
        },
        "aluInputMux-out": {
            description: "",
            value: (sim) => Bits.toString(sim.aluInputMux.out),
        },
        "alu-result": {
            description: "",
            value: (sim) => Bits.toString(sim.alu.result),
        },
        "alu-zero": {
            description: "",
            value: (sim) => sim.alu.zero.toString(),
        },
        "literalFour": {
            description: "",
            value: (sim) => "4",
        },
        "pcAdd4-result": {
            description: "",
            value: (sim) => Bits.toString(sim.pcAdd4.result),
        },
        "branchAdder-result": {
            description: "",
            value: (sim) => Bits.toString(sim.branchAdder.result),
        },
        "jumpControl-takeBranch": {
            description: "",
            value: (sim) => sim.jumpControl.takeBranch.toString(),
        },
        "dataMem-readData": {
            description: "",
            value: (sim) => Bits.toString(sim.dataMem.readData),
        },
        "pcMux-out": {
            description: "",
            value: (sim) => Bits.toString(sim.pcMux.out),
        },
        "writeSrcMux-out": {
            description: "",
            value: (sim) => Bits.toString(sim.writeSrcMux.out),
        },
        "jalrMux-out": {
            description: "",
            value: (sim) => Bits.toString(sim.jalrMux.out),
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
                           placeholder=${intToStr(this.sim.regFile.registers[i], "hex", 32)}>
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
            if (elem.description || elem.value) {
                tippy(`#${id}`, {
                    content: elem.description ?? "",
                    followCursor: true,
                    allowHTML: true,
                    maxWidth: "20em",
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
            var code = codeStr.split("\n").map(s => parseInt(s, "hex", 32))
        } catch (e) {
            this.error(`Couldn't parse code: ${e.message}`)
            return false
        }

        let memStr = this.dataMemEditor.getValue().trim()
        try {
            // split("") equals [""] for some reason
            var mem = memStr.split("\n").filter(s => s).map(s => parseInt(s, "hex", 32));
        } catch (e) {
            this.error(`Couldn't parse data memory: ${e.message}`)
            return false
        }

        let regStrs = $(this.regEditor).find(".register-input").get().map(elem => $(elem).val())
        try {
            var regs: Record<number, bigint> = {}
            for (let [i, s] of regStrs.entries()) {
                if (s) regs[i] = parseInt(s as string, "hex", 32)
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
                $(regInputs[i]).val(`${intToStr(reg, "hex", 32)}`)
            }

            // update svg
            for (let id in VisualSim.datpathElements) {
                let elem = VisualSim.datpathElements[id];
                if (!$(`#${id}`).length) throw Error(`${id} doesn't exist`);
                
                if (elem.description || elem.value) {
                    let tooltip = ($(`#${id}`)[0] as any)._tippy as any
                    let value = elem.value ? elem.value(this.sim) : undefined
                    let content = [elem.description, value].filter(s => s).join("<br/><br/>")
                    tooltip.setContent(content)
                }
            }
        }
    }
}
