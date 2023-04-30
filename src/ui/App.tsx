import React from "react"
import toast, { Toaster } from 'react-hot-toast';

import 'bootstrap/dist/css/bootstrap.min.css';
import "css/site.css"
import "tippy.js/dist/tippy.css";
import SimComponent from "./SimComponent";

export default function App() {
    return (
        <React.StrictMode>
            <div id="app">
                <SimComponent/>
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
            </div>
        </React.StrictMode>
   )
}
