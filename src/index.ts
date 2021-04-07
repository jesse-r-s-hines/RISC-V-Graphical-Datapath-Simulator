import {Simulator} from "./simulator";
import "bootstrap";
import CodeMirror from "codemirror";
import "codemirror/addon/display/placeholder"
// for some reason importing jquery causes problems. jQuery seems to be getting loaded twice. 
// @types/jquery assumes you have jquery in global scope so I'm just using a script tag to include jquery.
// import $ from "jquery"; 

// let sim = new Simulator([
//     0x005003b3n, // add x7, zero, x5
// ], {})
// sim.run()

$(function() {
    // Load the SVG
    $("#datapath").load("./datapath.svg")

    $("#editor-tabs").on("shown.bs.tab", (event) => {
        let tab = $( $(event.target).data("bs-target") ).find(".CodeMirror")[0] as any
        if (tab) tab.CodeMirror.refresh() // We have to refresh the CodeMirror after it is shown
    })

    function hexLine(num: number, inc: number, start: number = 0): string {
        num = (start + num - 1) * inc
        return "0x" + num.toString(16).padStart(8, "0")
    }

    // Set up instruction memory tab
    let instrMemEditor = CodeMirror.fromTextArea($("#instrMem-editor textarea")[0] as HTMLTextAreaElement, {
        lineNumbers: true,
        lineNumberFormatter: (l) => hexLine(l, 4),
    });
    
    // set up the data memory tab
    let dataMemEditor = CodeMirror.fromTextArea($("#dataMem-editor textarea")[0] as HTMLTextAreaElement, {
        lineNumbers: true,
        lineNumberFormatter: (l) => hexLine(l, 4),
    });

    // set up the register file tab
    let registers = [
        "zero", "ra", "sp",  "gp",  "tp", "t0", "t1", "t2",
        "s0",   "s1", "a0",  "a1",  "a2", "a3", "a4", "a5",
        "a6",   "a7", "s2",  "s3",  "s4", "s5", "s6", "s7",
        "s8",   "s9", "s10", "s11", "t3", "t4", "t5", "t6",
    ]
    for (let [i, reg] of registers.entries()) {
        $("#regFile-editor").append(`
            <div class="input-group" style="font-family: monospace;">
                <span class="input-group-text" style="width: 7em">${reg} (x${i})</span>
                <input type="text" class="register-input form-control">
            </div>
        `)
    }

})


