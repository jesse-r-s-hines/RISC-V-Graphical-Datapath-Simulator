import {Simulator} from "./simulator";
import {Bits, TruthTable, from_twos_complement, to_twos_complement} from "./utils"
import CodeMirror from "codemirror";
import "codemirror/addon/display/placeholder"
import datapath from "../datapath.svg" // import the string of the optimized svg
import tippy, {followCursor, Instance as Tippy} from 'tippy.js';
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

/** Returns html showing num as hex, signed, and unsigned */
function intToAll(num: bigint|Bits, bits: number = 32): string {
    let radices = [["Hex", "hex"], ["Unsigned", "unsigned"], ["Signed", "signed"]]
    let lines = radices.map(([l, r]) => `${l}: ${intToStr(num, r, bits)}`)
    return lines.join("<br/>")
}

/** Converts a line number into a hex address. */
function hexLine(num: number, inc: number, start: bigint = 0n): string {
    let numB = start + BigInt((num - 1) * inc)
    return intToStr(numB, "hex")
}

interface DataPathElem {
    description?: string,
    hideDescriptionWhenRunning?: boolean
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
    private running: boolean = false

    public static readonly regNames = [
        "zero", "ra", "sp",  "gp",  "tp", "t0", "t1", "t2",
        "s0",   "s1", "a0",  "a1",  "a2", "a3", "a4", "a5",
        "a6",   "a7", "s2",  "s3",  "s4", "s5", "s6", "s7",
        "s8",   "s9", "s10", "s11", "t3", "t4", "t5", "t6",
    ]
        
    private static readonly opCodeNames = new TruthTable([
        [["0110011"], "R-format"],
        [["0010011"], "I-format"],
        [["0000011"], "ld"],
        [["0100011"], "st"],
        [["1100011"], "branch"],
        [["1100111"], "jalr"],
        [["1101111"], "jal"],
        [["0110111"], "lui"],
    ])

    private static readonly aluOpNames = new TruthTable([
        [["000"], "load/store"],
        [["001"], "branch"],
        [["010"], "R-type"],
        [["011"], "I-type"],
        [["100"], "LUI"],
    ])

    private static readonly aluControlNames = new TruthTable([
        [["0000"], "AND"],
        [["0001"], "OR"],
        [["0010"], "Add"],
        [["0110"], "Sub"],
        [["0111"], "Set on less than"],
        [["1111"], "Set on less than unsigned."],
        [["1000"], "Shift left logical"],
        [["1001"], "Shift right logical"],
        [["1011"], "Shift right arithmetic"],
        [["1100"], "XOR"],
        [["1101"], "Load upper immediate"],
    ])

    private static readonly aluSummaries = new TruthTable<(a: Bits, b: Bits) => string>([
        [["0000"], (a, b) => `${intToStr(a, "hex")} AND ${intToStr(b, "hex")}`],
        [["0001"], (a, b) => `${intToStr(a, "hex")} OR ${intToStr(b, "hex")}`],
        [["0010"], (a, b) => `${intToStr(a, "signed")} + ${intToStr(b, "signed")}`],
        [["0110"], (a, b) => `${intToStr(a, "signed")} - ${intToStr(b, "signed")}`],
        [["0111"], (a, b) => `${intToStr(a, "signed")} < ${intToStr(b, "signed")}`],
        [["1111"], (a, b) => `${intToStr(a, "unsigned")} < ${intToStr(b, "unsigned")}`],
        [["1000"], (a, b) => `${intToStr(a, "hex")} << ${intToStr(b, "unsigned")}`],
        [["1001"], (a, b) => `${intToStr(a, "hex")} >>> ${intToStr(b, "unsigned")}`],
        [["1011"], (a, b) => `${intToStr(a, "hex")} >> ${intToStr(b, "unsigned")}`],
        [["1100"], (a, b) => `${intToStr(a, "hex")} XOR ${intToStr(b, "hex")}`],
        [["1101"], (a, b) => `LUI ${intToStr(a, "hex")}`],
    ])

    private static readonly writeSrcNames = new TruthTable([
        [["00"], "ALU result"],
        [["01"], "memory result"],
        [["10"], "PC + 4"],
    ])

    private static readonly datpathElements: Record<string, DataPathElem> = {
        // Components
        "pc": {
            description: "The program counter stores the address of the current instruction.",
            value: (sim) => `Current Instruction: ${intToStr(sim.pc.data, "hex")}`,
        },
        "instrMem": {
            description: "Stores the program.",
        },
        "control": {
            description: "Tells the rest of the processor what to do.",
        },
        "regFile": {
            description: "Stores the 32 registers.",
        },
        "immGen": {
            description: "Extracts the sign-extended immediate from the instruction.",
        },
        "aluControl": {
            description: "Tells the ALU which operation to preform.",
        },
        "aluInputMux": {
            description: "Switches between source register 2 or the immediate value.",
        },
        "alu": {
            description: "Does arithmetic on two values.",
            value: (sim) => VisualSim.aluSummaries.match(sim.alu.aluControl)(sim.alu.in1, sim.alu.in2),
        },
        "dataMem": {
            description: "Stores the data the program is working with.",
        },
        "pcAdd4": {
            description: "Increment PC to the next instruction.",
        },
        "jalrMux": {
            description: "Switch between PC or source register 1. JALR sets the PC to a register + an immediate.",
        },
        "branchAdder": {
            description: "Calculate the target address of a branch or jump.",
        },
        "jumpControl": {
            description: "Determine whether a branch should be taken or not.",
        },
        "pcMux": {
            description: "Switch between PC + 4 or the branch target.",
        },
        "writeSrcMux": {
            description: "Switch between ALU result, memory read data, or PC + 4.",
        },

        // Wires
        "pc-out": {
            value: (sim) => intToStr(sim.pc.out, "hex"),
        },
        "instrMem-instruction": {
            value: (sim) => intToStr(sim.instrMem.instruction, "hex"),
        },
        "instrMem-instruction-opcode": {
            description: "The opcode of the instruction.",
            value: (sim) => `${intToStr(sim.instrSplit.opCode, "bin", 7)} (${VisualSim.opCodeNames.match(sim.instrSplit.opCode)})`,
        },
        "instrMem-instruction-rd": {
            description: "The register to write.",
            value: (sim) => `${intToStr(sim.instrSplit.rd, "unsigned", 5)} (${VisualSim.regNames[Bits.toNumber(sim.instrSplit.rd)]})`,
        },
        "instrMem-instruction-funct3": {
            description: "More bits to determine the instruction.",
            value: (sim) => `${intToStr(sim.instrSplit.funct3, "bin", 3)}`, // TODO show what type of instruction?
        },
        "instrMem-instruction-rs1": {
            description: "The first register to read.",
            value: (sim) => `${intToStr(sim.instrSplit.rs1, "unsigned", 5)} (${VisualSim.regNames[Bits.toNumber(sim.instrSplit.rs1)]})`,
        },
        "instrMem-instruction-rs2": {
            description: "The second register to read.",
            value: (sim) => `${intToStr(sim.instrSplit.rs2, "unsigned", 5)} (${VisualSim.regNames[Bits.toNumber(sim.instrSplit.rs2)]})`,
        },
        "instrMem-instruction-funct7": {
            description: "More bits to determine the instruction.",
            value: (sim) => `${intToStr(sim.instrSplit.funct7, "bin", 7)}`,
        },
        "control-regWrite": {
            description: "Whether to write the register file.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.control.regWrite} (${sim.control.regWrite ? "write register file" : "don't write register file"})`,
        },
        "control-aluSrc": {
            description: "Whether to use source register 2 or the immediate.",
            value: (sim) => `${sim.control.aluSrc} (${sim.control.aluSrc ? "use immediate" : "use register"})`,
        },
        "control-memWrite": {
            description: "Whether to write memory.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.control.memWrite} (${sim.control.memWrite ? "write memory" : "don't write memory"})`,
        },
        "control-aluOp": {
            description: "What type of instruction this is. ALU Control will determine the exact ALU operation to use.",
            value: (sim) => `${intToStr(sim.control.aluOp, "bin", 3)} (${VisualSim.aluOpNames.match(sim.control.aluOp)})`,
        },
        "control-writeSrc": {
            description: "What to write to the register file.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${intToStr(sim.control.writeSrc, "bin", 2)} (write ${VisualSim.writeSrcNames.match(sim.control.writeSrc)} to register)`,
        },
        "control-memRead": {
            description: "Whether to read from memory.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.control.memRead} (${sim.control.memRead ? "read memory" : "don't read memory"})`,
        },
        "control-branchZero": {
            description: "Whether to branch when ALU result is zero.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.control.branchZero} (${sim.control.branchZero ? "branch on zero" : "don't branch on zero"})`,
        },
        "control-branchNotZero": {
            description: "Whether to branch when ALU result is not zero.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.control.branchNotZero} (${sim.control.branchNotZero ? "branch on not zero" : "don't branch on not zero"})`,
        },
        "control-jump": {
            description: "Unconditionally jump.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.control.jump} (${sim.control.jump ? "do jump" : "don't jump"})`,
        },
        "control-jalr": {
            description: "Jump to a register + immediate.",
            value: (sim) => `${sim.control.jalr} (${sim.control.jalr ? "do jump register" : "don't jump register"})`,
        },
        "immGen-immediate": {
            value: (sim) => intToAll(sim.immGen.immediate),
        },
        "regFile-readData1": {
            value: (sim) => intToAll(sim.regFile.readData1),
        },
        "regFile-readData2": {
            value: (sim) => intToAll(sim.regFile.readData2),
        },
        "aluControl-aluControl": {
            description: "What operation for the ALU to preform.",
            value: (sim) => `${intToStr(sim.aluControl.aluControl, "bin", 4)} (${VisualSim.aluControlNames.match(sim.aluControl.aluControl)})`,
        },
        "aluInputMux-out": {
            value: (sim) => intToAll(sim.aluInputMux.out),
        },
        "alu-result": {
            value: (sim) => intToAll(sim.alu.result),
        },
        "alu-zero": {
            description: "Whether the ALU result was zero.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.alu.zero} (ALU result was ${sim.alu.zero ? "zero" : "not zero"})`,
        },
        "literalFour": {
            value: (sim) => "4",
        },
        "pcAdd4-result": {
            value: (sim) => intToStr(sim.pcAdd4.result, "hex"),
        },
        "branchAdder-result": {
            value: (sim) => intToStr(sim.branchAdder.result, "hex"),
        },
        "jumpControl-takeBranch": {
            description: "Whether to take the branch or not.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.jumpControl.takeBranch} (${sim.jumpControl.takeBranch ? "take branch" : "don't take branch"})`,
        },
        "dataMem-readData": {
            value: (sim) => intToAll(sim.dataMem.readData),
        },
        "pcMux-out": {
            value: (sim) => intToStr(sim.pcMux.out, "hex"),
        },
        "writeSrcMux-out": {
            value: (sim) => intToAll(sim.writeSrcMux.out),
        },
        "jalrMux-out": {
            value: (sim) => intToStr(sim.jalrMux.out, "hex"),
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
                let tip = tippy(`#datapath #${id}`, {
                    content: elem.description ?? "",
                    followCursor: true,
                    allowHTML: true,
                    maxWidth: "20em",
                    plugins: [followCursor],
                })[0];
                if (elem.description == undefined) tip.disable()
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

        this.running = true
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
                    let tooltip = ($(`#${id}`)[0] as any)._tippy as Tippy
                    let value = elem.value ? elem.value(this.sim) : undefined
                    let description = (this.running && elem.hideDescriptionWhenRunning) ? undefined : elem.description
                    let content = [description, value].filter(s => s).join("<hr/>")
                    tooltip.setContent(content)

                    if (content) {
                        tooltip.enable()
                    } else {
                        tooltip.hide();
                        tooltip.disable()
                    }
                }
            }
        }
    }
}
