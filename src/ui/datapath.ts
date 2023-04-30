import { Simulator } from "simulator/simulator"
// import { VisualSim } from "./visualSim.ts"
import { registerNames } from "simulator/constants"

import { Bits, Bit } from "utils/bits"
import { TruthTable } from "utils/truthTable"
import { Radix, intToStr } from "utils/radix"

/**
 * # SVG
 * 
 * The datapath is rendered on an SVG file. Each wire and component of the simulator is mapped to an ID
 * in the SVG. The SVG also uses classes and data attributes on elements so that we can render the current
 * state of the simulation.
 * 
 * ## Classes
 * - wire 
 *   Can go on a path. Used for emphasizing the hovered wire and coloring powered wires.
 * - wires 
 *   Can go on a group containing wire paths. When a wire-group is hovered all wire paths in it will be emphasized. 
 *   Lets you make labels emphasize their associated wire, or to treat multiple paths as one wire.
 * - value-label 
 *   Indicates a text box which we will show the current value of a wire.
 * - powered 
 *   This class is added in JS. Indicates a wire that is high.
 * 
 * ## Data attributes
 * - data-show-on-value -- Used in muxes to make a wire showing which input is being used. 
 */

/** 
 * Describe an element in the datapath and how to render it.
 */
export interface DataPathElem {
    description?: string, // a description shown in the tooltip.
    hideDescriptionWhenRunning?: boolean // if the description is redundant when the value is being shown.
    label?: (sim: Simulator) => string, // the current value to display in a textbox
    tooltip?: (sim: Simulator) => string, // the current value with explanation shown in the tooltip.
    powered?: (sim: Simulator) => boolean, // return true if a wire is "powered" (powered wires will colored)
    // onclick?: (visSim: any) => void, // call when an element is clicked
    // return a value, and will show matching elements under this element that marked with value in `data-show-on-value`
    showSubElemsByValue?: (sim: Simulator) => string,
}




/** Returns html showing num as hex, signed, and unsigned */
export function intToAll(num: bigint|Bits, bits: number = 32): string {
    let radices = [["Hex", "hex"], ["Unsigned", "unsigned"], ["Signed", "signed"]]
    let lines = radices.map(([l, r]) => `${l}: ${intToStr(num, r, bits)}`)
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

const writeSrcNames = new TruthTable([
    [["00"], "ALU result"],
    [["01"], "memory result"],
    [["10"], "PC + 4"],
])



/** All the elements in the datapath and how to render them, tooltips, etc. */
export const datapathElements: Record<string, DataPathElem> = {
    // Components
    "pc": {
        description: "The program counter stores the address of the current instruction.",
        tooltip: (sim) => `Current Instruction: ${intToStr(sim.pc.data, "hex")}`,
    },
    "instrMem": {
        description: "Stores the program.",
        // onclick: (visSim) => $("#instrMem-tab").tab("show") // TODO
    },
    "control": {
        description: "Tells the rest of the processor what to do.",
    },
    "regFile": {
        description: "Stores the 32 registers.",
        // onclick: (visSim) => $("#regFile-tab").tab("show") // TODO
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
        tooltip: (sim) => aluSummaries.match(sim.alu.aluControl)(sim.alu.in1, sim.alu.in2),
    },
    "dataMem": {
        description: "Stores the data the program is working with.",
        // onclick: (visSim) => $("#dataMem-tab").tab("show") // TODO
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
        tooltip: (sim) => `${intToStr(sim.instrSplit.opCode, "bin")} (${opCodeNames.match(sim.instrSplit.opCode)})`,
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
        powered: (sim) => sim.control.regWrite != 0,
    },
    "control-aluSrc": {
        description: "Whether to use source register 2 or the immediate.",
        tooltip: (sim) => `${sim.control.aluSrc} (${sim.control.aluSrc ? "use immediate" : "use register"})`,
        powered: (sim) => sim.control.aluSrc != 0,
    },
    "control-memWrite": {
        description: "Whether to write memory.",
        hideDescriptionWhenRunning: true,
        tooltip: (sim) => `${sim.control.memWrite} (${sim.control.memWrite ? "write memory" : "don't write memory"})`,
        powered: (sim) => sim.control.memWrite != 0,
    },
    "control-aluOp": {
        description: "What type of instruction this is. ALU Control will determine the exact ALU operation to use.",
        tooltip: (sim) => `${intToStr(sim.control.aluOp, "bin")} (${aluOpNames.match(sim.control.aluOp)})`,
        powered: (sim) => Bits.toInt(sim.control.aluOp) != 0n,
        label: (sim) => intToStr(sim.control.aluOp, "bin"),
    },
    "control-writeSrc": {
        description: "What to write to the register file.",
        hideDescriptionWhenRunning: true,
        tooltip: (sim) => `${intToStr(sim.control.writeSrc, "unsigned")} (write ${writeSrcNames.match(sim.control.writeSrc)} to register)`,
        powered: (sim) => Bits.toInt(sim.control.writeSrc) != 0n,
        label: (sim) => intToStr(sim.control.writeSrc, "unsigned"),
    },
    "control-memRead": {
        description: "Whether to read from memory.",
        hideDescriptionWhenRunning: true,
        tooltip: (sim) => `${sim.control.memRead} (${sim.control.memRead ? "read memory" : "don't read memory"})`,
        powered: (sim) => sim.control.memRead != 0,
    },
    "control-branchZero": {
        description: "Whether to branch when ALU result is zero.",
        hideDescriptionWhenRunning: true,
        tooltip: (sim) => `${sim.control.branchZero} (${sim.control.branchZero ? "branch on zero" : "don't branch on zero"})`,
        powered: (sim) => sim.control.branchZero != 0,
    },
    "control-branchNotZero": {
        description: "Whether to branch when ALU result is not zero.",
        hideDescriptionWhenRunning: true,
        tooltip: (sim) => `${sim.control.branchNotZero} (${sim.control.branchNotZero ? "branch on not zero" : "don't branch on not zero"})`,
        powered: (sim) => sim.control.branchNotZero != 0,
    },
    "control-jump": {
        description: "Unconditionally jump.",
        hideDescriptionWhenRunning: true,
        tooltip: (sim) => `${sim.control.jump} (${sim.control.jump ? "do jump" : "don't jump"})`,
        powered: (sim) => sim.control.jump != 0,
    },
    "control-jalr": {
        description: "Jump to a register + immediate.",
        tooltip: (sim) => `${sim.control.jalr} (${sim.control.jalr ? "do jump register" : "don't jump register"})`,
        powered: (sim) => sim.control.jalr != 0,
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
        tooltip: (sim) => `${intToStr(sim.aluControl.aluControl, "bin")} (${aluControlNames.match(sim.aluControl.aluControl)})`,
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
        powered: (sim) => sim.alu.zero != 0,
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
        powered: (sim) => sim.jumpControl.takeBranch != 0,
    },
    "dataMem-readData": {
        tooltip: (sim) => intToAll(sim.dataMem.readData),
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
