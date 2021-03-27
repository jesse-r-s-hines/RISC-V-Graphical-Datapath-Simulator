import { expect } from 'chai';
import { Bits, TruthTable } from '../src/utils';

describe("Bits", () => {
    it('From array', () => {
        let ba = Bits.from([1, 0, 1, 0])
        // stored backwards
        expect(ba).to.eql([0, 1, 0, 1])

        ba = Bits.from([1, 0, 0, 0])
        // stored backwards
        expect(ba).to.eql([0, 0, 0, 1])

        ba = Bits.from([0])
        expect(ba).to.eql([0])

        ba = Bits.from([])
        expect(ba).to.eql([])
    });

    it('From Int', () => {
        let ba = Bits.from(0n, 5)
        expect(ba).to.eql(Bits.from([0, 0, 0, 0, 0]))

        ba = Bits.from(1n, 5)
        expect(ba).to.eql(Bits.from([0, 0, 0, 0, 1]))

        ba = Bits.from(6n, 3)
        expect(ba).to.eql(Bits.from([1, 1, 0]))

        ba = Bits.from(7n, 3)
        expect(ba).to.eql(Bits.from([1, 1, 1]))
    });

    it('From Int No Size', () => {
        let ba = Bits.from(0n)
        expect(ba).to.eql(Bits.from([0]))

        ba = Bits.from(1n)
        expect(ba).to.eql(Bits.from([1]))

        ba = Bits.from(6n)
        expect(ba).to.eql(Bits.from([1, 1, 0]))
    });

    it('msb0', () => {
        let ba = Bits.from(10n)
        expect(Bits.msb0(ba)).to.eql([1, 0, 1, 0])
    });

    it('To Int', () => {
        let ba = Bits.from(0n, 5)
        expect(Bits.toInt(ba)).to.equal(0n)

        ba = Bits.from(1n, 5)
        expect(Bits.toInt(ba)).to.equal(1n)

        ba = Bits.from(6n, 3)
        expect(Bits.toInt(ba)).to.equal(6n)

        ba = Bits.from(7n, 3)
        expect(Bits.toInt(ba)).to.equal(7n)
    });

    it("Extended", () => {
        let ba = Bits.from(0n, 3)
        expect(Bits.extended(ba, 5)).to.eql(Bits.from([0, 0, 0, 0, 0]))

        ba = Bits.from([0, 1, 0, 1])
        expect(Bits.extended(ba, 6, false)).to.eql(Bits.from([0, 0, 0, 1, 0, 1]))

        ba = Bits.from([1, 0, 1])
        expect(Bits.extended(ba, 5)).to.eql(Bits.from([0, 0, 1, 0, 1]))

        ba = Bits.from([1, 0, 1])
        expect(Bits.extended(ba, 3)).to.eql(Bits.from([1, 0, 1]))
    })

    it("Sign Extend", () => {
        let ba = Bits.from(0n, 3)
        expect(Bits.extended(ba, 5, true)).to.eql(Bits.from([0, 0, 0, 0, 0]))

        ba = Bits.from([0, 1, 0, 1])
        expect(Bits.extended(ba, 6, true)).to.eql(Bits.from([0, 0, 0, 1, 0, 1]))

        ba = Bits.from([1, 0, 1])
        expect(Bits.extended(ba, 5, true)).to.eql(Bits.from([1, 1, 1, 0, 1]))

        ba = Bits.from([1, 0, 1])
        expect(Bits.extended(ba, 3, true)).to.eql(Bits.from([1, 0, 1]))
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