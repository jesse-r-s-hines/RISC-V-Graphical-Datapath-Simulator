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

    it('From Int Unsigned', () => {
        let ba = Bits.from(0n, 5)
        expect(ba).to.eql(Bits.from([0, 0, 0, 0, 0]))

        ba = Bits.from(1n, 5)
        expect(ba).to.eql(Bits.from([0, 0, 0, 0, 1]))

        ba = Bits.from(6n, 3)
        expect(ba).to.eql(Bits.from([1, 1, 0]))

        ba = Bits.from(7n, 3, false)
        expect(ba).to.eql(Bits.from([1, 1, 1]))
    });

    it('From Int Signed', () => {
        let ba = Bits.from(0n, 5, true)
        expect(ba).to.eql(Bits.from([0, 0, 0, 0, 0]))

        ba = Bits.from(-1n, 5, true)
        expect(ba).to.eql(Bits.from([1, 1, 1, 1, 1]))

        ba = Bits.from(-6n, 4, true)
        expect(ba).to.eql(Bits.from([1, 0, 1, 0]))

        ba = Bits.from(-7n, 4, true)
        expect(ba).to.eql(Bits.from([1, 0, 0, 1]))
    });

    it('From Int Errors', () => {
        expect(() => Bits.from(0n, 8, false)).to.not.throw()
        expect(() => Bits.from(255n, 8, false)).to.not.throw()

        expect(() => Bits.from(256n, 8, false)).to.throw("256 out of range for unsigned 8 bits")
        expect(() => Bits.from(-1n, 8, false)).to.throw()

        expect(() => Bits.from(0n, 8, true)).to.not.throw()
        expect(() => Bits.from(-32768n, 16, true)).to.not.throw()
        expect(() => Bits.from(32767n, 16, true)).to.not.throw()

        expect(() => Bits.from(-32769n, 16, true)).to.throw()
        expect(() => Bits.from(32768n, 16, true)).to.throw()
    });

    it('Large Ints', () => {
        let ba = Bits.from(123456789012345n, 64)
        expect(Bits.toInt(ba)).to.equal(123456789012345n)

        ba = Bits.from(-123456789012345n, 64, true)
        expect(Bits.toInt(ba, true)).to.equal(-123456789012345n)
    });

    it('msb0', () => {
        let ba = Bits.from(10n, 4)
        expect(Bits.msb0(ba)).to.eql([1, 0, 1, 0])
    });

    it('To Int Unsigned', () => {
        let ba = Bits.from(0n, 5)
        expect(Bits.toInt(ba)).to.equal(0n)

        ba = Bits.from(1n, 5)
        expect(Bits.toInt(ba)).to.equal(1n)

        ba = Bits.from(6n, 3)
        expect(Bits.toInt(ba)).to.equal(6n)

        ba = Bits.from(7n, 3)
        expect(Bits.toInt(ba, false)).to.equal(7n)
    });

    it('To Int Signed', () => {
        let ba = Bits.from(0n, 5, true)
        expect(Bits.toInt(ba, true)).to.equal(0n)

        ba = Bits.from(5n, 5, true)
        expect(Bits.toInt(ba, true)).to.equal(5n)

        ba = Bits.from(-1n, 5, true)
        expect(Bits.toInt(ba, true)).to.equal(-1n)

        ba = Bits.from(-6n, 4, true)
        expect(Bits.toInt(ba, true)).to.equal(-6n)

        ba = Bits.from(-7n, 4, true)
        expect(Bits.toInt(ba, true)).to.equal(-7n)
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