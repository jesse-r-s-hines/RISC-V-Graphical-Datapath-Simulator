import $ from "jquery"
import "bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';
import "@fortawesome/fontawesome-free/css/all.css"
import toastr from "toastr";
import "toastr/build/toastr.css"

import { VisualSim } from "ui/visualSim";
import datapath from "assets/datapath.svg" // import path to the svg

// This needs to be imported last so that my css overrides any defaults
import "css/site.css"
import "../index.html"

toastr.options = {
   positionClass: "toast-top-left",
   closeButton: true,
   timeOut: 8000,
   // timeOut: 0,
   // extendedTimeOut: 0,
   preventDuplicates: true,
}

$(function() {
   // Load databath svg then run the simulation. Load SVG inline so we can manipulate it.
   $("#datapath").load(datapath, () => {
      (window as any).sim = new VisualSim()
   })
})


