import $ from "jquery";
import {Simulator} from "./simulator";
import "bootstrap";
import CodeMirror from "codemirror";
import "codemirror/addon/display/placeholder"

// let sim = new Simulator([
//     0x005003b3n, // add x7, zero, x5
// ], {})
// sim.run()

$("#datapath").load("./datapath.svg")

let textarea = <HTMLTextAreaElement>($("#instrMem-editor textarea")[0])
var editor = CodeMirror.fromTextArea(textarea, {
    lineNumbers: true,
    lineNumberFormatter: (l) => "0x" + ((l-1)*4).toString(16).padStart(8, "0")
});
