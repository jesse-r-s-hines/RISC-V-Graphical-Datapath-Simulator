import {useEffect, useState} from "react"
import {Tab, Nav, NavDropdown} from 'react-bootstrap';
import CodeMirror from '@uiw/react-codemirror';
import { bbedit } from '@uiw/codemirror-theme-bbedit';
import { lineNumbers } from "@codemirror/view"

import { riscv as riscvLang } from './riscvLang';
import { Radix, bits, Bits } from "utils/bits"
import { registerNames } from "simulator/constants";
import { Example } from "./examples";
import { StyleProps, getStyleProps } from "./reactUtils";
import type { SimTab } from "./SimulatorUI";

import css from "./EditorPanels.m.css"

/** Converts a line number into a hex address. */
function hexLine(num: number, inc: number, start = 0n): string {
    return bits(start + BigInt((num - 1) * inc), 32).toString("hex")
}


type CodeEditorProps = {
    code: string,
    onCodeChange?: (code: string) => void,
}

export function CodeEditor({code, onCodeChange}: CodeEditorProps) {
    const [localCode, setLocalCode] = useState(code)
    useEffect(() => setLocalCode(code), [code])

    return (
        <CodeMirror
            className={css.codeEditor}
            style={{height: "100%"}} height="100%"
            placeholder="Write RISC&#8209;V assembly..."
            theme={bbedit}
            value={code}
            basicSetup={{
                lineNumbers: true,
            }}
            extensions={[
                riscvLang(),
            ]}
            onChange={setLocalCode}
            onBlur={() => onCodeChange?.(localCode)}
        />
    )
}


type RegisterEditorProps = {
    registers: bigint[],
    onRegistersChange?: (newRegisters: bigint[]) => void,
    registerRadix: Radix,
    onRegisterRadixChange?: (newRadix: Radix) => void,
}

export function RegisterEditor({
    registers, onRegistersChange, registerRadix, onRegisterRadixChange,
}: RegisterEditorProps) {
    const registersToStr = (registers: bigint[]) => registers.map(reg => bits(reg, 32).toString(registerRadix))
    const [localRegisters, setLocalRegisters] = useState(registersToStr(registers))
    useEffect(() => setLocalRegisters(registersToStr(registers)), [registers, registerRadix])

    return (
        <div className={`${css.registerEditor} d-flex flex-column h-100`}>
            <select id="regFile-radix" className="form-select m-1" value={registerRadix} title="Register Radix"
                onChange={(e) => onRegisterRadixChange?.(e.target.value as Radix)}
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
                        {localRegisters.map((reg, i) => (
                            <tr key={i}>
                                <td>{`${registerNames[i]} (x${i})`}</td>
                                <td>
                                    <input type="text"
                                        disabled={i == 0}
                                        value={reg}
                                        onChange={e => setLocalRegisters(localRegisters.map((r, j) => i == j ? e.target.value : r))}
                                        onBlur={e => {
                                            let newRegs: bigint[]|undefined
                                            try {
                                                newRegs = localRegisters.map(r => Bits.parse(r, registerRadix, 32).toInt())
                                            } catch {
                                            }
                                            if (newRegs !== undefined) {
                                                onRegistersChange?.(newRegs)
                                            } else { // wipe changes if invalid
                                                setLocalRegisters(registersToStr(registers))
                                            }
                                        }}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}


type DataEditorProps = {
    memory: string,
    memoryRadix: Radix,
    memoryWordSize: number,
    onMemoryChange?: (data: string) => void,
    onMemoryRadixChange?: (radix: Radix) => void,
    onMemoryWordSizeChange?: (wordSize: number) => void,
}

export function MemoryEditor({memory, memoryRadix, memoryWordSize, ...props}: DataEditorProps) {
    const [localData, setLocalData] = useState(memory)
    useEffect(() => setLocalData(memory), [memory])

    return (
        <div className={`${css.dataEditor} d-flex flex-column h-100`}>
            <div className="d-flex flex-row">
                <select id="dataMem-radix" className="form-select m-1" value={memoryRadix} title="Memory Radix"
                    onChange={(e) => props.onMemoryRadixChange?.(e.target.value as Radix)}
                >
                    <option value="hex">Hex</option>
                    <option value="signed">Signed Decimal</option>
                    <option value="unsigned">Unsigned Decimal</option>
                </select>
                <select id="dataMem-word-size" className="form-select m-1" value={memoryWordSize} title="Memory Word Size"
                    onChange={(e) => props.onMemoryWordSizeChange?.(+e.target.value)}
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
                    value={memory}
                    placeholder="Set initial memory..."
                    basicSetup={{
                        lineNumbers: true,
                    }}
                    extensions={[
                        lineNumbers({formatNumber: (l) => hexLine(l, memoryWordSize / 8)}),
                    ]}
                    onChange={setLocalData}
                    onBlur={() => props.onMemoryChange?.(localData)}
                />
            </div>
        </div>
    )
}


type Props = {
    examples: Example[],
    onLoadExample?: (example: Example) => void,
    tab: SimTab, onTabChange?: (tab: SimTab) => void,
} & CodeEditorProps & RegisterEditorProps & DataEditorProps & StyleProps


export default function EditorPanels(props: Props) {
    return (
        <Tab.Container activeKey={props.tab} onSelect={(k) => props.onTabChange?.((k ?? 'code') as SimTab)}>
            <div {...getStyleProps(props, {className: `${css.editorPanels} d-flex flex-column`})}>
                <Nav variant="tabs" className="flex-row flex-nowrap">
                    <Nav.Item><Nav.Link eventKey="code">Code</Nav.Link></Nav.Item>
                    <Nav.Item><Nav.Link eventKey="registers">Registers</Nav.Link></Nav.Item>
                    <Nav.Item><Nav.Link eventKey="memory">Memory</Nav.Link></Nav.Item>
                    <Nav.Item className="ms-auto">
                        <NavDropdown title="Load Example" className="popper-warning-fix">
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
                        <CodeEditor code={props.code} onCodeChange={props.onCodeChange} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="registers" title="Registers">
                        <RegisterEditor
                            registers={props.registers} onRegistersChange={props.onRegistersChange}
                            registerRadix={props.registerRadix} onRegisterRadixChange={props.onRegisterRadixChange}
                        />
                    </Tab.Pane>
                    <Tab.Pane eventKey="memory" title="Memory" className="">
                        <MemoryEditor
                            memory={props.memory} onMemoryChange={props.onMemoryChange}
                            memoryRadix={props.memoryRadix} onMemoryRadixChange={props.onMemoryRadixChange}
                            memoryWordSize={props.memoryWordSize} onMemoryWordSizeChange={props.onMemoryWordSizeChange}
                        />
                    </Tab.Pane>
                </Tab.Content>
            </div>
        </Tab.Container>
   )
}
