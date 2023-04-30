import { expect } from 'chai';
import { Bits, b, fromTwosComplement, toTwosComplement } from 'utils/bits';
import { TruthTable } from "utils/truthTable"

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

        ba = Bits("11 0_0")
        expect(ba).to.eql([0, 0, 1, 1])

        expect(b`100`).to.eql([0, 0, 1])

        expect(() => Bits("stuff")).to.throw("Invalid bit string")
        expect(() => Bits("012")).to.throw("Invalid bit string")
    });

    it('From Int Unsigned', () => {
        let ba = Bits(0n, 5)
        expect(ba).to.eql(b`00000`)

        ba = Bits(1n, 5)
        expect(ba).to.eql(b`00001`)

        ba = Bits(6n, 3)
        expect(ba).to.eql(b`110`)

        ba = Bits(7n, 3, false)
        expect(ba).to.eql(b`111`)
    });

    it('From Int Signed', () => {
        let ba = Bits(0n, 5, true)
        expect(ba).to.eql(b`00000`)

        ba = Bits(-1n, 5, true)
        expect(ba).to.eql(b`11111`)

        ba = Bits(-6n, 4, true)
        expect(ba).to.eql(b`1010`)

        ba = Bits(-7n, 4, true)
        expect(ba).to.eql(b`1001`)
    });

    it('From Number', () => {
        let ba = Bits(0, 5, true)
        expect(ba).to.eql(b`00000`)

        ba = Bits(-1, 5, true)
        expect(ba).to.eql(b`11111`)

        ba = Bits(6n, 4, true)
        expect(ba).to.eql(b`0110`)
    });

    it('Errors', () => {
        expect(() => Bits(-9n, 4, true)).to.throw("invalid")
        expect(() => Bits(-8n, 4, true)).to.not.throw()
        expect(() => Bits(0n, 4, true)).to.not.throw()
        expect(() => Bits(7n, 4, true)).to.not.throw()
        expect(() => Bits(8n, 4, true)).to.throw("invalid")

        expect(() => Bits(-1n, 4)).to.throw("invalid")
        expect(() => Bits(0n, 4)).to.not.throw()
        expect(() => Bits(15n, 4)).to.not.throw()
        expect(() => Bits(16n, 4)).to.throw("invalid")

        expect(() => Bits(0.5, 4)).to.throw("not an integer")
    });

    it('Large Ints', () => {
        let ba = Bits(123456789012345n, 64)
        expect(Bits.toInt(ba)).to.equal(123456789012345n)

        ba = Bits(-123456789012345n, 64, true)
        expect(Bits.toInt(ba, true)).to.equal(-123456789012345n)
    });

    it('msb0', () => {
        const ba = Bits(10n, 4)
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
        expect(Bits.extended(ba, 5)).to.eql(b`00000`)

        ba = Bits([0, 1, 0, 1])
        expect(Bits.extended(ba, 6, false)).to.eql(b`000101`)

        ba = Bits([1, 0, 1])
        expect(Bits.extended(ba, 5)).to.eql(b`00101`)

        ba = Bits([1, 0, 1])
        expect(Bits.extended(ba, 3)).to.eql(b`101`)
    })

    it("Sign Extend", () => {
        let ba = Bits(0n, 3)
        expect(Bits.extended(ba, 5, true)).to.eql(b`00000`)

        ba = Bits([0, 1, 0, 1])
        expect(Bits.extended(ba, 6, true)).to.eql(b`000101`)

        ba = Bits([1, 0, 1])
        expect(Bits.extended(ba, 5, true)).to.eql(b`11101`)

        ba = Bits([1, 0, 1])
        expect(Bits.extended(ba, 3, true)).to.eql(b`101`)
    })

    it("To String", () => {
        expect(Bits.toString(b`000`)).to.eql("000")

        expect(Bits.toString(b`1011`)).to.eql("1011")
    })

    it("Equal", () => {
        expect(Bits.equal(b`000`, Bits(0n, 3))).to.be.true
        expect(Bits.equal(b`1010`,"0001")).to.be.false
    })

    it("Join", () => {
        expect(Bits.join(b`0001`, 1, b`0101`)).to.eql(b`000110101`)
    })
})

describe("Truth Table", () => {
    it('Basic', () => {
        const table = new TruthTable([
            [["0X", "0"], 0b00n],
            [["00", "1"], 0b01n],
            [["01", "1"], 0b10n],
            [["10", "X"], 0b11n],
        ])

        expect(table.match(b`00`, b`0`)).to.equal(0b00n)
        expect(table.match(b`01`, b`0`)).to.equal(0b00n)

        expect(table.match(b`00`, b`1`)).to.equal(0b01n)

        expect(table.match(b`01`, b`1`)).to.equal(0b10n)

        expect(table.match(b`10`, b`0`)).to.equal(0b11n)
        expect(table.match(b`10`, b`1`)).to.equal(0b11n)

        expect(() => table.match(b`11`, b`0`)).to.throw("No match for inputs")
        expect(() => table.match(b`11`, b`1`)).to.throw("No match for inputs")
    });
})

describe("Other", () => {
    it('fromTwosComplement', () => {
        expect(fromTwosComplement(0n)).to.equal(0n)
        expect(fromTwosComplement(10n)).to.equal(10n)
        expect(fromTwosComplement(2147483647n)).to.equal(2147483647n)
        expect(fromTwosComplement(-2147483648n)).to.equal(-2147483648n)
        expect(fromTwosComplement(0x8000_0000n)).to.equal(-2147483648n)
        expect(fromTwosComplement(0xFFFF_FFFFn)).to.equal(-1n)

        expect(fromTwosComplement(0x8000n, 16)).to.equal(-32768n)
    });

    it('toTwosComplement', () => {
        expect(toTwosComplement(0n)).to.equal(0n)
        expect(toTwosComplement(10n)).to.equal(10n)
        expect(toTwosComplement(-10n)).to.equal(0xFFFF_FFF6n)
        expect(toTwosComplement(2147483647n)).to.equal(2147483647n)
        expect(toTwosComplement(-2147483648n)).to.equal(2147483648n)
        expect(toTwosComplement(0x8000_0000n)).to.equal(2147483648n)
        expect(toTwosComplement(0xFFFF_FFFFn)).to.equal(4294967295n)
        expect(toTwosComplement(-3n)).to.equal(0xFFFF_FFFDn)

        expect(toTwosComplement(-1n, 8)).to.equal(0xFFn)
        expect(toTwosComplement(0xFFn, 8)).to.equal(255n)
    });

})