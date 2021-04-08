import {GraphicalSimulator} from "./graphicalSimulator";
import "bootstrap";
// for some reason importing jquery causes problems. jQuery seems to be getting loaded twice. 
// @types/jquery assumes you have jquery in global scope so I'm just using a script tag to include jquery.
// import $ from "jquery"; 


$(function() {
   let sim = new GraphicalSimulator()
})


