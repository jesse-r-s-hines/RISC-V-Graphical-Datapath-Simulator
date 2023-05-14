import { expect } from 'chai';
import * as Comps from 'simulator/components';
import { b, bits } from 'utils/bits';


describe("Components", () => {
    it('Imm Gen', () => {
        const imm = new Comps.ImmGen()

        // addi t0, t0, -1
        imm.instruction = b`111111111111_00101_000_00101_0010011`
        imm.tick()
        expect(imm.immediate.length).to.equal(32)
        expect(imm.immediate.toInt(true)).to.equal(-1n)

        // sw t0, 1003(t0)
        imm.instruction = b`0011111_00101_00101_010_01011_0100011`
        imm.tick()
        expect(imm.immediate.toInt(true)).to.equal(1003n)

        // bne t0, t1, 20 # + 5 instruction
        imm.instruction = b`0000000_00110_00101_001_10100_1100011`
        imm.tick()
        expect(imm.immediate.toInt(true)).to.equal(20n)

        // bne t0, t1, 0xBFC # + 5 instructions
        imm.instruction = b`0011111_11100_00101_000_11101_1100011`
        imm.tick()
        expect(imm.immediate.toInt(true)).to.equal(0xBFCn)

        // lui x28, 100000
        imm.instruction = b`00011000011010100000_11100_0110111`
        imm.tick()
        expect(imm.immediate.toInt(true)).to.equal(100000n)

        // auipc t0, 12345
        imm.instruction = b`00000011000000111001_00101_0010111`
        imm.tick()
        expect(imm.immediate.toInt(true)).to.equal(12345n)

        // jal t0, 0x87654
        imm.instruction = b`01100101010010000111_00101_1101111`
        imm.tick()
        expect(imm.immediate.length).to.equal(32)
        expect(imm.immediate.toInt(true)).to.equal(0x87654n)

        // bne x5, x6, -12 # - 3 instructions
        imm.instruction = b`1111111_00110_00101_001_10101_1100011`
        imm.tick()
        expect(imm.immediate.length).to.equal(32)
        expect(imm.immediate.toInt(true)).to.equal(-12n)

        // or x5, x6, x7
        imm.instruction = b`0000000_00111_00110_110_00101_0110011`
        imm.tick()
        expect(imm.immediate.toInt(true)).to.equal(0x0n)

    });

    it('ALU', () => {
        const alu = new Comps.ALU()
        const minInt = bits(-(2n**31n), 32)
        const maxInt = bits(2n**31n - 1n, 32)

        alu.in1 = minInt
        alu.in2 = maxInt
        alu.aluControl = b`0110` // SUB
        alu.tick()

        expect(alu.result.length).to.equal(32)
        expect(alu.result.toInt()).to.equal(1n) // underflow
        expect(alu.zero).to.equal(0)


        alu.in1 = minInt
        alu.in2 = minInt
        alu.aluControl = b`0010` // ADD
        alu.tick()

        expect(alu.result.length).to.equal(32)
        expect(alu.result.toInt()).to.equal(0n) // underflow
        expect(alu.zero).to.equal(1)

        alu.in1 = minInt
        alu.in2 = minInt
        alu.aluControl = b`0110` // SUB
        alu.tick()

        expect(alu.result.length).to.equal(32)
        expect(alu.result.toInt()).to.equal(0n)
        expect(alu.zero).to.equal(1)
    });

    it('Mux', () => {
        const mux = new Comps.Mux(3, 7)
        expect(mux.select.equals(b`00`)).to.equal(true)
        expect(mux.out.equals(b`0000000`)).to.equal(true)
        mux.in = [b`0000001`, b`0000010`, b`1000011`]
        
        mux.select = b`00`
        mux.tick()
        expect(mux.out.equals(b`0000001`)).to.equal(true)

        mux.select = b`01`
        mux.tick()
        expect(mux.out.equals(b`0000010`)).to.equal(true)

        mux.select = b`11`
        expect(() => mux.tick()).to.throw('out of range')
    });
})

// The rest of the components are tested indirectly in simulator.test.ts
