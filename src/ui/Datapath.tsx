import {useEffect, useState, useRef} from "react"
import tippy, { followCursor, Instance as Tippy } from 'tippy.js';

import { Simulator } from "simulator/simulator";
import { StyleProps, getStyleProps } from "./reactUtils";
import type  { DataPath, SimTab } from "./datapathElements";
import type { SimState } from "./SimulatorUI";

import css from "./Datapath.m.css"

type Props = {
    sim: Simulator,
    state: SimState,
    datapath: DataPath,
    onTabChange?: (tab: SimTab) => void,
} & StyleProps


/**
 * Setup some initial state for the SVG. This is called once when the SVG is loaded.
 * 
 * Add a CSS variable for the original stroke width so we can use it in the hover CSS and make hover size based on the
 * original stroke width.
 * 
 * Also add a hack to let markers inherit powered color from their path. SVG can't do this by default. In SVG2, there's
 * a context-fill value that can be used to inherit colors from the line easily, but its not supported yet. So, here we
 * generate "powered" versions of all markers, and add some CSS variables that we can use to switch between markers.
 * 
 * Inkscape outputs `marker-start/mid/end` as inline styles so the only way to select them is `getComputedStyle`. If we
 * made inkscape or SVGO output `marker-start/mid/end` we could use just `[marker-start/mid/end]` in CSS instead of the
 * CSS variables, but we'd still need to either generate or manually add powered versions of the markers in the SVG
 * 
 * Currently only safari doesn't support context-fill, so we may be able to remove this hack soon.
 */
function setupDatapath(svg: SVGElement) {
    for (const wire of svg.querySelectorAll<SVGSVGElement>(".wire:not(marker *)")) {
        // Set a CSS var for original width so we can use in the hover CSS
        wire.style.setProperty("--sim-stroke-width", getComputedStyle(wire).strokeWidth)
    }

    const wires = [...svg.querySelectorAll<SVGSVGElement>(".wire:not(marker *)")]

    const markers = new Set<string>()
    for (const wire of wires) {
        for (const pos of ["start", "mid", "end"] as const) {
            // marker must be of form "url(#marker-id)" or "url(https://current-address.com/#marker-id)"
            const marker = getComputedStyle(wire)[`marker-${pos}` as any].trim().match(/url\(\s*"?.*?#(.+?)"?\s*\)/)?.[1]
            if (marker && marker != "none") {
                wire.style.setProperty(`--sim-powered-marker-${pos}`, `url("#${marker}-powered")`)
                markers.add(marker)
            }
        }
    }

    // Create "powered" versions of markers used on paths so that we can make the markers change color with the wire
    for (const marker of markers) {
        const orig = svg.querySelector<SVGSVGElement>(`#${marker}`)!
        const copy = orig.cloneNode(true) as SVGSVGElement
        copy.id = `${marker}-powered`
        copy.classList.add("powered")
        orig.insertAdjacentElement('afterend', copy)
    }
}

function updateDatapath(svg: SVGElement, sim: Simulator, state: SimState, datapath: DataPath) {
    const running = (state == "playing" || state == "paused")

    for (const [selector, configOrFunc] of Object.entries(datapath.elements)) {
        const svgElems = svg.querySelectorAll<SVGElement>(selector)
        if (svgElems.length <= 0) throw Error(`No elements matching "${selector}"`);

        for (const svgElem of svgElems) {
            const config = configOrFunc instanceof Function ? configOrFunc(sim, svgElem) : configOrFunc

            let tooltip = (svgElem as any)._tippy as Tippy|undefined
            const tooltipContent = [config.description, running ? config.tooltip : undefined].filter(s => s).join("<hr/>")
            if (tooltipContent) {
                if (!tooltip) {
                    tooltip = tippy(svgElem, {
                        followCursor: true, // or "initial" keep it where you entered
                        allowHTML: true,
                        maxWidth: "20em",
                        plugins: [followCursor],
                    });
                }
                tooltip.setContent(tooltipContent)
                tooltip.enable()
            } else {
                tooltip?.hide();
                tooltip?.disable()
            }


            if (config.showOnClick) {
                svgElem.dataset.simShowOnClick = config.showOnClick;
            } else {
                delete svgElem.dataset.simShowOnClick
            }


            const labelContent = running ? (config.label ?? "") : ""
            const textElems = svgElem.querySelectorAll<SVGTextElement>("text.value-label")
            if (config.label && textElems.length <= 0)
                throw Error(`${selector} has label defined, but no ".value-label" elements`)
            for (const text of textElems) {
                // use first tspan if there is one, else place directly in text element.
                (text.querySelector("tspan") ?? text).textContent = labelContent
            }


            if (config.powered !== undefined && !svgElem.classList.contains("wire") && !svgElem.querySelector(".wire"))
                throw Error(`${selector} has powered defined, but no ".wire" elements`);
            if (running && config.powered === true) {
                // add powered to elem if its a wire, and any wires under elem
                svgElem.classList.add("powered")
            } else {
                svgElem.classList.remove("powered")
            }


            if ((running && config.show === false) || (!running && config.show !== undefined)) {
                svgElem.classList.add("d-none")
            } else {
                svgElem.classList.remove("d-none")
            }
        }
    }
}


export default function Datapath({sim, state, datapath, ...props}: Props) {
    const divRef = useRef<HTMLDivElement>(null)
    const [loadedSVG, setLoadedSVG] = useState<{url: string, src: string}>()
    
    useEffect(() => {
        const abortController = new AbortController();

        if (loadedSVG?.url != datapath.svgURL) {
            fetch(datapath.svgURL, { signal: abortController.signal }).then(r => r.text()).then(src => {
                divRef.current!.innerHTML = src
                setLoadedSVG({url: datapath.svgURL, src: src})
                setupDatapath(divRef.current!.querySelector("svg")!)
                // setState wil trigger rerender, which will call updateDatapath
            }).catch(e => {
                if (e.name != "AbortError") { throw e } // silence aborts
            })
        } else {
            updateDatapath(divRef.current!.querySelector("svg")!, sim, state, datapath)
        }

        return () => { abortController.abort() }
    }, [loadedSVG, datapath, sim, state])

    const onClick = (e: React.MouseEvent) => {
        const target = (e.target as SVGElement).closest<SVGElement>("[data-sim-show-on-click]")
        if (target) props.onTabChange?.(target?.dataset.simShowOnClick as SimTab)
    }

    return (
        <div ref={divRef} onClick={onClick} {...getStyleProps(props, {className: css.datapath})}></div>
   )
}
