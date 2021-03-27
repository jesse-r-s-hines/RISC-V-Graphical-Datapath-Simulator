import { expect } from 'chai';
import * as Comps from '../src/components';
import {Bits} from '../src/utils';


describe("Components", () => {
    it('Imm Gen', () => {
        let imm = new Comps.ImmGen()

        // addi t0, t0, -1
        imm.instruction = Bits(0b111111111111_00101_000_00101_0010011n, 32)
        imm.tick()
        expect(imm.immediate.length).to.equal(64)
        expect(Bits.toInt(imm.immediate, true)).to.equal(-1n)

        // sw t0, 1003(t0)
        imm.instruction = Bits(0b0011111_00101_00101_010_01011_0100011n, 32)
        imm.tick()
        expect(imm.immediate.length).to.equal(64)
        expect(Bits.toInt(imm.immediate, true)).to.equal(1003n)

        // bne t0, t1, 20 # + 5 instruction
        imm.instruction = Bits(0b0000000_00110_00101_001_10100_1100011n, 32)
        imm.tick()
        expect(imm.immediate.length).to.equal(64)
        expect(Bits.toInt(imm.immediate, true)).to.equal(20n)

        // auipc t0, 12345
        // imm.instruction = Bits(0b00010010001101000101_00101_0010111n, 32)
        // imm.tick()
        // expect(imm.immediate.length).to.equal(64)
        // expect(Bits.toInt(imm.immediate, true)).to.equal(12345n)

        // jal t0, main
        // imm.instruction = Bits(0b11111110110111111111_00101_1101111n, 32)
        // imm.tick()
        // expect(imm.immediate.length).to.equal(64)
        // expect(Bits.toInt(imm.immediate, true)).to.equal(-16n)
    });
})