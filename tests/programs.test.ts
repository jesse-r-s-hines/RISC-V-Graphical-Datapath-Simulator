import { expect } from "chai";
import { Simulator } from "../src/simulator";
import { Bits, from_twos_complement, to_twos_complement } from "../src/utils";
import { assemble } from "../src/assembler"
import * as fs from "fs";

/**
 * Test some actual assembly programs
 */

function makeSim(file: string, regs: Record<number, bigint> = {}): Simulator {
    let code = fs.readFileSync(file, 'utf8')
    let machineCode = assemble(code)
    return new Simulator(machineCode, regs)
}

describe("Bubble Sort", () => {
    let file ='./tests/assembly/bubbleSort.s'
    let base = 0x1000_8000n // gp

    it("Basic", () => {
        let array = [3n, 2n, 1n, 0n, -1n, -2n, -3n].map(e => to_twos_complement(e))
        let size = BigInt(array.length)

        let sim = makeSim(file, {10: base, 11: size}) // a0, a1
        sim.dataMem.data.storeArray(base, 4, array)

        sim.run()

        array = sim.dataMem.data.loadArray(base, 4, array.length).map(e => from_twos_complement(e))

        expect(array).to.eql([-3n, -2n, -1n, 0n, 1n, 2n, 3n]);
    })

    it("Random", () => {
        let array: bigint[] = []
        for (let i = 0n; i < 10n; i++) array.push( to_twos_complement(BigInt(Math.floor(Math.random() * (2**32-1)))) )

        let sim = makeSim(file, {10: base, 11: 10n}) // a0, a1

        sim.dataMem.data.storeArray(base, 4, array)

        sim.run()

        array = sim.dataMem.data.loadArray(base, 4, 10).map(e => from_twos_complement(e))

        for (let i = 1; i < 10; i++) {
            expect(array[0] <= array[1], `${array[0]} < ${array[1]}`).to.be.true
        }
    })
})