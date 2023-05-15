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
        const input = [3n, 2n, 1n, 0n, -1n, -2n, -3n].map(e => toTwosComplement(e, 32))

        const sim = makeSim(file, {10: base, 11: BigInt(input.length)}) // a0, a1
        sim.dataMem.data.storeArray(base, 4, input)

        sim.run()

        const output = sim.dataMem.data.loadArray(base, 4, input.length).map(e => fromTwosComplement(e, 32))

        expect(output).to.eql([-3n, -2n, -1n, 0n, 1n, 2n, 3n]);
    })

    it("Random", () => {
        const input: bigint[] = []
        for (let i = 0n; i < 10n; i++)
            input.push( toTwosComplement(BigInt(Math.floor(Math.random() * (2**32-1))), 32) )

        const sim = makeSim(file, {10: base, 11: BigInt(input.length)}) // a0, a1

        sim.dataMem.data.storeArray(base, 4, input)

        sim.run()

        const output = sim.dataMem.data.loadArray(base, 4, input.length).map(e => fromTwosComplement(e, 32))

        for (let i = 1; i < 10; i++) {
            expect(output[i - 1] <= output[i], `${output[i - 1]} < ${output[i]}`).to.be.true
        }
    })
})

describe("Selection Sort", () => {
    const file = './tests/assembly/selectionSort.s'
    const base = 0x1000_8000n // gp

    it("Basic", () => {
        const input = [3n, 2n, 6n, 0n, -1n, -2n, 0n].map(e => toTwosComplement(e, 32))

        const sim = makeSim(file, {10: base, 11: BigInt(input.length)}) // a0, a1
        sim.dataMem.data.storeArray(base, 4, input)

        sim.run()

        const output = sim.dataMem.data.loadArray(base, 4, input.length).map(e => fromTwosComplement(e, 32))

        expect(output).to.eql([-2n, -1n, 0n, 0n, 2n, 3n, 6n]);
    })

    it("Random", () => {
        const input: bigint[] = []
        for (let i = 0n; i < 10n; i++)
            input.push( toTwosComplement(BigInt(Math.floor(Math.random() * (2**32-1))), 32) )

        const sim = makeSim(file, {10: base, 11: BigInt(input.length)}) // a0, a1

        sim.dataMem.data.storeArray(base, 4, input)

        sim.run()

        const output = sim.dataMem.data.loadArray(base, 4, 10).map(e => fromTwosComplement(e, 32))

        for (let i = 1; i < input.length; i++) {
            expect(output[i - 1] <= output[i], `${output[i - 1]} < ${output[i]}`).to.be.true
        }
    })
})
