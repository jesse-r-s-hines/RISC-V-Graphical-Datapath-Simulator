import React, {useEffect, useState, useRef, createElement} from "react"
import {Tab, Nav, NavDropdown} from 'react-bootstrap';
import CodeMirror from '@uiw/react-codemirror';
import { bbedit } from '@uiw/codemirror-theme-bbedit';
import { lineNumbers } from "@codemirror/view"
import tippy, { followCursor, Instance as Tippy } from 'tippy.js';

import { riscv as riscvLang } from './riscvLang';
import { Radix, parseInt, intToStr } from "utils/radix"
import { Simulator } from "simulator/simulator";
import { registerNames } from "simulator/constants";
import { Example } from "./examples";
import { StyleProps, getStyleProps } from "./reactUtils";
import { DataPathElem } from "./datapath";

import "./SimDatapath.css"

type State = "unstarted"|"playing"|"paused"|"done" // TODO think about this
type Props = {
    sim: {sim: Simulator},
    state: State,
    /** url to the datapath svg */
    datapathUrl: string,
    /** Map CSS selectors to how to render the components */
    datapathElements: Record<string, DataPathElem>,
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
 */
function generateDynamicSvgCss(svg: SVGElement) {
    const wires = [...svg.querySelectorAll<SVGSVGElement>(".wire:not(marker *)")]

    let strokeWidths = new Set(wires.map(wire => {
        let width = getComputedStyle(wire).strokeWidth
        wire.dataset.strokeWidth = width
        return width
    }))
    let hoverRules = [...strokeWidths].map(width => `
        .wires:hover .wire[data-stroke-width="${width}"], .wire[data-stroke-width="${width}"]:hover {
            stroke-width: calc(${width} * 1.5) !important
        }
    `)

    let markerPos = ["start", "mid", "end"] as const
    let markers = new Set(wires.flatMap(wire => markerPos.map(pos => {
        // marker must be of form "url(#marker-id)" or "url(https://current-address.com/#marker-id)"
        let marker = getComputedStyle(wire)[`marker-${pos}` as any].trim().match(/url\(\s*"?.*?#(.+?)"?\s*\)/)?.[1]

        if (marker && marker != "none") {
            wire.dataset[camelCase(`marker-${pos}`)] = marker
            return marker
        }
        return ""
    }).filter(marker => marker)))
    let markerRules = [...markers].flatMap(marker => markerPos.map(pos => `
        .powered.wire[data-marker-${pos}="${marker}"] {
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

    let rules = [...hoverRules, ...markerRules]

    // inject the generated styles into the SVG
    // rules.forEach(rule => style.sheet!.insertRule(rule)) // this works, but doesn't show the CSS in the inspector
    let style = document.createElement("style")
    style.classList.add("dynamic-styles")
    style.textContent = rules.join("\n")
    svg.prepend(style)
}

function setupDatapath(svg: SVGElement, datapathElements: Record<string, DataPathElem>) {
    for (let [id, config] of Object.entries(datapathElements)) {
        let elem = svg.querySelector(`#${id}`)

        // Verify the SVG contains the things we expect
        if (!elem) throw Error(`${id} doesn't exist`);
        if (config.powered && !elem.classList.contains("wire") && !elem.querySelector(".wire"))
            throw Error(`#${id} has powered defined, but no ".wire" elements`);

        if (config.description || config.tooltip) {
            tippy(elem, {
                followCursor: true, // or "initial" keep it where you entered
                allowHTML: true,
                maxWidth: "20em",
                plugins: [followCursor],
            });
        }

        // if (config.onclick) {
            // let onclick = config.onclick // rescope to capture current value and let typescript know is defined.
            // elem.on("click", (event) => onclick(this)) // TODO
        // }

        if (config.label && !elem.querySelector("text.value-label"))
            throw Error(`#${id} has label defined, but no ".value-label" elements`);

        if (config.showSubElemsByValue && !elem.querySelector("[data-show-on-value]"))
            throw Error(`#${id} has showSubElemsByValue defined, but no "[data-show-on-value]" elements`);
    }

    generateDynamicSvgCss(svg)
}

function updateDatapath(svg: SVGElement, sim: Simulator, datapathElements: Record<string, DataPathElem>, state: State) {
    let running = (state == "playing" || state == "paused")

    for (let [id, config] of Object.entries(datapathElements)) {
        let elem = svg.querySelector(`#${id}`)!
       
        if (config.description || config.tooltip) {
            let tooltip = (elem as any)._tippy as Tippy
            let value = running && config.tooltip ? config.tooltip(sim) : undefined
            let description = (!running || !config.hideDescriptionWhenRunning) ? config.description : undefined
            let content = [description, value].filter(s => s).join("<hr/>")
            tooltip.setContent(content)

            if (content) {
                tooltip.enable()
            } else {
                tooltip.hide(); // disable will lock the tooltip open if it was open
                tooltip.disable()
            }
        }

        const wires = [...(elem.matches(".wire") ? [elem] : []), ...elem.querySelectorAll('.wire')]
        if (running && config.powered && config.powered(sim)) {
            // add powered to elem if its a wire, and any wires under elem
            for (const wire of wires) wire.classList.add("powered")
        } else {
            for (const wire of wires) wire.classList.remove("powered")
        }

        if (config.label) {
            let content = running ? config.label(sim) : "" // set labels empty if not running
            for (const [i, text] of elem.querySelectorAll(".value-label").entries()) {
                // use first tspan if there is one, else place directly in text element.
                let labelElem = text.querySelector("tspan") ?? text
                labelElem.textContent = content
            }
        }

        if (config.showSubElemsByValue) {
            elem.querySelectorAll<SVGSVGElement>("[data-show-on-value]").forEach(elem => {
                elem.style.display = "none"
            })
            if (running) {
                let val = config.showSubElemsByValue(sim)
                elem.querySelectorAll<SVGSVGElement>(`[data-show-on-value="${val}"]`).forEach(elem => {
                    elem.style.removeProperty("display") // TODO reset to previous value
                })
            }
        }
    }
}


export default function SimDatapath(props: Props) {
    const {sim} = props.sim;
    const divRef = useRef<HTMLDivElement>(null)
    const [datapathSrc, setDatapathSrc] = useState<string>()
    
    useEffect(() => {
        fetch(props.datapathUrl).then(r => r.text()).then(src => setDatapathSrc(src))
        // TODO: Cleanup
    }, [props.datapathUrl])

    useEffect(() => {
        if (datapathSrc) {
            divRef.current!.innerHTML = datapathSrc
            const svg = divRef.current!.querySelector("svg")!
            setupDatapath(svg, props.datapathElements)
            updateDatapath(svg, sim, props.datapathElements, props.state)
        }
    }, [datapathSrc, props.datapathElements])

    return (
        <div ref={divRef} {...getStyleProps(props, {className: "sim-datapath"})}></div>
   )
}
