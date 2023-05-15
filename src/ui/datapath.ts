import { Simulator } from "simulator/simulator"
import { registerNames } from "simulator/constants"
import datapathSVG from "assets/datapath.svg"
import CSS from "csstype"

import { Bits, Radix, bits } from "utils/bits"
import { TruthTable } from "utils/truthTable"

/**
 * This object contains the information needed to render the datapath svg.
 * 
 * We start with a plain SVG file made with inkscape. Then we use this object to update properties of the elements each
 * tick to show the simulation state. Each wire and component of the simulator is mapped to an CSS selector.
 * 
 * ## Special classes within the SVG
 * Most of the styling and CSS should be done on the SVG file itself via inkscape. However we have a few special classes
 * 
 * - wire 
 *   Can go on a path. Used for emphasizing the hovered wire.
 * - wires 
 *   Can go on a group containing multiple wire paths. When a wire-group is hovered all wire paths in it will be
 *   emphasized. Lets you make labels emphasize their associated wire, or to treat multiple paths as one wire.
 * - value-label 
 *   Indicates a text box which we will show the current value of a wire.
 * - powered 
 *   This class is added in JS based on the `powered` prop. Indicates a wire that is high.
 */
export interface DataPath {
    /** Name of the datapath */
    name: string,
    /** URL to the SVG of the datapath. */
    svgURL: string,

    /**
     * Maps CSS selectors to `DataPathElement`s or functions that return `DataPathElement` that tell it how to render the
     * element this tick.
     * 
     * The functions will be called and applied to each element matching the selector. The functions will be passed on
     * object containing `{sim: Simulator, elem: SVGElement}`.
     */
    elements: Record<string, DataPathElementFunc|DataPathElement>,
}

export type DataPathElementFunc = (sim: Simulator, elem: SVGElement) => DataPathElement

export interface DataPathElement {
    /** a description shown in the tooltip. Shown even when not running. */
    description?: string,

    /** The current value to display in a textbox in the `.value-label` text box under this element */
    label?: string,

    /**
     * Current value to show in the tooltip this tick.
     * If `description` is also defined, this will be shown below the description
     */
    tooltip?: string,

    /** return true if a wire is "powered" (powered wires will colored) */
    powered?: boolean,

    /** Hide/show the element. Shortcut for `{style: {display: none}}` */
    show?: boolean,

    /** Show the specified view detail tab when clicking on this element */
    showOnClick?: "code"|"registers"|"memory",

    /** Classes to add to the element */
    className?: string,

    /**
     * Styles to add to the element using a react-like style object.
     * Should return an object with the same keys each tick so that you always override the previous tick's changes.
     */
    style?: CSS.Properties,

    /**
     * Arbitrary html attributes to set on the element.
     * Should return an object with the same keys each tick so that you always override the previous tick's changes.
     */
    attrs?: Record<string, string>,

}

/** Returns html showing num as hex, signed, and unsigned */
export function bitsToAll(b: Bits): string {
    const radices: [string, Radix][] = [["Hex", "hex"], ["Unsigned", "unsigned"], ["Signed", "signed"]]
    const lines = radices.map(([l, r]) => `${l}: ${b.toString(r)}`)
    return lines.join("<br/>")
}

const opCodeNames = new TruthTable([
    [["0110011"], "R-format"],
    [["0010011"], "I-format"],
    [["0000011"], "ld"],
    [["0100011"], "st"],
    [["1100011"], "branch"],
    [["1100111"], "jalr"],
    [["1101111"], "jal"],
    [["0110111"], "lui"],
])

const aluOpNames = new TruthTable([
    [["000"], "load/store"],
    [["001"], "branch"],
    [["010"], "R-type"],
    [["011"], "I-type"],
    [["100"], "LUI"],
])

const aluControlNames = new TruthTable([
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

const aluSummaries = new TruthTable<(a: Bits, b: Bits) => string>([
    [["0000"], (a, b) => `${a.toString("hex")} AND ${b.toString("hex")}`],
    [["0001"], (a, b) => `${a.toString("hex")} OR ${b.toString("hex")}`],
    [["0010"], (a, b) => `${a.toString("signed")} + ${b.toString("signed")}`],
    [["0110"], (a, b) => `${a.toString("signed")} - ${b.toString("signed")}`],
    [["0111"], (a, b) => `${a.toString("signed")} < ${b.toString("signed")}`],
    [["1111"], (a, b) => `${a.toString("unsigned")} < ${b.toString("unsigned")}`],
    [["1000"], (a, b) => `${a.toString("hex")} << ${b.toString("unsigned")}`],
    [["1001"], (a, b) => `${a.toString("hex")} >>> ${b.toString("unsigned")}`],
    [["1011"], (a, b) => `${a.toString("hex")} >> ${b.toString("unsigned")}`],
    [["1100"], (a, b) => `${a.toString("hex")} XOR ${b.toString("hex")}`],
    [["1101"], (a, b) => `LUI ${a.toString("hex")}`],
])

const writeSrcNames = new TruthTable([
    [["00"], "ALU result"],
    [["01"], "memory result"],
    [["10"], "PC + 4"],
])


export const riscv32DataPath: DataPath = {
    name: "RISC-V 32-bit",
    svgURL: datapathSVG,
    elements: {
        "#pc": (sim) => ({
            description: "The program counter stores the address of the current instruction.",
            tooltip: `Current Instruction: ${bits(sim.pc.data, 32).toString("hex")}`,
        }),
        "#instrMem": (sim) => ({
            description: "Stores the program.",
            showOnClick: 'code',
        }),
        "#control": {
            description: "Tells the rest of the processor what to do.",
        },
        "#regFile": {
            description: "Stores the 32 registers.",
            showOnClick: 'registers',
        },
        "#immGen": {
            description: "Extracts the sign-extended immediate from the instruction.",
        },
        "#aluControl": {
            description: "Tells the ALU which operation to preform.",
        },
        "#aluInputMux": {
            description: "Switches between source register 2 or the immediate value.",
        },
        "#aluInputMux [data-mux-val]": (sim, elem) => ({
            show: +elem.dataset.muxVal! == sim.aluInputMux.select.toNumber(),
        }),
        "#alu": (sim) => ({
            description: "Does arithmetic on two values.",
            tooltip: aluSummaries.match(sim.alu.aluControl)(sim.alu.in1, sim.alu.in2),
        }),
        "#dataMem": {
            description: "Stores the data the program is working with.",
            showOnClick: 'memory',
        },
        "#pcAdd4": {
            description: "Increment PC to the next instruction.",
        },
        "#jalrMux": {
            description: "Switch between PC or source register 1. JALR sets the PC to a register plus an immediate.",
        },
        "#jalrMux [data-mux-val]": (sim, elem) => ({
            show: +elem.dataset.muxVal! == sim.jalrMux.select.toNumber(),
        }),
        "#branchAdder": {
            description: "Calculate the target address of a branch or jump.",
        },
        "#jumpControl": {
            description: "Determine whether a branch should be taken or not.",
        },
        "#pcMux": {
            description: "Switch between PC + 4 or the branch target.",
        },
        "#pcMux [data-mux-val]": (sim, elem) => ({
            show: +elem.dataset.muxVal! == sim.pcMux.select.toNumber(),
        }),
        "#writeSrcMux": {
            description: "Switch between ALU result, memory read data, or PC + 4.",
        },
        "#writeSrcMux [data-mux-val]": (sim, elem) => ({
            show: +elem.dataset.muxVal! == sim.writeSrcMux.select.toNumber(),
        }),
    
        // Wires
        "#pc-out": (sim) => ({
            tooltip: sim.pc.out.toString("hex"),
            label: sim.pc.out.toString("hex"),
        }),
        "#instrMem-instruction": (sim) => ({
            tooltip: sim.instrMem.instruction.toString("hex"),
            label: sim.instrMem.instruction.toString("hex"),
        }),
        "#instrMem-instruction-opcode": (sim) => ({
            description: "The opcode of the instruction.",
            tooltip: `${sim.instrSplit.opCode.toString("bin")} (${opCodeNames.match(sim.instrSplit.opCode)})`,
            label: sim.instrSplit.opCode.toString("bin"),
        }),
        "#instrMem-instruction-rd": (sim) => ({
            description: "The register to write.",
            tooltip: `${sim.instrSplit.rd.toString("unsigned")} (${registerNames[sim.instrSplit.rd.toNumber()]})`,
            label: sim.instrSplit.rd.toString("unsigned"),
        }),
        "#instrMem-instruction-funct3": (sim) => ({
            description: "More bits to determine the instruction.",
            tooltip: `${sim.instrSplit.funct3.toString("bin")}`, // TODO show what type of instruction?
            label: sim.instrSplit.funct3.toString("bin"),
        }),
        "#instrMem-instruction-rs1": (sim) => ({
            description: "The first register to read.",
            tooltip: `${sim.instrSplit.rs1.toString("unsigned")} (${registerNames[sim.instrSplit.rs1.toNumber()]})`,
            label: sim.instrSplit.rs1.toString("unsigned"),
        }),
        "#instrMem-instruction-rs2": (sim) => ({
            description: "The second register to read.",
            tooltip: `${sim.instrSplit.rs2.toString("unsigned")} (${registerNames[sim.instrSplit.rs2.toNumber()]})`,
            label: sim.instrSplit.rs2.toString("unsigned"),
        }),
        "#instrMem-instruction-funct7": (sim) => ({
            description: "More bits to determine the instruction.",
            tooltip: `${sim.instrSplit.funct7.toString("bin")}`,
            label: sim.instrSplit.funct7.toString("bin"),
        }),
        "#control-regWrite": (sim) => ({
            description: "Whether to write the register file.",
            tooltip: `${sim.control.regWrite} (${sim.control.regWrite ? "write register file" : "don't write register file"})`,
            powered: sim.control.regWrite != 0,
        }),
        "#control-aluSrc": (sim) => ({
            description: "Whether to use source register 2 or the immediate.",
            tooltip: `${sim.control.aluSrc} (${sim.control.aluSrc ? "use immediate" : "use register"})`,
            powered: sim.control.aluSrc != 0,
        }),
        "#control-memWrite": (sim) => ({
            description: "Whether to write memory.",
            tooltip: `${sim.control.memWrite} (${sim.control.memWrite ? "write memory" : "don't write memory"})`,
            powered: sim.control.memWrite != 0,
        }),
        "#control-aluOp": (sim) => ({
            description: "What type of instruction this is. ALU Control will determine the exact ALU operation to use.",
            tooltip: `${sim.control.aluOp.toString("bin")} (${aluOpNames.match(sim.control.aluOp)})`,
            powered: sim.control.aluOp.toInt() != 0n,
            label: sim.control.aluOp.toString("bin"),
        }),
        "#control-writeSrc": (sim) => ({
            description: "What to write to the register file.",
            tooltip: `${sim.control.writeSrc.toString("unsigned")} (write ${writeSrcNames.match(sim.control.writeSrc)} to register)`,
            powered: sim.control.writeSrc.toInt() != 0n,
            label: sim.control.writeSrc.toString("unsigned"),
        }),
        "#control-memRead": (sim) => ({
            description: "Whether to read from memory.",
            tooltip: `${sim.control.memRead} (${sim.control.memRead ? "read memory" : "don't read memory"})`,
            powered: sim.control.memRead != 0,
        }),
        "#control-branchZero": (sim) => ({
            description: "Whether to branch when ALU result is zero.",
            tooltip: `${sim.control.branchZero} (${sim.control.branchZero ? "branch on zero" : "don't branch on zero"})`,
            powered: sim.control.branchZero != 0,
        }),
        "#control-branchNotZero": (sim) => ({
            description: "Whether to branch when ALU result is not zero.",
            tooltip: `${sim.control.branchNotZero} (${sim.control.branchNotZero ? "branch on not zero" : "don't branch on not zero"})`,
            powered: sim.control.branchNotZero != 0,
        }),
        "#control-jump": (sim) => ({
            description: "Unconditionally jump.",
            tooltip: `${sim.control.jump} (${sim.control.jump ? "do jump" : "don't jump"})`,
            powered: sim.control.jump != 0,
        }),
        "#control-jalr": (sim) => ({
            description: "Jump to a register + immediate.",
            tooltip: `${sim.control.jalr} (${sim.control.jalr ? "do jump register" : "don't jump register"})`,
            powered: sim.control.jalr != 0,
        }),
        "#immGen-immediate": (sim) => ({
            tooltip: bitsToAll(sim.immGen.immediate),
            label: sim.immGen.immediate.toString("signed"),
        }),
        "#regFile-readData1": (sim) => ({
            tooltip: bitsToAll(sim.regFile.readData1),
            label: sim.regFile.readData1.toString("signed"),
        }),
        "#regFile-readData2": (sim) => ({
            tooltip: bitsToAll(sim.regFile.readData2),
            label: sim.regFile.readData2.toString("signed"),
        }),
        "#aluControl-aluControl": (sim) => ({
            description: "What operation for the ALU to preform.",
            tooltip: `${sim.aluControl.aluControl.toString("bin")} (${aluControlNames.match(sim.aluControl.aluControl)})`,
            label: sim.aluControl.aluControl.toString("bin"),
        }),
        "#aluInputMux-out": (sim) => ({
            tooltip: bitsToAll(sim.aluInputMux.out),
        }),
        "#alu-result": (sim) => ({
            tooltip: bitsToAll(sim.alu.result),
            label: sim.alu.result.toString("signed"),
        }),
        "#alu-zero": (sim) => ({
            description: "Whether the ALU result was zero.",
            tooltip: `${sim.alu.zero} (ALU result was ${sim.alu.zero ? "zero" : "not zero"})`,
            powered: sim.alu.zero != 0,
        }),
        "#literalFour": (sim) => ({
            tooltip: "4",
        }),
        "#pcAdd4-result": (sim) => ({
            tooltip: sim.pcAdd4.result.toString("hex"),
            label: sim.pcAdd4.result.toString("hex"),
        }),
        "#branchAdder-result": (sim) => ({
            tooltip: sim.branchAdder.result.toString("hex"),
            label: sim.branchAdder.result.toString("hex"),
        }),
        "#jumpControl-takeBranch": (sim) => ({
            description: "Whether to take the branch or not.",
            tooltip: `${sim.jumpControl.takeBranch} (${sim.jumpControl.takeBranch ? "take branch" : "don't take branch"})`,
            powered: sim.jumpControl.takeBranch != 0,
        }),
        "#dataMem-readData": (sim) => ({
            tooltip: bitsToAll(sim.dataMem.readData),
        }),
        "#pcMux-out": (sim) => ({
            tooltip: sim.pcMux.out.toString("hex"),
            label: sim.pcMux.out.toString("hex"),
        }),
        "#writeSrcMux-out": (sim) => ({
            tooltip: bitsToAll(sim.writeSrcMux.out),
            label: sim.writeSrcMux.out.toString("hex"),
        }),
        "#jalrMux-out": (sim) => ({
            tooltip: sim.jalrMux.out.toString("hex"),
        }),
    }
}
