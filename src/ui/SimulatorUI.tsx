import {useState, useRef} from "react"
import toast from 'react-hot-toast';

import { examples, Example } from "./examples";
import { Radix, Bits } from "utils/bits";
import { Simulator } from "simulator/simulator";
import { assembleKeepLineInfo } from "assembler/assembler"
import SimEditor from "./EditorPanels";
import SimView from "./ViewPanels";
import SimControls from "./Controls";
import SimDatapath from "./Datapath";
import { riscv32DataPath } from "./datapath";
import { useInterval } from "./reactUtils";
import css from "./SimulatorUI.m.css"

/** Display an error message to the user. */
function error(message: string) {
    console.error(message)
    toast.error(message, {id: "error"})
}

export type SimState = "unstarted"|"playing"|"paused"|"done"
export type SimTab = "code"|"registers"|"memory"

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
    if (!simRef.current) {
        simRef.current = new Simulator()
        simRef.current.tick() // tick once to initialize the sim so its valid for datapath (we'll recreate the sim when we actually start it)
    }

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


export default function SimulatorUI() {
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

    const [tab, setTab] = useState<SimTab>("code")

    const reset = () => {
        setState("unstarted")
        setAssembled([])
    }

    /**
     * Load code/memory/registers and start the simulation.
     * Returns true if started successfully, false otherwise.
     */
    const start = () => {
        let newAssembled: [number, bigint][];
        try {
            newAssembled = assembleKeepLineInfo(code)
            setAssembled(newAssembled)
        } catch (e: any) {
            error(`Couldn't parse code:\n${e.message}`)
            return false
        }

        if (newAssembled.length === 0) {
            error("Please enter some code to run.")
            return false
        }

        let mem: bigint[];
        try {
            mem = data.split("\n").filter(s => s).map(s => Bits.parse(s, dataRadix, dataWordSize).toInt());
        } catch (e: any) {
            error(`Couldn't parse data memory:\n${e.message}`)
            return false
        }

        // We've got all the data so we can start the simulator
        const newSim = new Simulator(newAssembled.map(([line, instr]) => instr), registers)
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
                if (done) {
                    nextState = "done"
                } else {
                    nextState = (mode == "play" ? 'playing' : 'paused')
                }
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
        <div className={`${css.simUI} container-fluid p-2`}>
            <SimDatapath className={css.datapath}
                sim={sim} state={state} datapath={riscv32DataPath}
                onTabChange={setTab}
            />
            <div className={css.panel}>
                {state == "unstarted" ? (
                    <SimEditor className="flex-grow-overflow"
                        code={code} onCodeChange={setCode}
                        data={data} onDataChange={setData}
                        dataRadix={dataRadix} onDataRadixChange={setDataRadix}
                        dataWordSize={dataWordSize} onDataWordSizeChange={setDataWordSize}
                        registers={registers} onRegisterChange={(i, val) => setRegisters({[i]: val})}
                        examples={examples} onLoadExample={loadExample}
                        tab={tab} onTabChange={setTab}
                    />
                ) : (
                    <SimView className="flex-grow-overflow"
                        tab={tab} onTabChange={setTab}
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
   )
}
