import React, {useState} from "react"
import { Button } from "react-bootstrap";

import type { SimState } from "./App";
import HelpModal from "./HelpModal";
import "./SimControls.css"

type Props = {
    state: SimState,
    /** Speed of the play, in ms. Speed 0 for full speed. */
    speed: number,
    onStep?: () => void,
    onReset?: () => void,
    onPlay?: () => void,
    onPause?: () => void,
    onSpeedChange?: (speed: number) => void,
}

export default function SimControls({state, ...props}: Props) {
    const [showHelp, setShowHelp] = useState(false)
    const [minTick, maxTick] = [-2, 5]
    // Speed slider ticks convert to 2**tick steps per second
    const speedTick = Math.max(minTick, Math.min(Math.round(Math.log2(1000 / props.speed)), maxTick))
    const onSpeedChange = (tick: number) => {
        if (tick >= maxTick) {
            return props.onSpeedChange?.(0)
        } else {
            return props.onSpeedChange?.((1 / (2 ** tick)) * 1000)
        }
    }

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
                        <input type="range" className="form-range" title="Speed" min={minTick} max={maxTick}
                            value={speedTick} onChange={e => onSpeedChange(+e.target.value)}
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
