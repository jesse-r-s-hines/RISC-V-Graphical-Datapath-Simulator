import { expect } from 'chai';
import { Bits, Bit, bits, bit, b, fromTwosComplement, toTwosComplement } from 'utils/bits';
import { TruthTable } from "utils/truthTable"

describe("Bit", () => {
    const tests = [
        [0, 0], [1, 1], [3, 1], [0n, 0], [1n, 1], [-1n, 1],
        [true, 1], [false, 0], ["1", 1], ["0", 0], ["3", 1],
    ] as const

    tests.forEach(([input, expected]) => {
        it(`bit ${input}`, () => {
            expect(bit(input)).to.equal(expected)
        });
    });
})


describe("Bits", () => {
    it('From array', () => {
        expect(bits([0, 1, 0, 1]).toInt()).to.eql(0b0101n)
        expect(bits([1, 0, 1, 0]).toInt()).to.eql(0b1010n)
        expect(bits([1, 0, 0, 0]).toInt()).to.eql(0b1000n)
        expect(bits([0]).toInt()).to.eql(0b0n)

        expect(() => bits([])).to.throw("Empty bits are invalid")
    });

    it('From string', () => {
        expect(bits("1010").toInt()).to.eql(0b1010n)
        expect(bits("1010").toInt()).to.eql(10n)
        expect(bits("1000").toInt()).to.eql(0b1000n)
        expect(bits("0").toInt()).to.eql(0b0n)
        expect(bits("11 0_0").toInt()).to.eql(0b1100n)

        expect(bits(" 11 0_0 ").length).to.eql(4)
        expect(bits("0").length).to.eql(1)

        expect(b`100`.toInt()).to.eql(0b100n)

        expect(() => bits("")).to.throw("Invalid bit string")
        expect(() => bits("stuff")).to.throw("Invalid bit string")
        expect(() => bits("012")).to.throw("Invalid bit string")
    });

    it('From int', () => {
        expect(bits(0n, 5).toInt()).to.eql(0b00000n)
        expect(bits(0n, 5).length).to.eql(5)
        expect(bits(1n, 5).toInt()).to.eql(0b00001n)
        expect(bits(6n, 3).toInt()).to.eql(0b110n)
        expect(bits(7n, 3).toInt()).to.eql(0b111n)

        expect(bits(-1n, 5).toInt()).to.eql(0b11111n)
        expect(bits(-6n, 4).toInt()).to.eql(0b1010n)
        expect(bits(-7n, 4).toInt()).to.eql(0b1001n)

        expect(bits(15n, 4).toInt()).to.eql(0b1111n)
        expect(bits(-1n, 4).toInt()).to.eql(0b1111n)
        expect(bits(-2n, 4).toInt()).to.eql(0b1110n)
        expect(bits(-8n, 4).toInt()).to.eql(0b1000n)
    });

    it('From Number', () => {
        expect(bits(0, 5).toInt()).to.eql(0b00000n)
        expect(bits(0, 5).length).to.eql(5)

        expect(bits(-1, 5).toInt()).to.eql(0b11111n)
        expect(bits(6n, 4).toInt()).to.eql(0b0110n)
    });

    it('Errors', () => {
        expect(() => bits(-9n, 4)).to.throw("invalid")
        expect(() => bits(-8n, 4)).to.not.throw()
        expect(() => bits(15n, 4)).to.not.throw()
        expect(() => bits(16n, 4)).to.throw("invalid")
        expect(() => bits(0.5, 4)).to.throw("not an integer")
    });

    it('Large Ints', () => {
        let num = 0xF0123456_789ABCDE_F0123456_789ABCDEn
        expect(bits(num, 128).toInt()).to.equal(num)

        num = -123456789012345n
        expect(bits(num, 64).toInt(true)).to.equal(num)
        expect(bits(num, 64).toInt(false)).to.equal(18446620616920539271n)
    });

    it('toArray', () => {
        const ba = bits(10n, 4)
        expect(ba.toArray('msb0')).to.eql([1, 0, 1, 0])
        expect(ba.toArray('lsb0')).to.eql([0, 1, 0, 1])
        expect(ba.toArray()).to.eql([0, 1, 0, 1])
    });

    it('To Int Unsigned', () => {
        expect(bits(0n, 5).toInt()).to.equal(0n)
        expect(bits(1n, 5).toInt()).to.equal(1n)
        expect(bits(6n, 3).toInt()).to.equal(6n)
        expect(bits(7n, 3).toInt(false)).to.equal(7n)
        expect(bits(-1n, 3).toInt(false)).to.equal(7n)
        expect(bits(-4n, 3).toInt(false)).to.equal(4n)
    });

    it('To Int Signed', () => {
        expect(bits(0n, 5).toInt(true)).to.equal(0n)
        expect(bits(5n, 5).toInt(true)).to.equal(5n)
        expect(bits(15n, 4).toInt(true)).to.equal(-1n)
        expect(bits(-1n, 5).toInt(true)).to.equal(-1n)
        expect(bits(-6n, 4).toInt(true)).to.equal(-6n)
        expect(bits(-7n, 4).toInt(true)).to.equal(-7n)
    });

    it('To Number', () => {
        expect(bits(0n, 5).toNumber()).to.equal(0)
        expect(bits(5n, 5).toNumber()).to.equal(5)
        expect(bits(-1n, 5).toNumber(true)).to.equal(-1)
    });

    it("Extend", () => {
        expect(bits(0n, 3).extend(5).equals(b`00000`))
        expect(bits("101").extend(5).equals(b`00101`))
        expect(bits("101").extend(3).equals(b`101`))
        expect(bits("0101").extend(6, false).equals(b`000101`))
    })

    it("Sign Extend", () => {
        expect(bits(0n, 3).extend(5, true).equals(b`00000`))
        expect(bits("0101").extend(6, true).equals(b`000101`))
        expect(bits("101").extend(5, true).equals(b`11101`))
        expect(bits("101").extend(3, true).equals(b`101`))
        expect(b`001111101011`.extend(32, true).toString()).to.eql("00000000000000000000001111101011")
    })

    it("To String", () => {
        expect(bits(0n, 3).toString()).to.eql("000")
        expect(bits('1011').toString()).to.eql("1011")
    })

    it("Equal", () => {
        expect(bits(0n, 3).equals(bits(0n, 3))).to.be.true
        expect(bits(1n, 3).equals(bits(1n, 3))).to.be.true
        expect(bits(7n, 3).equals(bits(7n, 3))).to.be.true
        expect(bits("111").equals(bits(7n, 3))).to.be.true
        expect(bits(-1n, 3).equals(bits(7n, 3))).to.be.true
        expect(bits(10n, 4).equals(bits(10n, 4))).to.be.true
        expect(bits(10n, 5).equals(bits(10n, 5))).to.be.true

        expect(bits(10n, 4).equals(bits(11n, 4))).to.be.false
        expect(bits(10n, 4).equals(bits(0n, 4))).to.be.false
        expect(bits(10n, 4).equals(bits(10n, 5))).to.be.false // different sizes are not equal
    })

    it("Join", () => {
        expect(Bits.join(b`0001`, [1], '0101').equals(b`000110101`))
        expect(Bits.join(b`0001`).equals(b`0001`))
    })

    const atTests = [
        ['0001', 0, 1],
        ['0001', 3, 0],
        ['1001', 3, 1],
        ['000100', 0, 0],
        ['000100', 2, 1],
    ] as const

    atTests.forEach(([b, index, expected]) => {
        it(`at ${b} ${index}`, () => {
            expect(bits(b).at(index)).to.equal(expected)
        });
    });

    expect(() => bits('01').at(2)).to.throw()

    const sliceTests = [
        ['0001', 0, 1],
        ['0001', 0, 3],
        ['0001', 0, 4],
        ['1101', 0, 4],
        ['000100', 0, 3],
        ['110100', 2, 6],
    ] as const

    sliceTests.forEach(([b, start, end]) => {
        it(`at ${b} ${start} ${end}`, () => {
            expect(bits(b).slice(start, end).toArray()).to.eql(bits(b).toArray('lsb0').slice(start, end))
        });
    });

    expect(() => bits('01').slice(0, 3)).to.throw()
})

describe("Other", () => {
    it('fromTwosComplement', () => {
        expect(fromTwosComplement(0n, 32)).to.equal(0n)
        expect(fromTwosComplement(10n, 32)).to.equal(10n)
        expect(fromTwosComplement(2147483647n, 32)).to.equal(2147483647n)
        expect(fromTwosComplement(-2147483648n, 32)).to.equal(-2147483648n)
        expect(fromTwosComplement(0x8000_0000n, 32)).to.equal(-2147483648n)
        expect(fromTwosComplement(0xFFFF_FFFFn, 32)).to.equal(-1n)

        expect(fromTwosComplement(0x8000n, 16)).to.equal(-32768n)
    });

    it('toTwosComplement', () => {
        expect(toTwosComplement(0n, 32)).to.equal(0n)
        expect(toTwosComplement(10n, 32)).to.equal(10n)
        expect(toTwosComplement(-10n, 32)).to.equal(0xFFFF_FFF6n)
        expect(toTwosComplement(2147483647n, 32)).to.equal(2147483647n)
        expect(toTwosComplement(-2147483648n, 32)).to.equal(2147483648n)
        expect(toTwosComplement(0x8000_0000n, 32)).to.equal(2147483648n)
        expect(toTwosComplement(0xFFFF_FFFFn, 32)).to.equal(4294967295n)
        expect(toTwosComplement(-3n, 32)).to.equal(0xFFFF_FFFDn)

        expect(toTwosComplement(-1n, 8)).to.equal(0xFFn)
        expect(toTwosComplement(0xFFn, 8)).to.equal(255n)
    });
})