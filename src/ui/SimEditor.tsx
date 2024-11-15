import React, {useEffect, useState} from "react"
import {Tab, Nav, NavDropdown} from 'react-bootstrap';
import CSS from 'csstype';
import CodeMirror from '@uiw/react-codemirror';
import { bbedit } from '@uiw/codemirror-theme-bbedit';
import { lineNumbers } from "@codemirror/view"

import { riscv as riscvLang } from './riscvLang';
import { Radix, parseInt, intToStr } from "utils/radix"
import { Simulator } from "simulator/simulator";
import { registerNames } from "simulator/constants";
import { Example } from "./examples";

import "./SimEditor.css"

type Props = {
    sim: {sim: Simulator},
    examples: Example[]
    className?: string,
    style?: CSS.Properties,
    onCodeChange?: (code: string) => void,
    onRegisterChange?: (i: number, val: bigint) => void,
    onDataChange?: (data: bigint[]) => void,
    onLoadExample?: (example: Example) => void,
}

/** Converts a line number into a hex address. */
function hexLine(num: number, inc: number, start: bigint = 0n): string {
    return intToStr(start + BigInt((num - 1) * inc), "hex")
}

export default function SimEditor(props: Props) {
    const {sim} = props.sim;
    const [memRadix, setMemRadix] = useState<Radix>("hex")
    const [memWordSize, setDataMemWordSize] = useState<number>(32)
    const [regRadix, setRegRadix] = useState<Radix>("hex")

    return (
        <Tab.Container defaultActiveKey="code">
            <div className={`sim-editor d-flex flex-column ${props.className}`} style={{...props.style}}
            >
                <Nav variant="tabs" className="flex-row flex-nowrap">
                    <Nav.Item><Nav.Link eventKey="code">Code</Nav.Link></Nav.Item>
                    <Nav.Item><Nav.Link eventKey="registers">Registers</Nav.Link></Nav.Item>
                    <Nav.Item><Nav.Link eventKey="memory">Memory</Nav.Link></Nav.Item>
                    <Nav.Item>
                        <NavDropdown title="Load Example">
                            {props.examples.map(example => (
                                <NavDropdown.Item key={example.name} title={example.description}
                                    onClick={() => props.onLoadExample?.(example)}
                                >
                                    {example.name}
                                </NavDropdown.Item>
                            ))}
                        </NavDropdown>
                    </Nav.Item>
                </Nav>
                <Tab.Content className="flex-grow-overflow">
                    <Tab.Pane eventKey="code" title="Code">
                        <CodeMirror
                            style={{height: "100%"}} height="100%"
                            placeholder="Write RISC&#8209;V assembly..."
                            theme={bbedit}
                            basicSetup={{
                                lineNumbers: true,
                            }}
                            extensions={[
                                riscvLang(),
                            ]}
                            onChange={props.onCodeChange}
                        />
                    </Tab.Pane>
                    <Tab.Pane eventKey="registers" title="Registers">
                        <div className="d-flex flex-column h-100">
                            <select id="regFile-radix" className="form-select m-1" value={regRadix}
                                    onChange={(e) => setRegRadix(e.target.value as Radix)}
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
                                                <td>
                                                    <input type="text" disabled={i == 0}
                                                        value={intToStr(reg, regRadix)}
                                                        onChange={e => props.onRegisterChange?.(i,
                                                            parseInt(e.target.value, regRadix, 32)
                                                        )}
                                                    />
                                                </td>
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
                                <select id="dataMem-radix" className="form-select m-1" value={memRadix}
                                    onChange={(e) => setMemRadix(e.target.value as Radix)}
                                >
                                    <option value="hex">Hex</option>
                                    <option value="signed">Signed Decimal</option>
                                    <option value="unsigned">Unsigned Decimal</option>
                                </select>
                                <select id="dataMem-word-size" className="form-select m-1" value={memWordSize}
                                    onChange={(e) => setDataMemWordSize(+e.target.value)}
                                >
                                    <option value="8">Byte</option>
                                    <option value="16">Half-Word</option>
                                    <option value="32">Word</option>
                                </select>
                            </div>
                            <div className="flex-grow-overflow">
                                <CodeMirror
                                    style={{height: "100%"}} height="100%"
                                    theme={bbedit}
                                    placeholder="Set initial memory..."
                                    basicSetup={{
                                        lineNumbers: true,
                                    }}
                                    extensions={[
                                        lineNumbers({formatNumber: (l) => hexLine(l, memWordSize / 8)}),
                                    ]}
                                    onChange={(value) => props.onDataChange?.(
                                        value.split("\n").filter(s => s).map(s => parseInt(s, memRadix, memWordSize))
                                    )}/>
                            </div>
                        </div>
                    </Tab.Pane>
                </Tab.Content>
            </div>
        </Tab.Container>
   )
}
