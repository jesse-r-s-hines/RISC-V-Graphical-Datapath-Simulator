import "bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';
// for some reason importing jquery causes problems. jQuery seems to be getting loaded twice. 
// @types/jquery assumes you have jquery in global scope so I'm just using a script tag to include jquery.
// import $ from "jquery"; 
import "@fortawesome/fontawesome-free/css/all.css"
import toastr from "toastr";
import "toastr/build/toastr.css"

import {VisualSim} from "./visualSim";
import datapath from "../assets/datapath.svg" // import path to the svg

// This needs to be imported last so that my css overrides any defaults
import "../css/site.css"

toastr.options = {
   positionClass: "toast-top-left",
   closeButton: true,
   timeOut: 8000, // stay
   // timeOut: 0, // stay
   // extendedTimeOut: 0, // stay,
   preventDuplicates: true,
}

$(function() {
   // Load databath svg then run the simulation. We can't include the svg as an img, because we can manipulate it as an img.
   $("#datapath").load(datapath, () => {
      (window as any).sim = new VisualSim()
   })
})


