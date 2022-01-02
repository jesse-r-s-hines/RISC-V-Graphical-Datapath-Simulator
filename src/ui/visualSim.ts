import { Simulator } from "simulator/simulator";
import { Bits, fromTwosComplement, toTwosComplement } from "utils/bits"
import { TruthTable } from "utils/truthTable"
import { registerNames } from "simulator/constants"
import { assemble, assembleKeepLineInfo } from "assembler/assembler"

import CodeMirror from "codemirror";
import "codemirror/addon/display/placeholder"
import "codemirror/lib/codemirror.css"
import "./risc-mode"
import tippy, { followCursor, Instance as Tippy } from 'tippy.js';
import "tippy.js/dist/tippy.css";
import toastr from "toastr";

type CodeMirror = CodeMirror.Editor
type Radix = "hex" | "bin" | "signed" | "unsigned"

// Some utility methods

/**
 * Takes a string an converts into into a positive bigint with the given radix. Throw exception if fails.
 * Strings with "0x" and "0b" prefixes will be interpreted as hex and binary regardless of radix.
 * @param bits the number of bits the output will be. 
 */
function parseInt(str: string, radix: Radix, bits: number): bigint {
    try {
        if (radix == "hex") {
            var num = BigInt( /^0[xb]/.test(str) ? str : `0x${str}` )
        } else if (radix == "bin") {
            var num = BigInt( /^0[xb]/.test(str) ? str : `0b${str}` )
        } else if (radix == "signed") {
            var num =  toTwosComplement(BigInt(str), bits)
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
 * @param bits the number of bits the output will be. If omitted and you pass a Bits, it 
 *             will get the size from the bits, otherwise it will default to 32.
 */
 function intToStr(num: bigint|Bits, radix: string, bits?: number): string {
    if (num instanceof Array) {
        bits = bits ?? num.length
        num = Bits.toInt(num)
    } else {
        bits = bits ?? 32
    }

    if (radix == "hex") {
        return "0x" + num.toString(16).toUpperCase().padStart(Math.ceil(bits / 4), "0")
    } else if (radix == "bin") {
        return "0b" + num.toString(2).padStart(bits, "0")
    } else if (radix == "signed") {
        return fromTwosComplement(num, bits).toString()
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

/** 
 * Describe an element in the datapath and how to render it.
 */
interface DataPathElem {
    description?: string, // a description shown in the tooltip.
    hideDescriptionWhenRunning?: boolean // if the description is redundant when the value is being shown.
    label?: (sim: Simulator) => string, // the current value to display in a textbox
    tooltip?: (sim: Simulator) => string, // the current value with explanation shown in the tooltip.
    active?: (sim: Simulator) => boolean, // return true if a wire should be "powered"
    onclick?: (visSim: VisualSim) => void, // call when an element is clicked
    // return a value, and will show matching elements under this element that marked with value in `data-show-on-value`
    showSubElemsByValue?: (sim: Simulator) => string,
    callback?: (visSim: VisualSim) => void, // arbitrary callback on each update.
}

/**
 * Stores a snapshot of code, register, and memory settings
 */
interface Snapshot {
    code?: string,
    memory?: string,
    registers?: Record<number, string>
    dataMemRadix?: Radix,
    dataMemWordSize?: number,
    regFileRadix?: Radix,
}
interface Example extends Snapshot {
    name: string,
    description: string,
    url?: string,
}

/**
 * # SVG
 * 
 * The datapath is rendered in an SVG file. Each wire and component of the simulator is mapped to an ID
 * in the SVG. The SVG also uses classes and data attributes on elements so that we can render the current
 * state of the simulation.
 * 
 * ## Classes
 * - wire -- All wires have this class. Used for emphasizing the hovered wire and coloring active wires.
 * - datapath-label -- Indicates a text box which we will show the current value of a wire.
 * - outline -- Indicates the outline of a component.
 * - hide-when-running -- These elements are only shown when the simulation unstarted or done.
 * - hide-when-not-running -- These elements are only shown when the simulation is running
 * - powered -- This class is added in JS. Indicates a wire that is high.
 * 
 * ## Data attributes
 * - data-show-on-value -- Used in muxes to make a wire showing which input is being used. 
 */

/** State the simulation is in. */
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
    private playing: number = 0; // Timer handle to the play loop, or 0 if not playing.

    private examples: Example[] = []

    /** All the elements in the datapath and how to render them, tooltips, etc. */
    private static readonly datpathElements: Record<string, DataPathElem> = {
        // Components
        "pc": {
            description: "The program counter stores the address of the current instruction.",
            tooltip: (sim) => `Current Instruction: ${intToStr(sim.pc.data, "hex")}`,
        },
        "instrMem": {
            description: "Stores the program.",
            onclick: (visSim) => $("#instrMem-tab").tab("show")
        },
        "control": {
            description: "Tells the rest of the processor what to do.",
        },
        "regFile": {
            description: "Stores the 32 registers.",
            onclick: (visSim) => $("#regFile-tab").tab("show")
        },
        "immGen": {
            description: "Extracts the sign-extended immediate from the instruction.",
        },
        "aluControl": {
            description: "Tells the ALU which operation to preform.",
        },
        "aluInputMux": {
            description: "Switches between source register 2 or the immediate value.",
            showSubElemsByValue: (sim) => intToStr(sim.aluInputMux.select, "unsigned"),
        },
        "alu": {
            description: "Does arithmetic on two values.",
            tooltip: (sim) => VisualSim.aluSummaries.match(sim.alu.aluControl)(sim.alu.in1, sim.alu.in2),
        },
        "dataMem": {
            description: "Stores the data the program is working with.",
            onclick: (visSim) => $("#dataMem-tab").tab("show")
        },
        "pcAdd4": {
            description: "Increment PC to the next instruction.",
        },
        "jalrMux": {
            description: "Switch between PC or source register 1. JALR sets the PC to a register plus an immediate.",
            showSubElemsByValue: (sim) => intToStr(sim.jalrMux.select, "unsigned"),
        },
        "branchAdder": {
            description: "Calculate the target address of a branch or jump.",
        },
        "jumpControl": {
            description: "Determine whether a branch should be taken or not.",
        },
        "pcMux": {
            description: "Switch between PC + 4 or the branch target.",
            showSubElemsByValue: (sim) => intToStr(sim.pcMux.select, "unsigned"),
        },
        "writeSrcMux": {
            description: "Switch between ALU result, memory read data, or PC + 4.",
            showSubElemsByValue: (sim) => intToStr(sim.writeSrcMux.select, "unsigned"),
        },

        // Wires
        "pc-out": {
            tooltip: (sim) => intToStr(sim.pc.out, "hex"),
            label: (sim) => intToStr(sim.pc.out, "hex"),
        },
        "instrMem-instruction": {
            tooltip: (sim) => intToStr(sim.instrMem.instruction, "hex"),
            label: (sim) => intToStr(sim.instrMem.instruction, "hex"),
        },
        "instrMem-instruction-opcode": {
            description: "The opcode of the instruction.",
            tooltip: (sim) => `${intToStr(sim.instrSplit.opCode, "bin")} (${VisualSim.opCodeNames.match(sim.instrSplit.opCode)})`,
            label: (sim) => intToStr(sim.instrSplit.opCode, "bin"),
        },
        "instrMem-instruction-rd": {
            description: "The register to write.",
            tooltip: (sim) => `${intToStr(sim.instrSplit.rd, "unsigned")} (${registerNames[Bits.toNumber(sim.instrSplit.rd)]})`,
            label: (sim) => intToStr(sim.instrSplit.rd, "unsigned"),
        },
        "instrMem-instruction-funct3": {
            description: "More bits to determine the instruction.",
            tooltip: (sim) => `${intToStr(sim.instrSplit.funct3, "bin")}`, // TODO show what type of instruction?
            label: (sim) => intToStr(sim.instrSplit.funct3, "bin"),
        },
        "instrMem-instruction-rs1": {
            description: "The first register to read.",
            tooltip: (sim) => `${intToStr(sim.instrSplit.rs1, "unsigned")} (${registerNames[Bits.toNumber(sim.instrSplit.rs1)]})`,
            label: (sim) => intToStr(sim.instrSplit.rs1, "unsigned"),
        },
        "instrMem-instruction-rs2": {
            description: "The second register to read.",
            tooltip: (sim) => `${intToStr(sim.instrSplit.rs2, "unsigned")} (${registerNames[Bits.toNumber(sim.instrSplit.rs2)]})`,
            label: (sim) => intToStr(sim.instrSplit.rs2, "unsigned"),
        },
        "instrMem-instruction-funct7": {
            description: "More bits to determine the instruction.",
            tooltip: (sim) => `${intToStr(sim.instrSplit.funct7, "bin")}`,
            label: (sim) => intToStr(sim.instrSplit.funct7, "bin"),
        },
        "control-regWrite": {
            description: "Whether to write the register file.",
            hideDescriptionWhenRunning: true,
            tooltip: (sim) => `${sim.control.regWrite} (${sim.control.regWrite ? "write register file" : "don't write register file"})`,
            active: (sim) => sim.control.regWrite != 0,
        },
        "control-aluSrc": {
            description: "Whether to use source register 2 or the immediate.",
            tooltip: (sim) => `${sim.control.aluSrc} (${sim.control.aluSrc ? "use immediate" : "use register"})`,
            active: (sim) => sim.control.aluSrc != 0,
        },
        "control-memWrite": {
            description: "Whether to write memory.",
            hideDescriptionWhenRunning: true,
            tooltip: (sim) => `${sim.control.memWrite} (${sim.control.memWrite ? "write memory" : "don't write memory"})`,
            active: (sim) => sim.control.memWrite != 0,
        },
        "control-aluOp": {
            description: "What type of instruction this is. ALU Control will determine the exact ALU operation to use.",
            tooltip: (sim) => `${intToStr(sim.control.aluOp, "bin")} (${VisualSim.aluOpNames.match(sim.control.aluOp)})`,
            active: (sim) => Bits.toInt(sim.control.aluOp) != 0n,
            label: (sim) => intToStr(sim.control.aluOp, "bin"),
        },
        "control-writeSrc": {
            description: "What to write to the register file.",
            hideDescriptionWhenRunning: true,
            tooltip: (sim) => `${intToStr(sim.control.writeSrc, "unsigned")} (write ${VisualSim.writeSrcNames.match(sim.control.writeSrc)} to register)`,
            active: (sim) => Bits.toInt(sim.control.writeSrc) != 0n,
            label: (sim) => intToStr(sim.control.writeSrc, "unsigned"),
        },
        "control-memRead": {
            description: "Whether to read from memory.",
            hideDescriptionWhenRunning: true,
            tooltip: (sim) => `${sim.control.memRead} (${sim.control.memRead ? "read memory" : "don't read memory"})`,
            active: (sim) => sim.control.memRead != 0,
        },
        "control-branchZero": {
            description: "Whether to branch when ALU result is zero.",
            hideDescriptionWhenRunning: true,
            tooltip: (sim) => `${sim.control.branchZero} (${sim.control.branchZero ? "branch on zero" : "don't branch on zero"})`,
            active: (sim) => sim.control.branchZero != 0,
        },
        "control-branchNotZero": {
            description: "Whether to branch when ALU result is not zero.",
            hideDescriptionWhenRunning: true,
            tooltip: (sim) => `${sim.control.branchNotZero} (${sim.control.branchNotZero ? "branch on not zero" : "don't branch on not zero"})`,
            active: (sim) => sim.control.branchNotZero != 0,
        },
        "control-jump": {
            description: "Unconditionally jump.",
            hideDescriptionWhenRunning: true,
            tooltip: (sim) => `${sim.control.jump} (${sim.control.jump ? "do jump" : "don't jump"})`,
            active: (sim) => sim.control.jump != 0,
        },
        "control-jalr": {
            description: "Jump to a register + immediate.",
            tooltip: (sim) => `${sim.control.jalr} (${sim.control.jalr ? "do jump register" : "don't jump register"})`,
            active: (sim) => sim.control.jalr != 0,
        },
        "immGen-immediate": {
            tooltip: (sim) => intToAll(sim.immGen.immediate),
            label: (sim) => intToStr(sim.immGen.immediate, "signed"),
        },
        "regFile-readData1": {
            tooltip: (sim) => intToAll(sim.regFile.readData1),
            label: (sim) => intToStr(sim.regFile.readData1, "signed"),
        },
        "regFile-readData2": {
            tooltip: (sim) => intToAll(sim.regFile.readData2),
            label: (sim) => intToStr(sim.regFile.readData2, "signed"),
        },
        "aluControl-aluControl": {
            description: "What operation for the ALU to preform.",
            tooltip: (sim) => `${intToStr(sim.aluControl.aluControl, "bin")} (${VisualSim.aluControlNames.match(sim.aluControl.aluControl)})`,
            label: (sim) => intToStr(sim.aluControl.aluControl, "bin"),
        },
        "aluInputMux-out": {
            tooltip: (sim) => intToAll(sim.aluInputMux.out),
        },
        "alu-result": {
            tooltip: (sim) => intToAll(sim.alu.result),
            label: (sim) => intToStr(sim.alu.result, "signed"),
        },
        "alu-zero": {
            description: "Whether the ALU result was zero.",
            hideDescriptionWhenRunning: true,
            tooltip: (sim) => `${sim.alu.zero} (ALU result was ${sim.alu.zero ? "zero" : "not zero"})`,
            active: (sim) => sim.alu.zero != 0,
        },
        "literalFour": {
            tooltip: (sim) => "4",
        },
        "pcAdd4-result": {
            tooltip: (sim) => intToStr(sim.pcAdd4.result, "hex"),
            label: (sim) => intToStr(sim.pcAdd4.result, "hex"),
        },
        "branchAdder-result": {
            tooltip: (sim) => intToStr(sim.branchAdder.result, "hex"),
            label: (sim) => intToStr(sim.branchAdder.result, "hex"),
        },
        "jumpControl-takeBranch": {
            description: "Whether to take the branch or not.",
            hideDescriptionWhenRunning: true,
            tooltip: (sim) => `${sim.jumpControl.takeBranch} (${sim.jumpControl.takeBranch ? "take branch" : "don't take branch"})`,
            active: (sim) => sim.jumpControl.takeBranch != 0,
        },
        "dataMem-readData": {
            tooltip: (sim) => intToAll(sim.dataMem.readData),
            active: (sim) => Bits.toInt(sim.dataMem.readData) != 0n,
        },
        "pcMux-out": {
            tooltip: (sim) => intToStr(sim.pcMux.out, "hex"),
            label: (sim) => intToStr(sim.pcMux.out, "hex"),
        },
        "writeSrcMux-out": {
            tooltip: (sim) => intToAll(sim.writeSrcMux.out),
            label: (sim) => intToStr(sim.writeSrcMux.out, "hex"),
        },
        "jalrMux-out": {
            tooltip: (sim) => intToStr(sim.jalrMux.out, "hex"),
        },
    } 

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
        [["1111"], "Set on less than unsigned"],
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

    private static readonly examples: Example[] = [
        {
            name: "Blank",
            description: "Clear the code, registers, and memory",
        }, {
            name: "Bubble Sort",
            description: "The bubble sort algorithm",
            url: require("assets/examples/bubbleSort.s"),
            dataMemRadix: "signed", regFileRadix: "signed",
            memory: [7, 3, 1, 5, 1, 5, 10, 0, -5, -2].join("\n"),
            registers: {10: "0", 11: "10"},
        }, {
            name: "Selection Sort",
            description: "The selection sort algorithm",
            url: require("assets/examples/selectionSort.s"),
            dataMemRadix: "signed", regFileRadix: "signed",
            memory: [7, 3, 1, 5, 1, 5, 10, 0, -5, -2].join("\n"),
            registers: {10: "0", 11: "10"},
        }
    ]

    constructor() {
        this.sim = new Simulator()

        // initialize elements
        this.svg = $("#datapath")[0]
        this.editors = $("#editors")[0]
        this.instrMemPanel = $("#instrMem-panel")[0]
        this.dataMemPanel = $("#dataMem-panel")[0]
        this.regFilePanel = $("#regFile-panel")[0]

        // Set up the Instruction Memory Tab
        this.instrMemEditor = CodeMirror.fromTextArea($(this.instrMemPanel).find<HTMLTextAreaElement>(".editor textarea")[0], {
            mode: "riscv",
            lineNumbers: true,
        });

        // Set up the Data Memory Tab
        this.dataMemEditor = CodeMirror.fromTextArea($(this.dataMemPanel).find<HTMLTextAreaElement>(".editor textarea")[0], {
            lineNumbers: true, // we'll set lineNumberFormatter in updateSimulation
        });

        // set up the Register File tab
        for (let [i, name] of registerNames.entries()) {
            $(this.regFilePanel).find(".editor tbody").append(`
                <tr> <td>${name} (x${i})</td> <td><input type="text"></td> </tr>
            `)
        }
        $(this.regFilePanel).find(".editor input").eq(0).prop("disabled", true) // disable x0

        this.setupEvents()
        this.setupExamples()
        this.setupDatapath()

        this.update()
    }

    /** Display an error message to the user. Newlines will be converted to <br/> */
    private error(message: string) {
        toastr.error(message.replace(/\n/g, "<br/>"))
    }
    
    private dataMemRadix(): Radix { return $("#dataMem-radix").val() as Radix; }
    /** Word size set for memory, as bits. */
    private dataMemWordSize(): number { return +($("#dataMem-word-size").val() as string); }
    private regFileRadix(): Radix { return $("#regFile-radix").val() as Radix; }

    /** Speed as ms between steps when playing */
    private speed(): number {
        let power = +($("#speed").val() as string) // (2 ** slider) steps per second 
        return (1 / (2 ** power)) * 1000 // convert to ms per step
    }

    private setupEvents() {
        $("#editor-tabs").on("shown.bs.tab", (event) => {
            let tab = $( $(event.target).data("bs-target") ).find(".CodeMirror")[0] as any
            if (tab) tab.CodeMirror.refresh() // We have to refresh the CodeMirror after it is shown
        })

        // reformat number on input
        $(this.regFilePanel).on("change", "input", (event) => this.updateEditorsAndViews())

        $("#dataMem-radix, #dataMem-word-size, #regFile-radix").on("change", (event) => this.updateEditorsAndViews())

        $("#examples").on("click", ".dropdown-item", (event) => {
            this.loadExample(event.target.dataset.exampleName)
            event.preventDefault()
        })

        $("#play").on("click", (event) => this.play())
        $("#pause").on("click", (event) => this.pause())
        $("#speed").on("change", (event) => this.updatePlaySpeed())
        $("#step").on("click", (event) => this.step())
        $("#restart").on("click", (event) => this.restart())
    }

    private setupDatapath() {
        for (let id in VisualSim.datpathElements) {
            let elem = $(this.svg).find(`#${id}`)
            let config = VisualSim.datpathElements[id];

            // Verify the SVG contains the things we expect
            if (!elem.length) throw Error(`${id} doesn't exist`);
            if (config.active && !elem.hasClass("wire") && !elem.find(".wire").length)
                throw Error(`#${id} has active defined, but no ".wire" elements`);

            if (config.description || config.tooltip) {
                tippy($(this.svg).find(`#${id}`)[0], {
                    followCursor: true, // or "initial" keep it where you entered
                    allowHTML: true,
                    maxWidth: "20em",
                    plugins: [followCursor],
                });
            }

            if (config.onclick) {
                let onclick = config.onclick // rescope to capture current value and let typescript know is defined.
                $(elem).on("click", (event) => onclick(this))
            }

            if (config.label && !elem.find("text.datapath-label").length)
                throw Error(`#${id} has label defined, but no ".datapath-label" elements`);

            if (config.showSubElemsByValue && !elem.find("[data-show-on-value]").length)
                throw Error(`#${id} has showSubElemsByValue defined, but no "[data-show-on-value]" elements`);
        }
    }

    private async setupExamples() {
        this.examples = await Promise.all(VisualSim.examples.map(async example => ({
            ...example,
            code: example.url ? await (await fetch(example.url)).text() : example.code
        })))

        this.examples.forEach((example) => $("#examples .dropdown-menu").append(
            $(`<li>
                <a class="dropdown-item" href="#" data-example-name="${example.name}"
                   data-bs-toggle="tooltip" title="${example.description}">${example.name}</a>
               </li>`)
        ))
    }

    /**
     * Load code/memory/registers and start the simulation, updates state
     * Returns true if started successfully, false otherwise.
     */
    private start() {
        // Get memory, instructions, registers
        let code = this.instrMemEditor.getValue()
        try {
            var assembled = assembleKeepLineInfo(code)
        } catch (e: any) {
            this.error(`Couldn't parse code:\n${e.message}`)
            return false
        }

        if (assembled.length === 0) {
            this.error("Please enter some code to run.")
            return false
        }

        let lines = code.split("\n")
        let asmCode = assembled.map(([line, instr]) => lines[line - 1].trim())
        let machineCode = assembled.map(([line, instr]) => instr)

        let memRadix = this.dataMemRadix()
        let memWordSize = this.dataMemWordSize()
        let memStr = this.dataMemEditor.getValue().trim()
        try {
            // split("") equals [""] for some reason
            var mem = memStr.split("\n").filter(s => s).map(s => parseInt(s, memRadix, memWordSize));
        } catch (e: any) {
            this.error(`Couldn't parse data memory:\n${e.message}`)
            return false
        }

        let regRadix = this.regFileRadix()
        let regStrs = $(this.regFilePanel).find(".editor input").get().map(elem => $(elem).val() as string)
        try {
            var regs: Record<number, bigint> = {}
            for (let [i, s] of regStrs.entries()) {
                if (s) regs[i] = parseInt(s, regRadix, 32)
            }
        } catch (e: any) {
            this.error(`Couldn't parse registers:\n${e.message}`)
            return false
        }

        // We've got all the data so we can start the simulator
        this.sim.setCode(machineCode)
        this.sim.setRegisters(regs)
        this.sim.dataMem.data.storeArray(0n, memWordSize / 8, mem)

        // setup Instruction Memory view
        let instrMemTable = $(this.instrMemPanel).find(".view tbody")
        instrMemTable.empty()
        for (let [i, instr] of machineCode.entries()) {
            let line = asmCode[i];
            let addr = Simulator.textStart + BigInt(i * 4)
            instrMemTable.append(`
                <tr> <td>${intToStr(addr, "hex")}</td> <td>${intToStr(instr, "hex")}</td> <td>${line}</td> </tr>
            `)
        }

        // Data Memory view is recreated every tick.

        // set up Register File view if needed
        let regFileTable = $(this.regFilePanel).find(".view tbody")
        if (regFileTable.children().length == 0) {
            for (let [i, name] of registerNames.entries()) {
                regFileTable.append(`
                    <tr> <td>${name} (x${i})</td> <td class="register-value"></td> </tr>
                `)
            }
        }

        // Switch to views
        $(this.editors).find(".editor").hide()
        $(this.editors).find(".view").show()

        this.state = "running"
        return true
    }

    /** Updates the controls to match simulator state. */
    private updateControls() {
        $("#play").prop("disabled", this.state == "done")
        $("#play").toggle(!this.playing)
        
        $("#pause").toggle(!!this.playing) // convert to bool
        
        $("#step").toggle(!this.playing)
        $("#step").prop("disabled", this.playing || this.state == "done")
        
        $("#restart").toggle(this.state != "unstarted")

        $("#speed").toggle(!!this.playing)
    }

    /** Update the editor and view panels to match the simulation */
    private updateEditorsAndViews() {
        let memRadix = this.dataMemRadix()
        let memWordSize = this.dataMemWordSize()
        let regRadix = this.regFileRadix()

        if (this.state == "unstarted") {
            // renumber instruction input to match radix
            this.dataMemEditor.setOption("lineNumberFormatter", (l) => hexLine(l, memWordSize / 8))

            // update Register File input placeholders and values to match radix
            let registerTds = $(this.regFilePanel).find(".editor input").get()
            for (let [i, reg] of this.sim.regFile.registers.entries()) {
                $(registerTds[i]).prop("placeholder", intToStr(reg, regRadix))
                let valStr = $(registerTds[i]).val() as string
                if (valStr) { // update the current values to match the radix. Clear if invalid.
                    try {
                        valStr = intToStr(parseInt(valStr, regRadix, 32), regRadix)
                    } catch {
                        valStr = ""
                    }
                    $(registerTds[i]).val(valStr)
                }
            }
        } else { // this.state == "running" or this.state == "done"
            // Update Instruction Memory
            $(this.instrMemPanel).find(".current-instruction").removeClass("current-instruction")
            if (this.state != "done") { // don't show current instruction if we are done.
                let line = Number((this.sim.pc.data - Simulator.textStart) / 4n)
                let currentInstr = $(this.instrMemPanel).find(".view tbody tr")[line]
                currentInstr.classList.add("current-instruction")
                currentInstr.scrollIntoView({behavior: "smooth", block: "nearest"})
            }

            // Update Data Memory
            $(this.dataMemPanel).find(".view tbody").empty()
            for (let [addr, val] of this.sim.dataMem.data.dump(memWordSize / 8)) {
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

        $(this.svg).find(".hide-when-running").toggle(!running)
        $(this.svg).find(".hide-when-not-running").toggle(running)
    
        for (let id in VisualSim.datpathElements) {
            let elem = $(this.svg).find(`#${id}`)
            let config = VisualSim.datpathElements[id];
           
            if (config.description || config.tooltip) {
                let tooltip = (elem[0] as any)._tippy as Tippy
                let value = running && config.tooltip ? config.tooltip(this.sim) : undefined
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

            if (config.label) {
                let content = running ? config.label(this.sim) : "" // set labels empty if not running
                elem.find(".datapath-label").each((i, text) => {
                    // use first tspan if there is one, else place direclty in text element.
                    let labelElem = $(text).find("tspan")[0] ?? text
                    $(labelElem).text(content)
                })
            }

            if (config.showSubElemsByValue) {
                elem.find("[data-show-on-value]").hide()
                if (running) {
                    let val = config.showSubElemsByValue(this.sim)
                    elem.find(`[data-show-on-value="${val}"]`).show()
                }
            }

            if (config.callback) {
                config.callback(this)
            }
        }
    }

    /** update controls, editors, views, and datapath */
    private update() {
        this.updateControls()
        this.updateEditorsAndViews()
        this.updateDatapath()
    }

    /** Start playing the simulation. */
    public play() {
        if (this.step()) { // try to do first step immediately
            this.updatePlaySpeed(); // calls setInterval() and sets this.playing
        }
    }

    /** Starts or updates a setInterval() with the speed from the speed slider. */
    public updatePlaySpeed() {
        if (this.playing) this.pause()
        this.playing = window.setInterval( () => {
            if (!this.step()) this.pause() // keep stepping until the simulation is finished
        }, this.speed())
        this.updateControls()
    }

    /** Stop playing the simulation */
    public pause() {
        clearInterval(this.playing)
        this.playing = 0;
        this.updateControls()
    }

    /** Steps simulation. Returns true if we can continue stepping, or false if the simulation failed to start or is done. */
    public step() {
        if (this.state == "unstarted")
            this.start() // try to start, updates state to running if success

        if (this.state == "running") { // don't do anything if we are "done" or if start failed
            try {
                let canContinue = this.sim.tick()
                if (!canContinue) this.state = "done"
            } catch (e: any) { // this shouldn't happen.
                this.state = "done"
                this.error(`Error in simulation:\n${e.message}`)
                console.error(e)
            }
        }
        this.update()
        return this.state == "running"
    }

    /** Restarts the simulation, set everything back to editor views so we can change the code/memory/registers. */
    public restart() {
        this.sim = new Simulator() // reset the simulator
        this.state = "unstarted"
        if (this.playing) this.pause(); // clear interval

        // Switch back to editors
        $(this.editors).find(".view").hide()
        $(this.editors).find(".editor").show()
        this.instrMemEditor.refresh()
        this.dataMemEditor.refresh()

        this.update()
    }

    /** Clears all code, registers, and data back to default */
    public reset(snapshot: Snapshot = {}) {
        this.restart()

        this.instrMemEditor.setValue(snapshot.code ?? "")
        this.dataMemEditor.setValue(snapshot.memory ?? "")

        $("#dataMem-radix").val(snapshot.dataMemRadix ?? "hex")
        $("#dataMem-word-size").val(snapshot.dataMemWordSize ?? 32)
        $("#regFile-radix").val(snapshot.regFileRadix ?? "hex")

        let registerInputs = $(this.regFilePanel).find(".editor input")
        registerInputs.each((i, input) => {
            $(input).val(snapshot.registers?.[i] ?? "")
        })

        this.update()
    }

    /** Loads an example by name */
    public loadExample(name: string) {
        let example = this.examples.find(e => e.name === name)!
        this.reset(example)
    }
}