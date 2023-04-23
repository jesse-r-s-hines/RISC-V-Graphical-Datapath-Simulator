import React, {useState} from "react"
import toastr from "toastr";
import "toastr/build/toastr.css"

import { examples, Example } from "./examples";
import { parseInt } from "utils/radix";
import { Simulator } from "simulator/simulator";
import { assembleKeepLineInfo } from "assembler/assembler"
import SimEditor from "./SimEditor";
import SimView from "./SimView";
import SimControls from "./SimControls";
import SimDatapath from "./SimDatapath";
import datapath from "assets/datapath.svg" // import path to the svg
import { DataPathElem, datapathElements } from "./datapath";

import 'bootstrap/dist/css/bootstrap.min.css';
import "@fortawesome/fontawesome-free/css/all.css"
import "css/site.css"
import "tippy.js/dist/tippy.css";

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
    // NOTE: Simulator is mutable, so wrap it in an object so react will realize it has changed
    const [sim, setSim_] = useState<{sim: Simulator}>(() => ({sim: new Simulator()}))
    // Updates the sim then updates the wrapper object so react rerenders
    function updateSim<T>(func: (sim: Simulator) => T): T {
        const val = func(sim!.sim)
        setSim_({sim: sim!.sim})
        return val;
    }

    const [state, setState] = useState<"unstarted"|"playing"|"paused"|"done">("unstarted")
    const [speed, setSpeed] = useState(1)
    const [code, setCode] = useState("")

    const [assembled, setAssembled] = useState<[number, bigint][]>([])



    React.useEffect(() => {
        updateSim(sim => sim.tick())
        // setState("paused")
    }, [])

    const reset = (example?: Example) => {
        setSim_({sim: new Simulator()}) // reset the simulator
        setState("unstarted")
        // if (state == "playing") pause(); // clear interval // TODO

        setCode(example?.code ?? "")
        if (example?.memory) {
            const data = example.memory.split("\n").filter(s => s)
                            .map(s => parseInt(s, example.dataMemRadix ?? "hex", example.dataMemWordSize ?? 32))
            console.log({data, example})
            updateSim(sim => sim.dataMem.data.storeArray(0n, (example.dataMemWordSize ?? 32) / 8, data))
        }

        updateSim(sim => sim.setRegisters(example?.registers ?? {}))
    }


    /**
     * Load code/memory/registers and start the simulation, updates state
     * Returns true if started successfully, false otherwise.
     */
    const start = () => {
        console.log("start")
        let newAssembled: [number, bigint][] = []
        try {
            newAssembled = assembleKeepLineInfo(code)
            setAssembled(newAssembled)
        } catch (e: any) {
            console.log(`Couldn't parse code:\n${e.message}`) // TODO
            return false
        }

        if (newAssembled.length === 0) {
            console.log("Please enter some code to run.") // TODO
            return false
        }

        // this.error(`Couldn't parse data memory:\n${e.message}`) // TODO: Couldn't parse data memory
        // this.error(`Couldn't parse registers:\n${e.message}`)

        // We've got all the data so we can start the simulator
        updateSim(sim => {
            sim.setCode(newAssembled.map(([line, instr]) => instr))
        })

        setState("paused")
        return true
    }
    
    console.log("App.render")

    /** Steps simulation. Returns true if we can continue stepping, or false if the simulation failed to start or is done. */
    const step = () => {
        let started = true;
        if (state == "unstarted") {
            started = start() // try to start, updates state to paused if success
        }
        console.log({started, state})

        if (started && state != "done") { // don't do anything if we are "done" or if start failed
            try {
                let canContinue = updateSim(sim => sim.tick())
                console.log({canContinue})
                if (!canContinue) {
                    setState("done")
                    return false
                }
            } catch (e: any) { // this shouldn't happen.
                setState("done")
                console.log(`Error in simulation:\n${e.message}`) // TODO
                return false
            }
        }
        return true
    }

    return (
        <div id="app">
            <div className="container-fluid d-flex flex-row p-2" style={{height: "100vh"}}>
                <SimDatapath className="flex-grow-1" sim={sim} datapathUrl={datapath} datapathElements={datapathElements} state={state}/>
                <div className="d-flex flex-column" style={{height: "100%", maxWidth: "50%"}}>
                    {state == "unstarted" ? (
                        <SimEditor className="flex-grow-overflow"
                            sim={sim} code={code} examples={examples}
                            onCodeChange={setCode}
                            onRegisterChange={(reg, val) => updateSim(sim => sim.setRegisters({[reg]: val}))}
                            onDataChange={(data, wordSize) => updateSim(sim => sim.dataMem.data.storeArray(0n, wordSize, data))}
                            onLoadExample={async (example) => {
                                if (!example.code && example.url) {
                                    example.code = await fetch(example.url).then(res => res.text())
                                }
                                reset(example)
                            }}
                        />
                    ) : (
                        <SimView className="flex-grow-overflow"
                            sim={sim} code={code} assembled={assembled}
                        />
                    )}
                    <SimControls
                        state="unstarted"
                        speed={speed}
                        onStep={step}
                        onReset={reset}
                        // onPlay={}
                        // onPause={pause}
                        onSpeedChange={setSpeed}
                    />
                </div>
            </div>
        </div>
   )
}
