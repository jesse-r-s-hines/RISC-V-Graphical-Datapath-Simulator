import React, {useState} from "react"
import { Button } from "react-bootstrap";

import HelpModal from "./HelpModal";
import "./SimControls.css"

type Props = {
    state: "unstarted"|"playing"|"paused"|"done",
    /** Speed of the play, as steps per second */
    speed: number,
    onStep?: () => void,
    onReset?: () => void,
    onPlay?: () => void,
    onPause?: () => void,
    onSpeedChange?: (speed: number) => void,
}

export default function SimControls({state, ...props}: Props) {
    const [showHelp, setShowHelp] = useState(false)
    const speedTick = Math.trunc(Math.log2(props.speed))

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
                    {(state == "playing") ? ( // 2**x steps per second
                        <input type="range" className="form-range" title="Speed" min={-2} max={4}
                            value={speedTick}
                            onChange={e => props.onSpeedChange?.(+e.target.value)}
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
