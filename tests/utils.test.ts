import { expect } from 'chai';
import { Bits, TruthTable } from '../src/utils';

describe("Bit Array", () => {
    it('Create', () => {
        let ba = Bits.fromInt(5, 0n)
        expect(ba).to.have.ordered.members([0, 0, 0, 0, 0])

        ba = Bits.fromInt(5, 1n)
        expect(ba).to.have.ordered.members([0, 0, 0, 0, 1])

        ba = Bits.fromInt(3, 6n)
        expect(ba).to.have.ordered.members([1, 1, 0])

        ba = Bits.fromInt(3, 7n)
        expect(ba).to.have.ordered.members([1, 1, 1])
    });

    it('To Int', () => {
        let ba = Bits.fromInt(5, 0n)
        expect(Bits.toInt(ba)).to.equal(0n)

        ba = Bits.fromInt(5, 1n)
        expect(Bits.toInt(ba)).to.equal(1n)

        ba = Bits.fromInt(3, 6n)
        expect(Bits.toInt(ba)).to.equal(6n)

        ba = Bits.fromInt(3, 7n)
        expect(Bits.toInt(ba)).to.equal(7n)
    });

    it("Sign Extend", () => {
        let ba = Bits.fromInt(3, 0n)
        expect(Bits.signExtend(5, ba)).to.have.ordered.members([0, 0, 0, 0, 0])

        ba = [0, 1, 0, 1]
        expect(Bits.signExtend(6, ba)).to.have.ordered.members([0, 0, 0, 1, 0, 1])

        ba = [1, 0, 1]  // -3
        expect(Bits.signExtend(5, ba)).to.have.ordered.members([1, 1, 1, 0, 1])

        ba = [1, 0, 1]  // -3
        expect(Bits.signExtend(3, ba)).to.have.ordered.members([1, 0, 1])
    })
})

describe("Truth Table", () => {
    it('Basic', () => {
        let table = new TruthTable([
            [["0X", "0"], 0b00n],
            [["00", "1"], 0b01n],
            [["01", "1"], 0b10n],
            [["10", "X"], 0b11n],
        ])

        expect(table.match([0b00n, 0b0n])).to.equal(0b00n)
        expect(table.match([0b01n, 0b0n])).to.equal(0b00n)

        expect(table.match([0b00n, 0b1n])).to.equal(0b01n)

        expect(table.match([0b01n, 0b1n])).to.equal(0b10n)

        expect(table.match([0b10n, 0b0n])).to.equal(0b11n)
        expect(table.match([0b10n, 0b1n])).to.equal(0b11n)

        expect(() => table.match([0b11n, 0b0n])).to.throw("No match for inputs")
        expect(() => table.match([0b11n, 0b1n])).to.throw("No match for inputs")
    });
})