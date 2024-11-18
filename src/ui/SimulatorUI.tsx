import {useState, useRef} from "react"
import toast from 'react-hot-toast';

import { examples, SimSetup } from "./examples";
import { Radix, Bits } from "utils/bits";
import { Simulator } from "simulator/simulator";
import { assembleKeepLineInfo } from "assembler/assembler"
import EditorPanels from "./EditorPanels";
import ViewPanels from "./ViewPanels";
import Controls from "./Controls";
import Datapath from "./Datapath";
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
    const updateSim = <T=void>(val: Simulator|((sim: Simulator) => T)): T => {
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


const defaultRegisters = new Simulator().regFile.registers;

export default function SimulatorUI() {
    const [sim, updateSim] = useSim()

    const [state, setState] = useState<SimState>("unstarted")
    const [speed, setSpeed] = useState(1000) // in ms

    const [code, setCode] = useState("")
    const [assembled, setAssembled] = useState<[number, bigint][]>([])
    const [registers, setRegisters] = useState<bigint[]>(defaultRegisters)
    const [registerRadix, setRegisterRadix] = useState<Radix>("hex")
    const [memory, setMemory] = useState<string>("")
    const [memoryRadix, setMemoryRadix] = useState<Radix>("hex")
    const [memoryWordSize, setMemoryWordSize] = useState(32)

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
            mem = memory.split("\n").filter(s => s).map(s => Bits.parse(s, memoryRadix, memoryWordSize).toInt());
        } catch (e: any) {
            error(`Couldn't parse data memory:\n${e.message}`)
            return false
        }

        // We've got all the data so we can start the simulator
        const newSim = new Simulator(newAssembled.map(([line, instr]) => instr), registers)
        newSim.dataMem.data.storeArray(0n, memoryWordSize / 8, mem)
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

    const loadSimSetup = async (setup: SimSetup) => {
        reset()
        setCode(setup.code ?? "")
        setRegisters(defaultRegisters.map((reg, i) => BigInt(setup.registers?.[i] ?? reg)))
        setRegisterRadix(setup.registerRadix ?? "hex")
        setMemory(setup.memory ?? "")
        setMemoryRadix(setup?.memoryRadix ?? "hex")
        setMemoryWordSize(setup?.memoryWordSize ?? 32)
    }

    useInterval(() => step("play", speed == 0 ? 1000 : 1), (state == "playing") ? speed : null)

    return (
        <div className={`${css.simUI} container-fluid p-2`}>
            <Datapath className={css.datapath}
                sim={sim} state={state} datapath={riscv32DataPath}
                onTabChange={setTab}
            />
            <div className={css.panel}>
                {state == "unstarted" ? (
                    <EditorPanels className="flex-grow-overflow"
                        code={code} onCodeChange={setCode}
                        memory={memory} onMemoryChange={setMemory}
                        registerRadix={registerRadix} onRegisterRadixChange={setRegisterRadix}
                        memoryRadix={memoryRadix} onMemoryRadixChange={setMemoryRadix}
                        memoryWordSize={memoryWordSize} onMemoryWordSizeChange={setMemoryWordSize}
                        registers={registers} onRegistersChange={setRegisters}
                        examples={examples}
                        onLoadExample={async (example) => {
                            const setup = await fetch(example.url).then(res => res.json() as SimSetup)
                            loadSimSetup(setup)
                        }}
                        tab={tab} onTabChange={setTab}
                    />
                ) : (
                    <ViewPanels className="flex-grow-overflow"
                        tab={tab} onTabChange={setTab}
                        sim={sim} code={code} assembled={assembled}
                        registerRadix={registerRadix} onRegisterRadixChange={setRegisterRadix}
                        memoryRadix={memoryRadix} onMemoryRadixChange={setMemoryRadix}
                        memoryWordSize={memoryWordSize} onMemoryWordSizeChange={setMemoryWordSize}
                    />
                )}
                <Controls
                    state={state}
                    speed={speed}
                    onStep={() => step("step")}
                    onReset={reset}
                    onPlay={() => step("play")}
                    onPause={() => { if (state == 'playing') setState("paused") }}
                    onSpeedChange={setSpeed}
                    onClear={() => loadSimSetup({})}
                />
            </div>
        </div>
   )
}
