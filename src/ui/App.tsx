import React, {useState, useRef} from "react"
import toast, { Toaster } from 'react-hot-toast';

import { examples, Example } from "./examples";
import { Radix, parseInt } from "utils/radix";
import { Simulator } from "simulator/simulator";
import { assembleKeepLineInfo } from "assembler/assembler"
import SimEditor from "./SimEditor";
import SimView from "./SimView";
import SimControls from "./SimControls";
import SimDatapath from "./SimDatapath";
import datapath from "assets/datapath.svg" // import path to the svg
import { DataPathElem, datapathElements } from "./datapath";
import { useInterval } from "./reactUtils";

import 'bootstrap/dist/css/bootstrap.min.css';
import "@fortawesome/fontawesome-free/css/all.css"
import "css/site.css"
import "tippy.js/dist/tippy.css";

type Props = {
}

/** Display an error message to the user. Newlines will be converted to <br/> */
function error(message: string) {
    console.error(message)
    toast.error(message, {id: "error"})
}

export type SimState = "unstarted"|"playing"|"paused"|"done"

/**
 * Hack to use Simulator as state. Simulator is mutable, so we internally use a ref and manually update a wrapper proxy
 * object so the object identity changes trigger rerender. This is hacky and not good react style, but deepCopying the
 * simulator every time would be expensive.
 * 
 * Do all updates to sim via updateSim, and be careful about mixing mutations and reads since if you create a new sim
 * the sim wrapper won't update until the next render like normal state. You should treat the `sim` result like normal
 * immutable state that doesn't update until next render, even if that isn't always true in this case.
 */
function useSim(): [Simulator, <T=void>(val: Simulator|((sim: Simulator) => T)) => T] {
    const simRef = useRef<Simulator>()
    if (!simRef.current) simRef.current = new Simulator()

    const [simWrapper, setSimWrapper] = useState(new Proxy(simRef.current!, {})) // Dummy proxy to change identity

    // Updates the sim and updates the wrapper so react rerenders
    const updateSim = <T=void,>(val: Simulator|((sim: Simulator) => T)): T => {
        let rtrn: any = undefined;
        if (val instanceof Simulator) {
            simRef.current = val
        } else {
            rtrn = val(simRef.current!)
        }
        setSimWrapper(new Proxy(simRef.current!, {}))
        return rtrn;
    }

    return [simWrapper, updateSim]
}


export default function App(props: Props) {
    const [sim, updateSim] = useSim()

    const [state, setState] = useState<SimState>("unstarted")
    const [speed, setSpeed] = useState(1000) // in ms

    const [code, setCode] = useState("")
    const [assembled, setAssembled] = useState<[number, bigint][]>([])
    const [registers, setRegisters_] = useState<bigint[]>(() => Array(32).fill(0n))
    const setRegisters = (regs: Record<number, bigint>) => {
        setRegisters_(registers.map((val, i) => regs[i] ?? val))
    }
    const [data, setData] = useState<string>("")
    const [dataRadix, setDataRadix] = useState<Radix>("hex")
    const [dataWordSize, setDataWordSize] = useState(32)

    const reset = () => {
        setState("unstarted")
        setAssembled([])
    }

    /**
     * Load code/memory/registers and start the simulation.
     * Returns true if started successfully, false otherwise.
     */
    const start = () => {
        try {
            var newAssembled = assembleKeepLineInfo(code)
            setAssembled(newAssembled)
        } catch (e: any) {
            error(`Couldn't parse code:\n${e.message}`)
            return false
        }

        if (newAssembled.length === 0) {
            error("Please enter some code to run.")
            return false
        }

        try {
            var mem = data.split("\n").filter(s => s).map(s => parseInt(s, dataRadix, dataWordSize));
        } catch (e: any) {
            error(`Couldn't parse data memory:\n${e.message}`)
            return false
        }

        // We've got all the data so we can start the simulator
        const newSim = new Simulator()
        newSim.setCode(newAssembled.map(([line, instr]) => instr))
        newSim.setRegisters(registers)
        newSim.dataMem.data.storeArray(0n, dataWordSize / 8, mem)
        updateSim(newSim)

        return true
    }

    /** Steps simulation. */
    const step = (mode: "play"|"step", count = 1) => {
        let nextState = state
        if (nextState == "unstarted") { // try to start if we are unstarted
            const started = start() // try to start, updates state to paused if success
            if (started) nextState = (mode == "play" ? 'playing' : 'paused')
        }

        if (["paused", "playing"].includes(nextState)) { // don't do anything if we are "done" or if start failed
            try {
                // step the simulation `count` times. We step multiple at once when playing at full speed to avoid rendering each tick
                const done = updateSim(sim => {
                    for (let i = 0; i < count && !sim.isDone(); i++) {
                        sim.tick()
                    }
                    return sim.isDone()
                })
                if (done) nextState = "done"
            } catch (e: any) { // this shouldn't happen.
                nextState = "done"
                error(`Error in simulation:\n${e.message}`)
            }
        }

        setState(nextState)
    }

    const loadExample = async (example: Example) => {
        if (!example.code && example.url) {
            example.code = await fetch(example.url).then(res => res.text())
        }
        reset()
        setCode(example.code ?? "")
        setRegisters(Array(32).fill(0n).map((_, i) => example.registers?.[i] ?? 0n))
        setData(example.memory ?? "")
        setDataRadix(example?.dataMemRadix ?? "hex")
        setDataWordSize(example?.dataMemWordSize ?? 32)
        // otherwise keep the current code etc.
    }

    useInterval(() => step("play", speed == 0 ? 1000 : 1), (state == "playing") ? speed : null)

    return (
        <React.StrictMode>
            <div id="app">
                <div className="container-fluid d-flex flex-row p-2" style={{height: "100vh"}}>
                    <SimDatapath className="flex-grow-1" sim={sim} datapathUrl={datapath} datapathElements={datapathElements} state={state}/>
                    <div className="d-flex flex-column" style={{height: "100%", maxWidth: "50%"}}>
                        {state == "unstarted" ? (
                            <SimEditor className="flex-grow-overflow"
                                code={code} onCodeChange={setCode}
                                data={data} onDataChange={setData}
                                dataRadix={dataRadix} onDataRadixChange={setDataRadix}
                                dataWordSize={dataWordSize} onDataWordSizeChange={setDataWordSize}
                                registers={registers} onRegisterChange={(i, val) => setRegisters({[i]: val})}
                                examples={examples} onLoadExample={loadExample}
                            />
                        ) : (
                            <SimView className="flex-grow-overflow"
                                sim={sim} code={code} assembled={assembled}
                            />
                        )}
                        <SimControls
                            state={state}
                            speed={speed}
                            onStep={() => step("step")}
                            onReset={reset}
                            onPlay={() => step("play")}
                            onPause={() => { if (state == 'playing') setState("paused") }}
                            onSpeedChange={setSpeed}
                        />
                    </div>
                </div>
                <Toaster
                    position="top-left"
                    containerStyle={{
                        opacity: "90%",
                    }}
                    toastOptions={{
                        duration: 8000, // TODO: Maybe make these dismissible? Or show error somewhere more accessible?
                        style: {
                            width: '350px',
                        }
                    }}
                />
            </div>
        </React.StrictMode>
   )
}
