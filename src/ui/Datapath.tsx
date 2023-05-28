import {useEffect, useState, useRef} from "react"
import tippy, { followCursor, Instance as Tippy } from 'tippy.js';
import classNames from "classnames";

import { Simulator } from "simulator/simulator";
import { StyleProps, getStyleProps } from "./reactUtils";
import type  { DataPath, SimTab } from "./datapath";
import type { SimState } from "./SimulatorUI";

import css from "./Datapath.m.css"

type Props = {
    sim: Simulator,
    state: SimState,
    datapath: DataPath,
    onTabChange?: (tab: SimTab) => void,
} & StyleProps

function camelCase(s: string) {
    return s.replace(/-./g, x => x[1].toUpperCase())
}

/**
 * Create some CSS rules for hover and powered wires so that we can have the hover width and wire markers relative 
 * to what is defined in the SVG.
 * 
 * If we did this in static CSS we'd have to hardcode the hover width. And we can't fix the powered marker colors in
 * static CSS unless we make inkscape (or SVGO) output marker-start/mid/end as attributes instead of styles somehow
 * so we could use `[marker-end] { marker-end: url(#Arrow-powered) }`. In SVG2, there's a context-fill value that
 * can be used to inherit colors from the line easily, but its not supported yet.
 * 
 * The purpose of this is to make the SVG more flexible, and allow us to have multiple database SVGs in the future.
 * 
 * An alternative, more traditional method would be to make JS events on power/hover that set the inline styles. But
 * then I'd have to worry about reverting state back to default. I might consider changing to that, but I think
 * making the CSS is simpler and faster. Its also easier to switch to static CSS if SVG2 or the `attr()` CSS
 * function ever get supported.
 * 
 * // TODO: Refactor this
 */
function generateDynamicSvgCss(svg: SVGElement) {
    const wires = [...svg.querySelectorAll<SVGSVGElement>(".wire:not(marker *)")]

    const markerPos = ["start", "mid", "end"] as const
    const markers = new Set(wires.flatMap(wire => markerPos.map(pos => {
        // marker must be of form "url(#marker-id)" or "url(https://current-address.com/#marker-id)"
        const marker = getComputedStyle(wire)[`marker-${pos}` as any].trim().match(/url\(\s*"?.*?#(.+?)"?\s*\)/)?.[1]

        if (marker && marker != "none") {
            wire.dataset[camelCase(`marker-${pos}`)] = marker
            return marker
        }
        return ""
    }).filter(marker => marker)))
    const rules = [...markers].flatMap(marker => markerPos.map(pos => `
        .powered.wire[data-marker-${pos}="${marker}"], .powered .wire[data-marker-${pos}="${marker}"] {
            marker-${pos}: url("#${marker}-powered") !important
        }
    `))

    // Create "powered" versions of markers used on paths so that we can make the markers change color with the wire
    markers.forEach(markerId => {
        const orig = svg.querySelector<SVGSVGElement>(`#${markerId}`)!
        const copy = orig.cloneNode(true) as SVGSVGElement
        copy.id = `${markerId}-powered`
        copy.classList.add("powered")
        orig.insertAdjacentElement('afterend', copy)
    })

    // inject the generated styles into the SVG
    // rules.forEach(rule => style.sheet!.insertRule(rule)) // this works, but doesn't show the CSS in the inspector
    const style = document.createElement("style")
    style.classList.add("dynamic-styles")
    style.textContent = rules.join("\n")
    svg.prepend(style)
}

function setupDatapath(svg: SVGElement) {
    for (const wire of svg.querySelectorAll<SVGSVGElement>(".wire:not(marker *)")) {
        // Set a CSS var for original width so we can use in the hover CSS
        wire.style.setProperty("--sim-stroke-width", getComputedStyle(wire).strokeWidth)
    }

    generateDynamicSvgCss(svg)
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


            // All other changes will only run while sim is running. We'll reset the SVG html content when we reset the sim
            if (running) {
                const labelContent = config.label ?? ""
                const textElems = svgElem.querySelectorAll<SVGTextElement>("text.value-label")
                if (config.label && textElems.length <= 0)
                    throw Error(`${selector} has label defined, but no ".value-label" elements`)
                for (const text of textElems) {
                    // use first tspan if there is one, else place directly in text element.
                    (text.querySelector("tspan") ?? text).textContent = labelContent
                }
    
    
                if (config.powered !== undefined && !svgElem.classList.contains("wire") && !svgElem.querySelector(".wire"))
                    throw Error(`${selector} has powered defined, but no ".wire" elements`);
                if (config.powered === true) {
                    // add powered to elem if its a wire, and any wires under elem
                    svgElem.classList.add("powered")
                } else {
                    svgElem.classList.remove("powered")
                }
    
    
                const style = {...config.style, ...(config.show !== undefined ? {display: config.show ? 'inline' : 'none'} : {})};
                for (const [key, value] of Object.entries(style)) {
                    svgElem.style.setProperty(key, `${value}`)
                }
    
    
                if (svgElem.dataset.simOrigClassName === undefined)
                    svgElem.dataset.simOrigClassName = svgElem.getAttribute('class') ?? ""
                svgElem.setAttribute('class', classNames(svgElem.dataset.simOrigClassName, config.className))
    
    
                for (const [key, value] of Object.entries(config.attrs ?? {})) {
                    svgElem.setAttribute(key, `${value}`)
                }
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
