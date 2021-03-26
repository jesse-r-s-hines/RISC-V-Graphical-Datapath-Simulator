import { expect } from 'chai';
import { Bits, TruthTable } from '../src/utils';

describe("Bit Array", () => {
    it('Create', () => {
        let ba = Bits.fromInt(0n, 5)
        expect(ba).to.have.ordered.members([0, 0, 0, 0, 0])

        ba = Bits.fromInt(1n, 5)
        expect(ba).to.have.ordered.members([0, 0, 0, 0, 1])

        ba = Bits.fromInt(6n, 3)
        expect(ba).to.have.ordered.members([1, 1, 0])

        ba = Bits.fromInt(7n, 3)
        expect(ba).to.have.ordered.members([1, 1, 1])
    });

    it('To Int', () => {
        let ba = Bits.fromInt(0n, 5)
        expect(Bits.toInt(ba)).to.equal(0n)

        ba = Bits.fromInt(1n, 5)
        expect(Bits.toInt(ba)).to.equal(1n)

        ba = Bits.fromInt(6n, 3)
        expect(Bits.toInt(ba)).to.equal(6n)

        ba = Bits.fromInt(7n, 3)
        expect(Bits.toInt(ba)).to.equal(7n)
    });

    it("Extend", () => {
        let ba = Bits.fromInt(0n, 3)
        expect(Bits.extend(ba, 5)).to.have.ordered.members([0, 0, 0, 0, 0])

        ba = [0, 1, 0, 1]
        expect(Bits.extend(ba, 6, false)).to.have.ordered.members([0, 0, 0, 1, 0, 1])

        ba = [1, 0, 1]  // -3
        expect(Bits.extend(ba, 5)).to.have.ordered.members([0, 0, 1, 0, 1])

        ba = [1, 0, 1]  // -3
        expect(Bits.extend(ba, 3)).to.have.ordered.members([1, 0, 1])
    })

    it("Sign Extend", () => {
        let ba = Bits.fromInt(0n, 3)
        expect(Bits.extend(ba, 5, true)).to.have.ordered.members([0, 0, 0, 0, 0])

        ba = [0, 1, 0, 1]
        expect(Bits.extend(ba, 6, true)).to.have.ordered.members([0, 0, 0, 1, 0, 1])

        ba = [1, 0, 1]  // -3
        expect(Bits.extend(ba, 5, true)).to.have.ordered.members([1, 1, 1, 0, 1])

        ba = [1, 0, 1]  // -3
        expect(Bits.extend(ba, 3, true)).to.have.ordered.members([1, 0, 1])
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