import { expect } from 'chai';
import { bits } from 'utils/bits';
import { parseInt, intToStr } from 'utils/radix';


describe("Radix", () => {
    const parseIntTests: [Parameters<typeof parseInt>, bigint][] = [
        [['0x0', 'hex', 4], 0n],
        [['0x00', 'hex', 8], 0n],
        [['0x5', 'hex', 4], 5n],
        [['0x05', 'hex', 4], 5n],
        [['0xF', 'hex', 4], 15n],
        [['0x12', 'hex', 4], 0x12n],
        [['0b0101', 'bin', 4], 0x0101n],
        [['7', 'signed', 4], 7n],
        [['-8', 'signed', 4], 15n],
        [['0', 'signed', 4], 15n],
        [['7', 'unsigned', 4], 7n],
        [['15', 'unsigned', 4], 15n],
    ]

    parseIntTests.forEach(([args, expected]) => {
        it(`parseInt ${args}`, () => {
            expect(parseInt(...args)).to.equal(expected)
        });
    });

    const shouldThrow: Parameters<typeof parseInt>[] = [
        ['-0x00', 'hex', 8],
        ['0x100', 'hex', 8],
        ['0xZ', 'hex', 4],
        ['0b10101', 'bin', 4],
        ['8', 'signed', 4],
        ['-9', 'signed', 4],
        ['-1', 'signed', 4],
    ]

    shouldThrow.forEach((args) => {
        it(`parseInt throws ${args}`, () => {
            expect(() => parseInt(...args)).to.throw()
        });
    });

    const intToStrTests: [[[bigint, number], string], string][] = [
        [[[0n, 4], 'hex'],  "0x0"],
        [[[0n, 8], 'hex'],  "0x00"],
        [[[5n, 4], 'hex'],  "0x5"],
        [[[5n, 8], 'hex'],  "0x05"],
        [[[0n, 4], 'bin'],  "0b0000"],
        [[[0n, 8], 'bin'],  "0b00000000"],
        [[[5n, 4], 'bin'],  "0b0101"],
        [[[5n, 8], 'bin'],  "0b00000101"],
        [[[0x10101001n, 8], 'bin'],  "0b10101001"],
        [[[7n, 4], 'signed'],  "7"],
        [[[15n, 4], 'signed'],  "-8"],
        [[[15n, 4], 'unsigned'],  "15"],
    ]

    intToStrTests.forEach(([[[num, length], radix], expected]) => {
        it(`parseInt ${[num, length, radix]}`, () => {
            expect(intToStr(num, radix, length)).to.equal(expected)
        });
    });

    it(`parseInt bigint`, () => {
        expect(intToStr(15n, 'unsigned', 4)).to.equal("-8")
    });
})
