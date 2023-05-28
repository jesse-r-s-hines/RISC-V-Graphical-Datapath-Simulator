import {useState} from "react"
import { Button } from "react-bootstrap";
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome'
import { faPause, faPlay, faStepForward, faQuestionCircle, faSync } from '@fortawesome/free-solid-svg-icons'

import type { SimState } from "./SimulatorUI";
import HelpModal from "./HelpModal";
import css from "./Controls.m.css"

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

// in steps/second -> ms/step
const speedTicks = [0.25, 0.5, 1, 2, 4, 8, 16, 32, Infinity].map(d => 1000 / d)

export default function SimControls({state, speed, ...props}: Props) {
    const [showHelp, setShowHelp] = useState(false)

    // find closest tick in speedTicks
    const speedTick = speedTicks.indexOf(speedTicks.reduce((prev, curr) => Math.abs(curr - speed) < Math.abs(prev - speed) ? curr : prev))
    const onSpeedChange = (tick: number) => props.onSpeedChange?.(speedTicks[tick])
    const stepsPerSecond = 1000 / speedTicks[speedTick] // snap the speed to a tick mark

    let speedTitle: string;
    if (stepsPerSecond >= Infinity) {
        speedTitle = "Simulation Speed: Max"
    } else if (stepsPerSecond < 1) {
        speedTitle = `Simulation Speed: ${1 / stepsPerSecond} seconds/step`
    } else if (stepsPerSecond == 1) {
        speedTitle = "Simulation Speed: 1 step/second"
    } else { // stepsPerSecond >= 1
        speedTitle = `Simulation Speed: ${stepsPerSecond} steps/second`
    }

    return (
        <div className={`${css.controls} card`}>
            <div className="card-body d-flex flex-row">
                {(state == "playing") ? (
                    <Button variant="" size="sm" title="Pause Simulation" onClick={props.onPause}>
                        <Icon icon={faPause} className={`${css.icon} text-warning`}/>
                    </Button>
                ) : (<>
                    <Button variant="" size="sm" title="Run Simulation" disabled={state == "done"} onClick={props.onPlay}>
                        <Icon icon={faPlay} className={`${css.icon} text-success`}/>
                    </Button>
                    <Button variant="" size="sm" title="Step Simulation" disabled={state == "done"} onClick={props.onStep}>
                        <Icon icon={faStepForward} className={`${css.icon} text-success`}/>
                    </Button>
                </>)}
                {(state != "unstarted") ? (
                    <Button variant="" size="sm" title="Reset Simulation" onClick={props.onReset}>
                        <Icon icon={faSync} className={`${css.icon} text-danger`}/>
                    </Button>
                ) : ""}
                <div className="flex-grow-1"> {/* Spacer, even if the slider is hidden */}
                    {(state != "unstarted") ? ( 
                        <input type="range" className="form-range"
                            title={speedTitle}
                            min={0} max={speedTicks.length - 1}
                            value={speedTick} onChange={e => onSpeedChange(+e.target.value)}
                        />
                    ) : ""}
                </div>
  
                <Button variant="" size="sm" title="Help / About" onClick={() => setShowHelp(true)}>
                    <Icon icon={faQuestionCircle} className={`${css.icon} text-info`}/>
                </Button>
            </div>
            <HelpModal show={showHelp} onHide={() => setShowHelp(false)}/>
        </div>
   )
}
