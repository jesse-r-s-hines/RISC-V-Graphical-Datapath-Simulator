import {useEffect, useState, useRef} from "react"
import {Tab, Nav} from 'react-bootstrap';
import classNames from 'classnames';

import { Radix, bits } from "utils/bits";
import { Simulator } from "simulator/simulator";
import { registerNames } from "simulator/constants";
import { StyleProps, getStyleProps } from "./reactUtils";
import type { SimTab } from "./SimulatorUI";

import css from "./ViewPanels.m.css"

type Props = {
    sim: Simulator,
    code: string,
    assembled: [number, bigint][],
    tab: SimTab, onTabChange?: (tab: SimTab) => void,
    registerRadix: Radix
    onRegisterRadixChange?: (newRegisterRadix: Radix) => void,
    memoryRadix: Radix
    onMemoryRadixChange?: (newMemoryRadix: Radix) => void,
    memoryWordSize: number
    onMemoryWordSizeChange?: (newMemoryWordSize: number) => void,
} & StyleProps

export default function ViewPanels({sim, tab, registerRadix, memoryRadix, memoryWordSize, ...props}: Props) {
    const lines = props.code.split("\n")
    const listing = props.assembled.map(([line, instr], i) => (
        {addr: Simulator.textStart + BigInt(i * 4), instr, line: lines[line - 1].trim()}
    ))

    const instrMemTable = useRef<HTMLTableElement>(null)
    useEffect(() => {
        instrMemTable.current?.querySelector(`.${css.currentInstruction}`)?.scrollIntoView({behavior: "smooth", block: "nearest"})
    }, [sim.pc.data])


    return (
        <Tab.Container activeKey={tab} onSelect={(k) => props.onTabChange?.((k ?? "code") as SimTab)}>
            <div {...getStyleProps(props, {className: `${css.viewPanels} d-flex flex-column`})}>
                <Nav variant="tabs" className="flex-row flex-nowrap">
                    <Nav.Item><Nav.Link eventKey="code">Code</Nav.Link></Nav.Item>
                    <Nav.Item><Nav.Link eventKey="registers">Registers</Nav.Link></Nav.Item>
                    <Nav.Item><Nav.Link eventKey="memory">Memory</Nav.Link></Nav.Item>
                </Nav>
                <Tab.Content className="flex-grow-overflow">
                    <Tab.Pane eventKey="code" title="Code">
                        <div className="h-100"  style={{overflow: "auto"}}>
                            <table ref={instrMemTable} className="table table-striped table-hover table-bordered address-table">
                                <thead>
                                    <tr><th>Address</th><th>Instruction</th><th>Code</th></tr>
                                </thead>
                                <tbody>
                                    {listing.map(({addr, instr, line}) => (
                                        <tr key={`${addr}`} className={classNames({[css.currentInstruction]: addr === sim.pc.data})}>
                                            <td>{bits(addr, 32).toString("hex")}</td><td>{bits(instr, 32).toString("hex")}</td><td>{line}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Tab.Pane>
                    <Tab.Pane eventKey="registers" title="Registers">
                        <div className="d-flex flex-column h-100">
                            <select id="regFile-radix" className="form-select m-1" value={registerRadix}
                                    onChange={(e) => props.onRegisterRadixChange?.(e.target.value as Radix)}
                            >
                                <option value="hex">Hex</option>
                                <option value="signed">Signed Decimal</option>
                                <option value="unsigned">Unsigned Decimal</option>
                            </select>
                            <div className="flex-grow-overflow"  style={{overflow: "auto"}}>
                                <table
                                    className="table table-striped table-hover table-bordered address-table"
                                    spellCheck={false}
                                >
                                    <tbody>
                                        {sim.regFile.registers.map((reg, i) => (
                                            <tr key={i}>
                                                <td>{`${registerNames[i]} (x${i})`}</td>
                                                <td>{bits(reg, 32).toString(registerRadix)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Tab.Pane>
                    <Tab.Pane eventKey="memory" title="Memory" className="">
                        <div className="d-flex flex-column h-100">
                            <div className="d-flex flex-row">
                                <select id="dataMem-radix" className="form-select m-1" value={memoryRadix}
                                    onChange={(e) => props.onMemoryRadixChange?.(e.target.value as Radix)}
                                >
                                    <option value="hex">Hex</option>
                                    <option value="signed">Signed Decimal</option>
                                    <option value="unsigned">Unsigned Decimal</option>
                                </select>
                                <select id="dataMem-word-size" className="form-select m-1" value={memoryWordSize}
                                    onChange={(e) => props.onMemoryWordSizeChange?.(+e.target.value)}
                                >
                                    <option value="8">Byte</option>
                                    <option value="16">Half-Word</option>
                                    <option value="32">Word</option>
                                </select>
                            </div>
                            <div className="flex-grow-overflow"  style={{overflow: "auto"}}>
                                <table
                                    className="table table-striped table-hover table-bordered address-table"
                                    spellCheck={false}
                                >
                                    <tbody>
                                        {[...sim.dataMem.data.dump(memoryWordSize / 8)].map(([addr, val]) =>
                                            (typeof addr == "bigint") ? (
                                                <tr key={`${addr}`}>
                                                    <td>{bits(addr, 32).toString("hex")}</td>
                                                    <td>{bits(val, memoryWordSize).toString(memoryRadix)}</td>
                                                </tr>
                                            ) : (
                                                <tr key={`${addr}`}><td colSpan={2}>...</td></tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Tab.Pane>
                </Tab.Content>
            </div>
        </Tab.Container>
   )
}
