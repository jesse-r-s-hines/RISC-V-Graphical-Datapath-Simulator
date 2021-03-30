import { expect } from 'chai';
import { Bits, TruthTable, twos_complement } from '../src/utils';

describe("Bits", () => {
    it('From array', () => {
        let ba = Bits([1, 0, 1, 0])
        // stored backwards
        expect(ba).to.eql([0, 1, 0, 1])

        ba = Bits([1, 0, 0, 0])
        // stored backwards
        expect(ba).to.eql([0, 0, 0, 1])

        ba = Bits([0])
        expect(ba).to.eql([0])

        ba = Bits([])
        expect(ba).to.eql([])
    });

    it('From string', () => {
        let ba = Bits("1010")
        expect(ba).to.eql([0, 1, 0, 1])

        ba = Bits("1000")
        expect(ba).to.eql([0, 0, 0, 1])

        ba = Bits("0")
        expect(ba).to.eql([0])

        ba = Bits("")
        expect(ba).to.eql([])
    });

    it('From Int Unsigned', () => {
        let ba = Bits(0n, 5)
        expect(ba).to.eql(Bits("00000"))

        ba = Bits(1n, 5)
        expect(ba).to.eql(Bits("00001"))

        ba = Bits(6n, 3)
        expect(ba).to.eql(Bits("110"))

        ba = Bits(7n, 3, false)
        expect(ba).to.eql(Bits("111"))
    });

    it('From Int Signed', () => {
        let ba = Bits(0n, 5, true)
        expect(ba).to.eql(Bits("00000"))

        ba = Bits(-1n, 5, true)
        expect(ba).to.eql(Bits("11111"))

        ba = Bits(-6n, 4, true)
        expect(ba).to.eql(Bits("1010"))

        ba = Bits(-7n, 4, true)
        expect(ba).to.eql(Bits("1001"))
    });

    it('Large Ints', () => {
        let ba = Bits(123456789012345n, 64)
        expect(Bits.toInt(ba)).to.equal(123456789012345n)

        ba = Bits(-123456789012345n, 64, true)
        expect(Bits.toInt(ba, true)).to.equal(-123456789012345n)
    });

    it('msb0', () => {
        let ba = Bits(10n, 4)
        expect(Bits.msb0(ba)).to.eql([1, 0, 1, 0])
        expect(ba).to.eql([0, 1, 0, 1]) // original unchanged

    });

    it('To Int Unsigned', () => {
        let ba = Bits(0n, 5)
        expect(Bits.toInt(ba)).to.equal(0n)

        ba = Bits(1n, 5)
        expect(Bits.toInt(ba)).to.equal(1n)

        ba = Bits(6n, 3)
        expect(Bits.toInt(ba)).to.equal(6n)

        ba = Bits(7n, 3)
        expect(Bits.toInt(ba, false)).to.equal(7n)
    });

    it('To Int Signed', () => {
        let ba = Bits(0n, 5, true)
        expect(Bits.toInt(ba, true)).to.equal(0n)

        ba = Bits(5n, 5, true)
        expect(Bits.toInt(ba, true)).to.equal(5n)

        ba = Bits(-1n, 5, true)
        expect(Bits.toInt(ba, true)).to.equal(-1n)

        ba = Bits(-6n, 4, true)
        expect(Bits.toInt(ba, true)).to.equal(-6n)

        ba = Bits(-7n, 4, true)
        expect(Bits.toInt(ba, true)).to.equal(-7n)
    });

    it('To Nuumber', () => {
        let ba = Bits(0n, 5, true)
        expect(Bits.toNumber(ba)).to.equal(0)

        ba = Bits(5n, 5)
        expect(Bits.toNumber(ba)).to.equal(5)

        ba = Bits(-1n, 5, true)
        expect(Bits.toNumber(ba, true)).to.equal(-1)
    });

    it("Extended", () => {
        let ba = Bits(0n, 3)
        expect(Bits.extended(ba, 5)).to.eql(Bits("00000"))

        ba = Bits([0, 1, 0, 1])
        expect(Bits.extended(ba, 6, false)).to.eql(Bits("000101"))

        ba = Bits([1, 0, 1])
        expect(Bits.extended(ba, 5)).to.eql(Bits("00101"))

        ba = Bits([1, 0, 1])
        expect(Bits.extended(ba, 3)).to.eql(Bits("101"))
    })

    it("Sign Extend", () => {
        let ba = Bits(0n, 3)
        expect(Bits.extended(ba, 5, true)).to.eql(Bits("00000"))

        ba = Bits([0, 1, 0, 1])
        expect(Bits.extended(ba, 6, true)).to.eql(Bits("000101"))

        ba = Bits([1, 0, 1])
        expect(Bits.extended(ba, 5, true)).to.eql(Bits("11101"))

        ba = Bits([1, 0, 1])
        expect(Bits.extended(ba, 3, true)).to.eql(Bits("101"))
    })

    it("To String", () => {
        expect(Bits.toString(Bits("000"))).to.eql("000")

        expect(Bits.toString(Bits("1011"))).to.eql("1011")
    })

    it("Equal", () => {
        expect(Bits.equal(Bits("000"), Bits(0n, 3))).to.be.true
        expect(Bits.equal(Bits("1010"),"0001")).to.be.false
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

        expect(table.match([Bits("00"), Bits("0")])).to.equal(0b00n)
        expect(table.match([Bits("01"), Bits("0")])).to.equal(0b00n)

        expect(table.match([Bits("00"), Bits("1")])).to.equal(0b01n)

        expect(table.match([Bits("01"), Bits("1")])).to.equal(0b10n)

        expect(table.match([Bits("10"), Bits("0")])).to.equal(0b11n)
        expect(table.match([Bits("10"), Bits("1")])).to.equal(0b11n)

        expect(() => table.match([Bits("11"), Bits("0")])).to.throw("No match for inputs")
        expect(() => table.match([Bits("11"), Bits("1")])).to.throw("No match for inputs")
    });
})

describe("Other", () => {
    it('twos_complement', () => {
        expect(twos_complement(0n)).to.equal(0n)
        expect(twos_complement(10n)).to.equal(10n)
        expect(twos_complement(2147483647n)).to.equal(2147483647n)
        expect(twos_complement(-2147483648n)).to.equal(-2147483648n)

        expect(twos_complement(0n)).to.equal(0n)
        expect(twos_complement(10n)).to.equal(10n)
        expect(twos_complement(0x8000_0000n)).to.equal(-2147483648n)
        expect(twos_complement(0xFFFF_FFFFn)).to.equal(-1n)
    });
})