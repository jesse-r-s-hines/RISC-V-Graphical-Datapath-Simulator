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
    $("#datapath").load("./datapath.svg")

    $("#editor-tabs").on("shown.bs.tab", (event) => {
        let tab = $( $(event.target).data("bs-target") ).find(".CodeMirror")[0] as any
        if (tab) tab.CodeMirror.refresh() // We have to refresh the CodeMirror after it is shown
    })
    
    function hexLine(num: number, inc: number, start: number = 0): string {
        num = (start + num - 1) * inc
        return "0x" + num.toString(16).padStart(8, "0")
    }
    
    let instrMemEditor = CodeMirror.fromTextArea($("#instrMem-editor textarea")[0] as HTMLTextAreaElement, {
        lineNumbers: true,
        lineNumberFormatter: (l) => hexLine(l, 4),
    });
    
    let dataMemEditor = CodeMirror.fromTextArea($("#dataMem-editor textarea")[0] as HTMLTextAreaElement, {
        lineNumbers: true,
        lineNumberFormatter: (l) => hexLine(l, 4),
    });
})
