import {Simulator} from "./simulator";
import CodeMirror from "codemirror";
import "codemirror/addon/display/placeholder"

type CodeMirror = CodeMirror.Editor


/**
 * Handles the GUI
 */
export class GraphicalSimulator {
    svg: HTMLElement
    instrMemEditor: CodeMirror
    dataMemEditor: CodeMirror
    regEditor: HTMLElement

    sim: Simulator

    constructor() {
        // Load the SVG
        this.svg = $("#datapath")[0]
        $(this.svg).load("./dist/datapath.svg")

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
        for (let [i, name] of Simulator.regNames.entries()) {
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
        }
    }
}
