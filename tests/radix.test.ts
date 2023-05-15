import { expect } from 'chai';
import { parseInt } from 'utils/radix';


describe("Radix", () => {
    const parseIntTests: [Parameters<typeof parseInt>, bigint][] = [
        [['0x0', 'hex', 4], 0n],
        [['0x00', 'hex', 8], 0n],
        [['0x5', 'hex', 4], 5n],
        [['0x05', 'hex', 4], 5n],
        [['0xF', 'hex', 4], 15n],
        [['0x12', 'hex', 8], 0x12n],
        [['0b0101', 'bin', 4], 0b0101n],
        [['7', 'signed', 4], 7n],
        [['-1', 'signed', 4], 15n],
        [['-8', 'signed', 4], 8n],
        [['0', 'signed', 4], 0n],
        [['7', 'unsigned', 4], 7n],
        [['15', 'unsigned', 4], 15n],
        [['0x11', 'unsigned', 8], 0x11n],
        [['0x11', 'signed', 8], 0x11n],
        [['8', 'signed', 4], 8n],
        [['15', 'signed', 4], 15n],
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
        ['16', 'unsigned', 4],
        ['-9', 'unsigned', 3],
        ['-1', 'unsigned', 3],
        ['16', 'signed', 4],
    ]

    shouldThrow.forEach((args) => {
        it(`parseInt throws ${args}`, () => {
            expect(() => parseInt(...args)).to.throw()
        });
    });
})
