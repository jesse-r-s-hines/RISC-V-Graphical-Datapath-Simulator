import React from "react"
import toast, { Toaster } from 'react-hot-toast';

import 'bootstrap/dist/css/bootstrap.min.css';
import "css/site.css"
import "tippy.js/dist/tippy.css";
import SimulatorUI from "./SimulatorUI";

export default function App() {
    return (
        <React.StrictMode>
            <SimulatorUI/>
            <Toaster
                position="top-left"
                containerStyle={{
                    opacity: "90%",
                }}
                toastOptions={{
                    duration: 8000, // TODO: Maybe make these dismissible? Or show error somewhere more accessible?
                    style: {
                        width: '350px',
                    }
                }}
            />
        </React.StrictMode>
   )
}
