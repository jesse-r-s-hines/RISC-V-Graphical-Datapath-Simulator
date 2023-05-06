import {useEffect, useState} from "react"
import {Tab, Nav, NavDropdown} from 'react-bootstrap';
import CodeMirror from '@uiw/react-codemirror';
import { bbedit } from '@uiw/codemirror-theme-bbedit';
import { lineNumbers } from "@codemirror/view"

import { riscv as riscvLang } from './riscvLang';
import { Radix, parseInt, intToStr } from "utils/radix"
import { registerNames } from "simulator/constants";
import { Example } from "./examples";
import { StyleProps, getStyleProps } from "./reactUtils";

import css from "./EditorPanels.m.css"

/** Converts a line number into a hex address. */
function hexLine(num: number, inc: number, start = 0n): string {
    return intToStr(start + BigInt((num - 1) * inc), "hex")
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
    onRegisterChange?: (i: number, val: bigint) => void,
}

export function RegisterEditor({registers, onRegisterChange}: RegisterEditorProps) {
    const [regRadix, setRegRadix] = useState<Radix>("hex")
    
    return (
        <div className={`${css.registerEditor} d-flex flex-column h-100`}>
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
                        {registers.map((reg, i) => (
                            <tr key={i}>
                                <td>{`${registerNames[i]} (x${i})`}</td>
                                <td>
                                    <input type="text" disabled={i == 0}
                                        value={intToStr(reg, regRadix)}
                                        onChange={e => onRegisterChange?.(i, parseInt(e.target.value, regRadix, 32))}
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
    data: string,
    dataRadix: Radix,
    dataWordSize: number,
    onDataChange?: (data: string) => void,
    onDataRadixChange?: (radix: Radix) => void,
    onDataWordSizeChange?: (wordSize: number) => void,
}

export function DataEditor({data, dataRadix, dataWordSize, ...props}: DataEditorProps) {
    const [localData, setLocalData] = useState(data)
    useEffect(() => setLocalData(data), [data])

    return (
        <div className={`${css.dataEditor} d-flex flex-column h-100`}>
            <div className="d-flex flex-row">
                <select id="dataMem-radix" className="form-select m-1" value={dataRadix}
                    onChange={(e) => props.onDataRadixChange?.(e.target.value as Radix)}
                >
                    <option value="hex">Hex</option>
                    <option value="signed">Signed Decimal</option>
                    <option value="unsigned">Unsigned Decimal</option>
                </select>
                <select id="dataMem-word-size" className="form-select m-1" value={dataWordSize}
                    onChange={(e) => props.onDataWordSizeChange?.(+e.target.value)}
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
                    value={data}
                    placeholder="Set initial memory..."
                    basicSetup={{
                        lineNumbers: true,
                    }}
                    extensions={[
                        lineNumbers({formatNumber: (l) => hexLine(l, dataWordSize / 8)}),
                    ]}
                    onChange={setLocalData}
                    onBlur={() => props.onDataChange?.(localData)}
                />
            </div>
        </div>
    )
}


type Props = {
    examples: Example[],
    onLoadExample?: (example: Example) => void,
} & CodeEditorProps & RegisterEditorProps & DataEditorProps & StyleProps


export default function EditorPanels(props: Props) {
    return (
        <Tab.Container defaultActiveKey="code">
            <div {...getStyleProps(props, {className: `${css.editorPanels} d-flex flex-column`})}>
                <Nav variant="tabs" className="flex-row flex-nowrap">
                    <Nav.Item><Nav.Link eventKey="code">Code</Nav.Link></Nav.Item>
                    <Nav.Item><Nav.Link eventKey="registers">Registers</Nav.Link></Nav.Item>
                    <Nav.Item><Nav.Link eventKey="memory">Memory</Nav.Link></Nav.Item>
                    <Nav.Item>
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
                        <RegisterEditor registers={props.registers} onRegisterChange={props.onRegisterChange} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="memory" title="Memory" className="">
                        <DataEditor
                            data={props.data} dataRadix={props.dataRadix} dataWordSize={props.dataWordSize}
                            onDataChange={props.onDataChange} onDataRadixChange={props.onDataRadixChange}
                            onDataWordSizeChange={props.onDataWordSizeChange}
                        />
                    </Tab.Pane>
                </Tab.Content>
            </div>
        </Tab.Container>
   )
}
