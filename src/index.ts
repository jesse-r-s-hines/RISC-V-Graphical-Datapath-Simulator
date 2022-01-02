import "bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';
import "@fortawesome/fontawesome-free/css/all.css"
import toastr from "toastr";
import "toastr/build/toastr.css"

import { VisualSim } from "./ui/visualSim";
import datapath from "../assets/datapath.svg" // import path to the svg

// This needs to be imported last so that my css overrides any defaults
import "../css/site.css"
/* html-loader imports any assets referenced in the html, such as the jquery script. But if I use HtmlWebpackPlugin,
   these resources don't get recognized by `webpack watch`, and are deleted after any watch update, causing failures.
   Using require directly seems to make watch work. */
require("../index.html")

toastr.options = {
   positionClass: "toast-top-left",
   closeButton: true,
   timeOut: 8000,
   // timeOut: 0,
   // extendedTimeOut: 0,
   preventDuplicates: true,
}

$(function() {
   // Load databath svg then run the simulation. We can't include the svg as an img, because we can manipulate it as an img.
   $("#datapath").load(datapath, () => {
      (window as any).sim = new VisualSim()
   })
})


