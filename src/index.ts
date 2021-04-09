import {VisualSim} from "./visualSim";
import "bootstrap";
// for some reason importing jquery causes problems. jQuery seems to be getting loaded twice. 
// @types/jquery assumes you have jquery in global scope so I'm just using a script tag to include jquery.
// import $ from "jquery"; 
import toastr from "toastr";

toastr.options = {
   positionClass: "toast-top-left",
   closeButton: true,
   timeOut: 8000, // stay
   // timeOut: 0, // stay
   // extendedTimeOut: 0, // stay,
   preventDuplicates: true,
}

$(function() {
   let sim = new VisualSim()
})


