import {} from "react"
import Modal from 'react-bootstrap/Modal';
import css from "./HelpModal.m.css"

type Props = {
    show?: boolean
    onHide?: () => void
}


export default function HelpModal({
    show = false, ...props
}: Props) {
    return (
        <Modal show={show} onHide={props.onHide} size="lg" className={css.helpModal}>
            <Modal.Header closeButton>
                <Modal.Title>Help / About</Modal.Title>
            </Modal.Header>
            { /* I'm pulling the description string from the HTML template so that it shows up for SEO */ }
            <Modal.Body dangerouslySetInnerHTML={{__html: document.getElementById("help-message")!.innerHTML}}/>
        </Modal>
   )
}
