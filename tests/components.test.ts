import { expect } from 'chai';
import * as Comps from '../src/components';
import {Bits} from '../src/utils';


describe("Components", () => {
    it('Imm Gen', () => {
        let imm = new Comps.ImmGen()

        // addi t0, t0, -1
        imm.instruction = Bits(0b111111111111_00101_000_00101_0010011n, 32)
        imm.tick()
        expect(imm.immediate.length).to.equal(32)
        expect(Bits.toInt(imm.immediate, true)).to.equal(-1n)

        // sw t0, 1003(t0)
        imm.instruction = Bits(0b0011111_00101_00101_010_01011_0100011n, 32)
        imm.tick()
        expect(Bits.toInt(imm.immediate, true)).to.equal(1003n)

        // bne t0, t1, 20 # + 5 instruction
        imm.instruction = Bits(0b0000000_00110_00101_001_10100_1100011n, 32)
        imm.tick()
        expect(Bits.toInt(imm.immediate, true)).to.equal(20n)

        // bne t0, t1, 0xBFC # + 5 instructions
        imm.instruction = Bits(0b0011111_11100_00101_000_11101_1100011n, 32)
        imm.tick()
        expect(Bits.toInt(imm.immediate, true)).to.equal(0xBFCn)

        // lui x28, 100000
        imm.instruction = Bits(0b00011000011010100000_11100_0110111n, 32)
        imm.tick()
        expect(Bits.toInt(imm.immediate, true)).to.equal(100000n)

        // auipc t0, 12345
        imm.instruction = Bits(0b00000011000000111001_00101_0010111n, 32)
        imm.tick()
        expect(Bits.toInt(imm.immediate, true)).to.equal(12345n)

        // jal t0, 0x87654
        imm.instruction = Bits(0b01100101010010000111_00101_1101111n, 32)
        imm.tick()
        expect(imm.immediate.length).to.equal(32)
        expect(Bits.toInt(imm.immediate, true)).to.equal(0x87654n)


        // or x5, x6, x7
        imm.instruction = Bits(0b0000000_00111_00110_110_00101_0110011n, 32)
        imm.tick()
        expect(Bits.toInt(imm.immediate, true)).to.equal(0x0n)

    });
})