import React, {useState} from "react"
import toastr from "toastr";
import "toastr/build/toastr.css"

import { examples } from "./examples";
import { Simulator } from "simulator/simulator";
import { assembleKeepLineInfo } from "assembler/assembler"
import SimEditor from "./SimEditor";
import SimView from "./SimView";
import SimControls from "./SimControls";

import 'bootstrap/dist/css/bootstrap.min.css';
import "@fortawesome/fontawesome-free/css/all.css"
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
    // NOTE: Simulator is mutable, so wrap it in an object so react will realize it has changed
    const [sim, setSim_] = useState<{sim: Simulator}>(() => ({sim: new Simulator()}))
    // Return a function that calls func and then updates the wrapper object so react rerenders
    const updateSim = (func: (sim: Simulator) => void) => () => {
        func(sim!.sim)
        setSim_({sim: sim!.sim})
        setAssembled(assembleKeepLineInfo(code))
    }

    const [code, setCode] = useState(`
        li t1, 1
        lw t0, -0(sp)
        lw t0, -1(sp)
    `)

    const [assembled, setAssembled] = useState<[number, bigint][]>([])

    React.useEffect(updateSim(sim => sim.tick()), [])

    return (
        <div id="app">
            <div className="container-fluid d-flex flex-row p-2" style={{height: "100vh"}}>
                <div id="datapath" className="flex-grow-1"> {/* We'll load the SVG inline here. */} </div>
                <div className="d-flex flex-column" style={{height: "100%", maxWidth: "50%"}}>
                    {/* <SimEditor className="flex-grow-overflow"
                        sim={sim} code={code} examples={examples}
                        onCodeChange={setCode}
                    /> */}
                    <SimView className="flex-grow-overflow"
                        sim={sim} code={code} assembled={assembled} examples={examples}
                    />
                    <SimControls state="unstarted" speed={1}/>
                </div>
            </div>
        </div>
   )
}
