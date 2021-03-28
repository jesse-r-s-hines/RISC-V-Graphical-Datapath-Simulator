import { expect } from "chai";
import {Simulator} from "../src/simulator";
import {Bits} from "../src/utils";

let REGS = {
    5: 5n,   6: 6n,  7: 7n,
   28: 28n, 29:29n, 30: 30n, 31: 31n,
}

describe("Simulator", () => {
    it('Basic Instructions', () => {
        let sim: Simulator

        sim = new Simulator([
            0x007302b3n, // add x5, x6, x7
        ], REGS)
        sim.run()
        expect(sim.regFile.registers[5]).to.equal(13n)

        sim = new Simulator([
            0x407302b3n, // sub x5, x6, x7
        ], REGS)
        sim.run()
        expect(sim.regFile.registers[5]).to.equal(-1n)

        sim = new Simulator([
            0x01d372b3n, // and x5, x6, x29
        ], REGS)
        sim.run()
        expect(sim.regFile.registers[5]).to.equal(4n)

        sim = new Simulator([
            0x007362b3n, // or x5, x6, x7
        ], REGS)
        sim.run()
        expect(sim.regFile.registers[5]).to.equal(7n)

        sim = new Simulator([
            0x3e5325a3n, // sw x5, 1003(x6)
        ], REGS)
        sim.run()
        expect(sim.dataMem.data.loadWord(1009n)).to.equal(5n)

        sim = new Simulator([
            0x3e5325a3n, // sw x5, 1003(x6)
            0x3eb32383n, // lw x7, 1003(x6)
        ], REGS)
        sim.run()
        expect(sim.regFile.registers[7]).to.equal(5n)

        sim = new Simulator([
            0x01c28c63n, // beq x5, x28, 24 # +6 instructions, true
            0x005003b3n, // add x7, zero, x5
            0x005003b3n, // add x7, zero, x5
            0x005003b3n, // add x7, zero, x5
            0x005003b3n, // add x7, zero, x5
            0x005003b3n, // add x7, zero, x5
            0x00500333n, // add x6, zero, x5
        ], {5: 1n, 6: 0n, 7: 0n, 28: 1n})
        sim.run()
        expect(sim.regFile.registers[6]).to.equal(1n)
        expect(sim.regFile.registers[7]).to.equal(0n) // the instructions were skipped

        sim = new Simulator([
            0x01c28c63n, // beq x5, x28, 24 # +6 instructions, false
            0x005003b3n, // add x7, zero, x5
            0x005003b3n, // add x7, zero, x5
            0x005003b3n, // add x7, zero, x5
            0x005003b3n, // add x7, zero, x5
            0x005003b3n, // add x7, zero, x5
            0x00500333n, // add x6, zero, x5
        ], {5: 1n, 6: 0n, 7: 0n, 28: 2n})
        sim.run()
        expect(sim.regFile.registers[6]).to.equal(1n)
        expect(sim.regFile.registers[7]).to.equal(1n) // the instructions were skipped
    });
})