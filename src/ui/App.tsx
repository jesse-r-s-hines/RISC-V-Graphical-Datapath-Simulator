import React, {useEffect} from "react"
import $ from "jquery"
import "bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';
import "@fortawesome/fontawesome-free/css/all.css"
import toastr from "toastr";
import "toastr/build/toastr.css"

import { VisualSim } from "ui/visualSim";
import datapath from "assets/datapath.svg" // import path to the svg

// This needs to be imported last so that my css overrides any defaults
import "css/site.css"

type Props = {
}

toastr.options = {
    positionClass: "toast-top-left",
    closeButton: true,
    timeOut: 8000,
    // timeOut: 0,
    // extendedTimeOut: 0,
    preventDuplicates: true,
}

export default function App(props: Props) {
    useEffect(() => {
        $(function() {
            // Load databath svg then run the simulation. Load SVG inline so we can manipulate it.
            $("#datapath").load(datapath, () => {
                (window as any).sim = new VisualSim()
            })
        })
    }, [])

    return (
        <div id="app">
            <div className="container-fluid d-flex flex-row p-2" style={{height: "100vh"}}>
                <div id="datapath" className="flex-grow-1"> {/* We'll load the SVG inline here. */} </div>
                <div className="d-flex flex-column" style={{maxWidth: "50%"}}>
                    <ul className="nav nav-tabs flex-row flex-nowrap" id="editor-tabs" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button className="nav-link active" id="instrMem-tab" data-bs-toggle="tab" data-bs-target="#instrMem-panel"
                                type="button" role="tab" aria-controls="instrMem-panel" aria-selected="true">
                                Code
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button className="nav-link" id="regFile-tab" data-bs-toggle="tab" data-bs-target="#regFile-panel"
                                type="button" role="tab" aria-controls="regFile-panel" aria-selected="false">
                                Registers
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button className="nav-link" id="dataMem-tab" data-bs-toggle="tab" data-bs-target="#dataMem-panel"
                                type="button" role="tab" aria-controls="dataMem-panel" aria-selected="false">
                                Memory
                            </button>
                        </li>
                        <li id="examples" className="nav-item dropdown">
                            <button className="nav-link dropdown-toggle" id="examples-button" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                Load Example
                            </button>
                            <ul className="dropdown-menu dropdown-menu-dark" aria-labelledby="examples-button"></ul>
                        </li>
                    </ul>
                    <div className="card p-1 flex-grow-1" style={{minHeight: "0"}}> {/* minHeight: 0; fixes some scroll issues for some reason. */}
                        <div id="editors" className="tab-content" style={{height: "100%"}}>
                            <div id="instrMem-panel" className="tab-pane fade show active" role="tabpanel" aria-labelledby="instrMem-tab"><div>
                                <div className="editor">
                                    <textarea placeholder="Write RISC&#8209;V assembly..."></textarea>
                                </div>
                                <div className="view" style={{display: "none"}}>
                                    <table className="table table-striped table-hover table-bordered address-table">
                                        <thead>
                                            <tr><th>Address</th><th>Instruction</th><th>Code</th></tr>
                                        </thead>
                                        <tbody></tbody>
                                    </table>
                                </div>
                            </div></div>
                            <div id="regFile-panel" className="tab-pane fade" role="tabpanel" aria-labelledby="regFile-tab"><div>
                                <div className="d-flex flex-row">
                                    <select id="regFile-radix" className="form-select" defaultValue="hex">
                                        <option value="hex">Hex</option>
                                        <option value="signed">Signed Decimal</option>
                                        <option value="unsigned">Unsigned Decimal</option>
                                    </select>
                                </div>
                                <div className="editor" spellCheck="false">
                                    <table className="table table-striped table-hover table-bordered address-table">
                                        <tbody></tbody>
                                    </table>
                                </div>
                                <div className="view" style={{display: "none"}}>
                                    <table className="table table-striped table-hover table-bordered address-table">
                                        <tbody></tbody>
                                    </table>
                                </div>
                            </div></div>
                            <div id="dataMem-panel" className="tab-pane fade" role="tabpanel" aria-labelledby="dataMem-tab"><div>
                                <div className="d-flex flex-row">
                                    <select id="dataMem-radix" className="form-select" defaultValue="hex">
                                        <option value="hex">Hex</option>
                                        <option value="signed">Signed Decimal</option>
                                        <option value="unsigned">Unsigned Decimal</option>
                                    </select>
                                    <select id="dataMem-word-size" className="form-select" defaultValue="32">
                                        <option value="8">Byte</option>
                                        <option value="16">Half-Word</option>
                                        <option value="32">Word</option>
                                    </select>
                                </div>
                                <div className="editor">
                                    <textarea placeholder="Set initial memory..."></textarea>
                                </div>
                                <div className="view" style={{display: "none"}}>
                                    <table className="table table-striped table-hover table-bordered address-table">
                                        <thead>
                                            <tr><th>Address</th><th>Data</th></tr>
                                        </thead>
                                        <tbody></tbody>
                                    </table>
                                </div>
                            </div></div>
                        </div> 
                    </div>
                    <div id="controls" className="card"><div className="card-body d-flex flex-row">
                        <button id="play" className="btn btn-sm" title="Run Simulation">
                            <i className="fas fa-play text-success"></i>
                        </button>
                        <button id="pause" className="btn btn-sm" title="Pause Simulation">
                            <i className="fas fa-pause text-warning"></i>
                        </button>
                        <button id="step" className="btn btn-sm" title="Step Simulation">
                            <i className="fas fa-step-forward text-success"></i>
                        </button>
                        <button id="restart" className="btn btn-sm" title="Restart Simulation">
                            <i className="fas fa-sync text-danger"></i>
                        </button>
                        <div className="flex-grow-1">
                            <input id="speed" type="range" className="form-range" title="Speed" min="-2" max="4"/> {/* 2**x steps per second */}
                        </div>
                        <button id="help" className="btn btn-sm" title="Help / About" data-bs-toggle="modal" data-bs-target="#help-modal">
                            <i className="fas fa-question-circle text-info"></i>
                        </button>
                    </div></div>
                </div>
            </div>
 
            <div className="modal fade" id="help-modal" tabIndex={-1} aria-labelledby="help-modal-label" aria-hidden="true">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="help-modal-label">Help / About</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            {/* Using &#8209; to prevent text-break in middle of RISC-V */}
                            <p>
                                Welcome to the RISC&#8209;V Graphical Datapath Simulator! This is a 32&#8209;bit, single-cycle implementation of
                                RISC&#8209;V.  All the 32-bit integer instructions are supported except the syscall and concurrency related
                                instructions and <code>auipc</code>. The datapath is closely based on the design described in
                                <i>Computer Organization and Design RISC&#8209;V Edition</i>
                            </p>
                            <p>
                                You can write RISC&#8209;V assembly and set the initial registers and initial data memory, and then step through
                                the demo. You can input registers and memory as hex, unsigned decimal or signed decimal by using the dropdowns.
                                While the demo is running, you can use the side pane to view the current memory and registers and labels show the
                                values on each wire. Most components and wires also have a tooltip which gives more details on their functionality
                                and current value.
                            </p>
                            <p>You can view the source or contribute on 
                                <a href="https://github.com/jesse-r-s-hines/RISC-V-Graphical-Datapath-Simulator" target="_blank">GitHub</a>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
   )
}
