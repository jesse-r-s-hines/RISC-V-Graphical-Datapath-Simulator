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

    constructor() {
        // Load the SVG
        this.svg = $("#datapath")[0]
        $(this.svg).load("./datapath.svg")

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
                    <input type="text" class="register-input form-control">
                </div>
            `)
        }

        // Add events
        $("#editor-tabs").on("shown.bs.tab", (event) => {
            let tab = $( $(event.target).data("bs-target") ).find(".CodeMirror")[0] as any
            if (tab) tab.CodeMirror.refresh() // We have to refresh the CodeMirror after it is shown
        })

        $("#run-simulation").on("click", (event) => this.start())
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
        let code = this.instrMemEditor.getValue().trim().split("\n")
                                      .map(s => this.bigintFromStr(s, 16));

        let mem = this.dataMemEditor.getValue().trim().split("\n")
                                    .map(s => BigInt(parseInt(s, 16)));

        let regStrs = $(this.regEditor).find(".register-input").get().map(i => $(i).val())
        let regs: Record<number, bigint> = {}
        for (let [i, s] of regStrs.entries()) {
            if (s) regs[i] = this.bigintFromStr(s as string, 16)
        }

        console.log(code)
        console.log(mem)
        console.log(regs)
        let sim = new Simulator(code, regs)
        sim.dataMem.data.storeArray(0n, 4, mem)

        sim.run()

        console.log(sim.dataMem.data.toString(4, true))
        console.log(sim.regFile.registers)
    }

}
