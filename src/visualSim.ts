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
 * @param bytes the number of bytes the output will be
 */
function parseInt(str: string, radix: Radix, bytes: number): bigint {
    try {
        if (radix == "hex") {
            var num = BigInt("0x" + str.replace(/^0x/i, ""))
        } else if (radix == "bin") {
            var num = BigInt("0b" + str.replace(/^0b/i, ""))
        } else if (radix == "signed") {
            var num =  to_twos_complement(BigInt(str), bytes * 8)
        } else { // (radix == "unsigned")
            var num =  BigInt(str)
        }
        if (num < 0n || num >= 2n ** BigInt(bytes * 8)) throw Error() // just trigger catch.
    } catch { // Int to big or parsing failed
        throw Error(`"${str}" is invalid. Expected a ${bytes} byte ${radix} integer.`)
    }
    return num
}

/**
 * Outputs a string from an positive bigint or Bits with the radix.
 * @param bytes the number of bytes the output will be
 */
 function intToStr(num: bigint|Bits, radix: string, bytes: number = 4): string {
    if (typeof num == "object") num = Bits.toInt(num)
    if (radix == "hex") {
        return "0x" + num.toString(16).padStart(bytes *2, "0")
    } else if (radix == "bin") {
        return num.toString(2).padStart(bytes * 8, "0")
    } else if (radix == "signed") {
        return from_twos_complement(num, bytes * 8).toString()
    } else { // (radix == "unsigned")
        return num.toString()
    }
}

/** Returns html showing num as hex, signed, and unsigned */
function intToAll(num: bigint|Bits, bytes: number = 4): string {
    let radices = [["Hex", "hex"], ["Unsigned", "unsigned"], ["Signed", "signed"]]
    let lines = radices.map(([l, r]) => `${l}: ${intToStr(num, r, bytes)}`)
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
    active?: (sim: Simulator) => boolean
    // onclick?: () => void,
}

type State = "unstarted" | "running" | "done"

/**
 * Handles the GUI
 */
export class VisualSim {
    private svg: HTMLElement
    private editors: HTMLElement
    private instrMemPanel: HTMLElement
    private dataMemPanel: HTMLElement
    private regFilePanel: HTMLElement

    private instrMemEditor: CodeMirror
    private dataMemEditor: CodeMirror

    private sim: Simulator
    private state: State = "unstarted"

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
            description: "Switch between PC or source register 1. JALR sets the PC to a register plus an immediate.",
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
            active: (sim) => Bits.toInt(sim.pc.out) != 0n
        },
        "instrMem-instruction": {
            value: (sim) => intToStr(sim.instrMem.instruction, "hex"),
            active: (sim) => Bits.toInt(sim.instrMem.instruction) != 0n
        },
        "instrMem-instruction-opcode": {
            description: "The opcode of the instruction.",
            value: (sim) => `${Bits.toString(sim.instrSplit.opCode)} (${VisualSim.opCodeNames.match(sim.instrSplit.opCode)})`,
            active: (sim) => Bits.toInt(sim.instrSplit.opCode) != 0n
        },
        "instrMem-instruction-rd": {
            description: "The register to write.",
            value: (sim) => `${intToStr(sim.instrSplit.rd, "unsigned", 5)} (${VisualSim.regNames[Bits.toNumber(sim.instrSplit.rd)]})`,
            active: (sim) => Bits.toInt(sim.instrSplit.rd) != 0n
        },
        "instrMem-instruction-funct3": {
            description: "More bits to determine the instruction.",
            value: (sim) => `${Bits.toString(sim.instrSplit.funct3)}`, // TODO show what type of instruction?
            active: (sim) => Bits.toInt(sim.instrSplit.funct3) != 0n
        },
        "instrMem-instruction-rs1": {
            description: "The first register to read.",
            value: (sim) => `${intToStr(sim.instrSplit.rs1, "unsigned", 5)} (${VisualSim.regNames[Bits.toNumber(sim.instrSplit.rs1)]})`,
            active: (sim) => Bits.toInt(sim.instrSplit.rs1) != 0n
        },
        "instrMem-instruction-rs2": {
            description: "The second register to read.",
            value: (sim) => `${intToStr(sim.instrSplit.rs2, "unsigned", 5)} (${VisualSim.regNames[Bits.toNumber(sim.instrSplit.rs2)]})`,
            active: (sim) => Bits.toInt(sim.instrSplit.rs2) != 0n
        },
        "instrMem-instruction-funct7": {
            description: "More bits to determine the instruction.",
            value: (sim) => `${Bits.toString(sim.instrSplit.funct7)}`,
            active: (sim) => Bits.toInt(sim.instrSplit.funct7) != 0n
        },
        "control-regWrite": {
            description: "Whether to write the register file.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.control.regWrite} (${sim.control.regWrite ? "write register file" : "don't write register file"})`,
            active: (sim) => sim.control.regWrite != 0
        },
        "control-aluSrc": {
            description: "Whether to use source register 2 or the immediate.",
            value: (sim) => `${sim.control.aluSrc} (${sim.control.aluSrc ? "use immediate" : "use register"})`,
            active: (sim) => sim.control.aluSrc != 0
        },
        "control-memWrite": {
            description: "Whether to write memory.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.control.memWrite} (${sim.control.memWrite ? "write memory" : "don't write memory"})`,
            active: (sim) => sim.control.memWrite != 0
        },
        "control-aluOp": {
            description: "What type of instruction this is. ALU Control will determine the exact ALU operation to use.",
            value: (sim) => `${Bits.toString(sim.control.aluOp)} (${VisualSim.aluOpNames.match(sim.control.aluOp)})`,
            active: (sim) => Bits.toInt(sim.control.aluOp) != 0n
        },
        "control-writeSrc": {
            description: "What to write to the register file.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${Bits.toString(sim.control.writeSrc)} (write ${VisualSim.writeSrcNames.match(sim.control.writeSrc)} to register)`,
            active: (sim) => Bits.toInt(sim.control.writeSrc) != 0n
        },
        "control-memRead": {
            description: "Whether to read from memory.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.control.memRead} (${sim.control.memRead ? "read memory" : "don't read memory"})`,
            active: (sim) => sim.control.memRead != 0
        },
        "control-branchZero": {
            description: "Whether to branch when ALU result is zero.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.control.branchZero} (${sim.control.branchZero ? "branch on zero" : "don't branch on zero"})`,
            active: (sim) => sim.control.branchZero != 0
        },
        "control-branchNotZero": {
            description: "Whether to branch when ALU result is not zero.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.control.branchNotZero} (${sim.control.branchNotZero ? "branch on not zero" : "don't branch on not zero"})`,
            active: (sim) => sim.control.branchNotZero != 0
        },
        "control-jump": {
            description: "Unconditionally jump.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.control.jump} (${sim.control.jump ? "do jump" : "don't jump"})`,
            active: (sim) => sim.control.jump != 0
        },
        "control-jalr": {
            description: "Jump to a register + immediate.",
            value: (sim) => `${sim.control.jalr} (${sim.control.jalr ? "do jump register" : "don't jump register"})`,
            active: (sim) => sim.control.jalr != 0
        },
        "immGen-immediate": {
            value: (sim) => intToAll(sim.immGen.immediate),
            active: (sim) => Bits.toInt(sim.immGen.immediate) != 0n
        },
        "regFile-readData1": {
            value: (sim) => intToAll(sim.regFile.readData1),
            active: (sim) => Bits.toInt(sim.regFile.readData1) != 0n
        },
        "regFile-readData2": {
            value: (sim) => intToAll(sim.regFile.readData2),
            active: (sim) => Bits.toInt(sim.regFile.readData2) != 0n
        },
        "aluControl-aluControl": {
            description: "What operation for the ALU to preform.",
            value: (sim) => `${Bits.toString(sim.aluControl.aluControl)} (${VisualSim.aluControlNames.match(sim.aluControl.aluControl)})`,
            active: (sim) => Bits.toInt(sim.aluControl.aluControl) != 0n
        },
        "aluInputMux-out": {
            value: (sim) => intToAll(sim.aluInputMux.out),
            active: (sim) => Bits.toInt(sim.aluInputMux.out) != 0n
        },
        "alu-result": {
            value: (sim) => intToAll(sim.alu.result),
            active: (sim) => Bits.toInt(sim.alu.result) != 0n
        },
        "alu-zero": {
            description: "Whether the ALU result was zero.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.alu.zero} (ALU result was ${sim.alu.zero ? "zero" : "not zero"})`,
            active: (sim) => sim.alu.zero != 0
        },
        "literalFour": {
            value: (sim) => "4",
            active: (sim) => true,
        },
        "pcAdd4-result": {
            value: (sim) => intToStr(sim.pcAdd4.result, "hex"),
            active: (sim) => Bits.toInt(sim.pcAdd4.result) != 0n
        },
        "branchAdder-result": {
            value: (sim) => intToStr(sim.branchAdder.result, "hex"),
            active: (sim) => Bits.toInt(sim.branchAdder.result) != 0n
        },
        "jumpControl-takeBranch": {
            description: "Whether to take the branch or not.",
            hideDescriptionWhenRunning: true,
            value: (sim) => `${sim.jumpControl.takeBranch} (${sim.jumpControl.takeBranch ? "take branch" : "don't take branch"})`,
            active: (sim) => sim.jumpControl.takeBranch != 0
        },
        "dataMem-readData": {
            value: (sim) => intToAll(sim.dataMem.readData),
            active: (sim) => Bits.toInt(sim.dataMem.readData) != 0n
        },
        "pcMux-out": {
            value: (sim) => intToStr(sim.pcMux.out, "hex"),
            active: (sim) => Bits.toInt(sim.pcMux.out) != 0n
        },
        "writeSrcMux-out": {
            value: (sim) => intToAll(sim.writeSrcMux.out),
            active: (sim) => Bits.toInt(sim.writeSrcMux.out) != 0n
        },
        "jalrMux-out": {
            value: (sim) => intToStr(sim.jalrMux.out, "hex"),
            active: (sim) => Bits.toInt(sim.jalrMux.out) != 0n
        },
    } 

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

    constructor() {
        this.sim = new Simulator()

        // initialize elements
        this.svg = $("#datapath")[0]
        this.editors = $("#editors")[0]
        this.instrMemPanel = $("#instrMem-panel")[0]
        this.dataMemPanel = $("#dataMem-panel")[0]
        this.regFilePanel = $("#regFile-panel")[0]

        // Load the SVG
        $(this.svg).html(datapath)

        // Set up the Instruction Memory Tab
        this.instrMemEditor = CodeMirror.fromTextArea($(this.instrMemPanel).find<HTMLTextAreaElement>(".editor textarea")[0], {
            lineNumbers: true,
            lineNumberFormatter: (l) => hexLine(l, 4, Simulator.text_start),
        });

        // Set up the Data Memory Tab
        this.dataMemEditor = CodeMirror.fromTextArea($(this.dataMemPanel).find<HTMLTextAreaElement>(".editor textarea")[0], {
            lineNumbers: true, // we'll set lineNumberFormatter in updateSimulation
        });

        // set up the Register File tab
        for (let [i, name] of VisualSim.regNames.entries()) {
            $(this.regFilePanel).find(".editor tbody").append(`
                <tr> <td>${name} (x${i})</td> <td><input type="text"></td> </tr>
            `)
        }

        this.setupEvents()
        this.setupDatapath()

        this.update()
    }
    
    private dataMemRadix(): Radix { return $("#dataMem-radix").val() as Radix; }
    private dataMemWordSize(): number { return +($("#dataMem-word-size").val() as string); }
    private regFileRadix(): Radix { return $("#regFile-radix").val() as Radix; }

    private setupEvents() {
        $("#editor-tabs").on("shown.bs.tab", (event) => {
            let tab = $( $(event.target).data("bs-target") ).find(".CodeMirror")[0] as any
            if (tab) tab.CodeMirror.refresh() // We have to refresh the CodeMirror after it is shown
        })

        $("#dataMem-radix, #dataMem-word-size, #regFile-radix").on("change", (event) => this.updateEditorsAndViews())

        $("#step").on("click", (event) => this.step())
        $("#restart").on("click", (event) => this.restart())
    }

    private setupDatapath() {
        for (let id in VisualSim.datpathElements) {
            let elem = $(`#${id}`, "#datapath")
            let config = VisualSim.datpathElements[id];

            if (!elem.length) throw Error(`${id} doesn't exist`);

            if (config.description || config.value) {
                tippy(`#datapath #${id}`, {
                    followCursor: true, // or "initial" keep it where you entered
                    allowHTML: true,
                    maxWidth: "20em",
                    plugins: [followCursor],
                })[0];
            }
        }
    }

    /**
     * Load code/memory/registers and start the simulation.
     * Returns true if started successfully, false otherwise.
     */
    private start() {
        // Get memory, instructions, registers
        let codeStr = this.instrMemEditor.getValue().trim()
        if (codeStr == "") {
            toastr.error("Please enter some code to run.")
            return false
        }
        try {
            var code = codeStr.split("\n").map(s => parseInt(s, "hex", 4))
        } catch (e) {
            toastr.error(`Couldn't parse code: ${e.message}`)
            return false
        }

        let memRadix = this.dataMemRadix()
        let memWordSize = this.dataMemWordSize()
        let memStr = this.dataMemEditor.getValue().trim()
        try {
            // split("") equals [""] for some reason
            var mem = memStr.split("\n").filter(s => s).map(s => parseInt(s, memRadix, memWordSize));
        } catch (e) {
            toastr.error(`Couldn't parse data memory: ${e.message}`)
            return false
        }

        let regRadix = this.regFileRadix()
        let regStrs = $(this.regFilePanel).find(".editor input").get().map(elem => $(elem).val() as string)
        try {
            var regs: Record<number, bigint> = {}
            for (let [i, s] of regStrs.entries()) {
                if (s) regs[i] = parseInt(s, regRadix, 4)
            }
        } catch (e) {
            toastr.error(`Couldn't parse registers: ${e.message}`)
            return false
        }

        // We've got all the data so we can start the simulator
        this.sim.setCode(code)
        this.sim.setRegisters(regs)
        this.sim.dataMem.data.storeArray(0n, memWordSize, mem)

        // setup Instruction Memory view
        let instrMemTable = $(this.instrMemPanel).find(".view tbody")
        instrMemTable.empty()
        for (let [addr, val] of this.sim.instrMem.data.dump(4)) {
            if (typeof addr == "bigint") {
                instrMemTable.append(`
                    <tr> <td>${intToStr(addr, "hex")}</td> <td>${intToStr(val, "hex")}</td> </tr>
                `)
            } else {
                break // End of instruction memory
            }
        }

        // Data Memory view is recreated every tick.

        // set up Rigester File view if needed
        let regFileTable = $(this.regFilePanel).find(".view tbody")
        if (regFileTable.children().length == 0) {
            for (let [i, name] of VisualSim.regNames.entries()) {
                regFileTable.append(`
                    <tr> <td>${name} (x${i})</td> <td class="register-value"></td> </tr>
                `)
            }
        }

        // Switch to views
        $(this.editors).find(".editor").hide()
        $(this.editors).find(".view").show()

        return true
    }

    /** Updates the controls to match simulator state. */
    private updateControls() {
        $("#step").prop("disabled", this.state == "done")
        $("#step").prop("title", `${this.state == "unstarted" ? "Start" : "Step"} Simulation`)
        $("#restart").prop("disabled", this.state == "unstarted")
    }

    /** Update the editor and view panels to match the simulation */
    private updateEditorsAndViews() {
        let memRadix = this.dataMemRadix()
        let memWordSize = this.dataMemWordSize()
        let regRadix = this.regFileRadix()

        if (this.state == "unstarted") {
            // renumber instruction input to match radix
            this.dataMemEditor.setOption("lineNumberFormatter", (l) => hexLine(l, memWordSize))

            // update Register File input placeholders to match radix
            let registerTds = $(this.regFilePanel).find(".editor input").get()
            for (let [i, reg] of this.sim.regFile.registers.entries()) {
                $(registerTds[i]).prop("placeholder", intToStr(reg, regRadix))
            }
        } else { // this.state == "running" or this.state == "done"
            // Update Instruction Memory
            $(this.instrMemPanel).find(".current-instruction").removeClass("current-instruction")
            if (this.state != "done") { // don't show current instruction if we are done.
                let line = Number((this.sim.pc.data - Simulator.text_start) / 4n)
                let currentInstr = $(this.instrMemPanel).find(".view tr")[line]
                currentInstr.classList.add("current-instruction")
                currentInstr.scrollIntoView({behavior: "smooth", block: "nearest"})
            }

            // Update Data Memory
            $(this.dataMemPanel).find(".view tbody").empty()
            for (let [addr, val] of this.sim.dataMem.data.dump(memWordSize)) {
                let elem: string
                if (typeof addr == "bigint") {
                    elem = `<tr> <td>${intToStr(addr, "hex")}</td> <td>${intToStr(val, memRadix, memWordSize)}</td> </tr>`
                } else {
                    elem = `<tr><td colspan="2">...</td></tr>`
                }
                $(this.dataMemPanel).find(".view tbody").append(elem)
            }

            // update Register File
            let registerTds = $(this.regFilePanel).find(".view .register-value").get()
            for (let [i, reg] of this.sim.regFile.registers.entries()) {
                $(registerTds[i]).text(`${intToStr(reg, regRadix)}`)
            }
        }
    }

    /** Updates datapath to match simulator state. */
    private updateDatapath() {
        let running = (this.state == "running")
    
        for (let id in VisualSim.datpathElements) {
            let elem = $(`#${id}`, "#datapath")
            let config = VisualSim.datpathElements[id];
           
            if (config.description || config.value) {
                let tooltip = (elem[0] as any)._tippy as Tippy
                let value = running && config.value ? config.value(this.sim) : undefined
                let description = (!running || !config.hideDescriptionWhenRunning) ? config.description : undefined
                let content = [description, value].filter(s => s).join("<hr/>")
                tooltip.setContent(content)

                if (content) {
                    tooltip.enable()
                } else {
                    tooltip.hide(); // disable will lock the tooltip open if it was open
                    tooltip.disable()
                }
            }

            if (running && config.active && config.active(this.sim)) {
                elem.addClass("powered")
            } else {
                elem.removeClass("powered")
            }
        }
    }

    /** update controls, editors, views, and datapath */
    private update() {
        this.updateControls()
        this.updateEditorsAndViews()
        this.updateDatapath()
    }

    private step() {
        if (this.state == "unstarted" && this.start()) { // try to start
            this.state = "running" // we will still do the first tick.
        }
        if (this.state == "running") {
            let canContinue = this.sim.tick() // Do first instruction
            if (!canContinue) this.state = "done"

        }
        this.update()
    }

    private restart() {
        this.sim = new Simulator() // reset the simulator
        this.state = "unstarted"

        // Switch back to editors
        $(this.editors).find(".view").hide()
        $(this.editors).find(".editor").show()
        this.instrMemEditor.refresh()
        this.dataMemEditor.refresh()

        this.update()
    }
}
