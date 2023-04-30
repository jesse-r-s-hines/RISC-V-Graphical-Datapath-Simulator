import { expect } from "chai";
import { Simulator } from "simulator/simulator";
import { fromTwosComplement, toTwosComplement } from "utils/bits";
import { assemble } from "assembler/assembler"
import * as fs from "fs";

/**
 * Test some actual assembly programs
 */

function makeSim(file: string, regs: Record<number, bigint> = {}): Simulator {
    const code = fs.readFileSync(file, 'utf8')
    const machineCode = assemble(code)
    return new Simulator(machineCode, regs)
}

describe("Bubble Sort", () => {
    const file ='./tests/assembly/bubbleSort.s'
    const base = 0x1000_8000n // gp

    it("Basic", () => {
        let array = [3n, 2n, 1n, 0n, -1n, -2n, -3n].map(e => toTwosComplement(e))
        const size = BigInt(array.length)

        const sim = makeSim(file, {10: base, 11: size}) // a0, a1
        sim.dataMem.data.storeArray(base, 4, array)

        sim.run()

        array = sim.dataMem.data.loadArray(base, 4, array.length).map(e => fromTwosComplement(e))

        expect(array).to.eql([-3n, -2n, -1n, 0n, 1n, 2n, 3n]);
    })

    it("Random", () => {
        let array: bigint[] = []
        for (let i = 0n; i < 10n; i++) array.push( toTwosComplement(BigInt(Math.floor(Math.random() * (2**32-1)))) )

        const sim = makeSim(file, {10: base, 11: 10n}) // a0, a1

        sim.dataMem.data.storeArray(base, 4, array)

        sim.run()

        array = sim.dataMem.data.loadArray(base, 4, 10).map(e => fromTwosComplement(e))

        for (let i = 1; i < 10; i++) {
            expect(array[0] <= array[1], `${array[0]} < ${array[1]}`).to.be.true
        }
    })
})

describe("Selection Sort", () => {
    const file = './tests/assembly/selectionSort.s'
    const base = 0x1000_8000n // gp

    it("Basic", () => {
        let array = [3n, 2n, 6n, 0n, -1n, -2n, 0n].map(e => toTwosComplement(e))
        const size = BigInt(array.length)

        const sim = makeSim(file, {10: base, 11: size}) // a0, a1
        sim.dataMem.data.storeArray(base, 4, array)

        sim.run()

        array = sim.dataMem.data.loadArray(base, 4, array.length).map(e => fromTwosComplement(e))

        expect(array).to.eql([-2n, -1n, 0n, 0n, 2n, 3n, 6n]);
    })

    it("Random", () => {
        let array: bigint[] = []
        for (let i = 0n; i < 10n; i++) array.push( toTwosComplement(BigInt(Math.floor(Math.random() * (2**32-1)))) )

        const sim = makeSim(file, {10: base, 11: 10n}) // a0, a1

        sim.dataMem.data.storeArray(base, 4, array)

        sim.run()

        array = sim.dataMem.data.loadArray(base, 4, 10).map(e => fromTwosComplement(e))

        for (let i = 1; i < 10; i++) {
            expect(array[0] <= array[1], `${array[0]} < ${array[1]}`).to.be.true
        }
    })
})