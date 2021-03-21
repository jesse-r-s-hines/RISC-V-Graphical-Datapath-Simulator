import { expect } from 'chai';
import { BitArray, TruthTable } from '../src/utils';

describe("Bit Array", () => {
    it('Create', () => {
        let ba = BitArray.fromInt(5)
        expect(ba).to.have.ordered.members([false, false, false, false, false])

        ba = BitArray.fromInt(5, 1n)
        expect(ba).to.have.ordered.members([false, false, false, false, true])

        ba = BitArray.fromInt(3, 6n)
        expect(ba).to.have.ordered.members([true, true, false])

        ba = BitArray.fromInt(3, 7n)
        expect(ba).to.have.ordered.members([true, true, true])
    });

    it('To Int', () => {
        let ba = BitArray.fromInt(5, 0n)
        expect(BitArray.toInt(ba)).to.equal(0n)

        ba = BitArray.fromInt(5, 1n)
        expect(BitArray.toInt(ba)).to.equal(1n)

        ba = BitArray.fromInt(3, 6n)
        expect(BitArray.toInt(ba)).to.equal(6n)

        ba = BitArray.fromInt(3, 7n)
        expect(BitArray.toInt(ba)).to.equal(7n)
    });
})

describe("Truth Table", () => {
    it('Basic', () => {
        let table = new TruthTable([
            [["0X", "0"], ["00"]],
            [["00", "1"], ["01"]],
            [["01", "1"], ["10"]],
            [["10", "X"], ["11"]],
        ])

        expect(table.match([0b00n, 0b0n])[0]).to.equal(0b00n)
        expect(table.match([0b01n, 0b0n])[0]).to.equal(0b00n)

        expect(table.match([0b00n, 0b1n])[0]).to.equal(0b01n)

        expect(table.match([0b01n, 0b1n])[0]).to.equal(0b10n)

        expect(table.match([0b10n, 0b0n])[0]).to.equal(0b11n)
        expect(table.match([0b10n, 0b1n])[0]).to.equal(0b11n)

        expect(() => table.match([0b11n, 0b0n])).to.throw("No match for inputs")
        expect(() => table.match([0b11n, 0b1n])).to.throw("No match for inputs")
    });
})