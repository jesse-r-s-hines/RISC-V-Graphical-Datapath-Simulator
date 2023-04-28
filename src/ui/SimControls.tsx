import React, {useState} from "react"
import { Button } from "react-bootstrap";

import type { SimState } from "./App";
import HelpModal from "./HelpModal";
import "./SimControls.css"

type Props = {
    state: SimState,
    /** Speed of the play, in ms */
    speed: number,
    onStep?: () => void,
    onReset?: () => void,
    onPlay?: () => void,
    onPause?: () => void,
    onSpeedChange?: (speed: number) => void,
}

export default function SimControls({state, ...props}: Props) {
    const [showHelp, setShowHelp] = useState(false)
    // Speed slider ticks convert to 2**tick steps per second
    const speedTick = Math.log2(1000 / props.speed)

    return (
        <div className="sim-controls card">
            <div className="card-body d-flex flex-row">
                {(state == "playing") ? (
                    <Button variant="" size="sm" title="Pause Simulation" onClick={props.onPause}>
                        <i className="fas fa-pause text-warning"></i>
                    </Button>
                ) : (<>
                    <Button variant="" size="sm" title="Run Simulation" disabled={state == "done"} onClick={props.onPlay}>
                        <i className="fas fa-play text-success"></i>
                    </Button>
                    <Button variant="" size="sm" title="Step Simulation" disabled={state == "done"} onClick={props.onStep}>
                        <i className="fas fa-step-forward text-success"></i>
                    </Button>
                </>)}
                {(state != "unstarted") ? (
                    <Button variant="" size="sm" title="Reset Simulation" onClick={props.onReset}>
                        <i className="fas fa-sync text-danger"></i>
                    </Button>
                ) : ""}
                <div className="flex-grow-1"> {/* Spacer, even if the slider is hidden */}
                    {(state == "playing") ? ( 
                        <input type="range" className="form-range" title="Speed" min={-2} max={6}
                            value={speedTick}
                            onChange={e => props.onSpeedChange?.((1 / (2 ** (+e.target.value))) * 1000)}
                        />
                    ) : ""}
                </div>
  
                <Button variant="" size="sm" title="Help / About" onClick={() => setShowHelp(true)}>
                    <i className="fas fa-question-circle text-info"></i>
                </Button>
            </div>
            <HelpModal show={showHelp} onHide={() => setShowHelp(false)}/>
        </div>
   )
}
