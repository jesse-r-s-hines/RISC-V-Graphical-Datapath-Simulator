import React, {} from "react"
import Modal from 'react-bootstrap/Modal';

type Props = {
    show?: boolean
    onHide?: () => void
}


export default function HelpModal({
    show = false, ...props
}: Props) {
    return (
        <Modal show={show} onHide={props.onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Help / About</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {/* Using &#8209; to prevent text-break in middle of RISC-V */}
                <p>
                    Welcome to the RISC&#8209;V Graphical Datapath Simulator! This is a 32&#8209;bit, single-cycle implementation of
                    RISC&#8209;V.  All the 32-bit integer instructions are supported except the syscall and concurrency related
                    instructions and <code>auipc</code>. The datapath is closely based on the design described in
                    <i>Computer Organization and Design RISC&#8209;V Edition</i>
                </p>
                <p>
                    You can write RISC&#8209;V assembly and set the initial registers and initial data memory, and then step through
                    the demo. You can input registers and memory as hex, unsigned decimal or signed decimal by using the dropdowns.
                    While the demo is running, you can use the side pane to view the current memory and registers and labels show the
                    values on each wire. Most components and wires also have a tooltip which gives more details on their functionality
                    and current value.
                </p>
                <p>
                    You can view the source or contribute on <a href="https://github.com/jesse-r-s-hines/RISC-V-Graphical-Datapath-Simulator" target="_blank">GitHub</a>.
                </p>
            </Modal.Body>
        </Modal>
   )
}
