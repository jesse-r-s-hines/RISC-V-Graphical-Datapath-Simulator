import {Simulator} from "./simulator"

let sim = new Simulator([
    0x01c28c63n, // beq x5, x28, 24 # +6 instructions, true
    0x005003b3n, // add x7, zero, x5
    0x005003b3n, // add x7, zero, x5
    0x005003b3n, // add x7, zero, x5
    0x005003b3n, // add x7, zero, x5
    0x005003b3n, // add x7, zero, x5
    0x00500333n, // add x6, zero, x5
], {})
sim.run()
