import { expect } from "chai";
import {Simulator} from "../src/simulator";
import {Bits} from "../src/utils";

function sim_expect(code: bigint[], regs: Record<number, bigint> = {}, expected: Record<number, bigint> = {}) {
    let sim = new Simulator(code, regs)
    sim.run()
    for (let reg in expected) {
        expect(sim.regFile.registers[reg], `register x${reg}`).to.equal(expected[reg])
    }
}

describe("Misc", () => {
    it('sp and gp initialization', () => {
        sim_expect([], {}, {2: 0xbffffff0n, 3: 0x10008000n})
        sim_expect([], {3: 42n}, {2: 0xbffffff0n, 3: 42n})
    })
})

describe("Arithmetic", () => {
    it('add', () => {
        let code = [
            0x007302b3n, // add x5, x6, x7
        ];
        sim_expect(code, {5: 5n, 6: 6n, 7: 7n}, {5: 13n})
    })
    
    // it('addi', () => {
    //     let code = [
    //         0x00630293n, // addi x5, x6, 6
    //     ];
    //     sim_expect(code, {6: 2n}, {5: 8n})

    //     code = [
    //         0xffa30293n, // addi x5, x6, -6
    //     ];
    //     sim_expect(code, {6: 2n}, {5: -4n})
    // })
    
    it('sub', () => {
        let code = [
            0x407302b3n, // sub x5, x6, x7
        ];
        sim_expect(code, {5: 5n, 6: 6n, 7: 7n}, {5: -1n})
    })
    
    it('and', () => {
        let code = [
            0x01c372b3n, // and x5, x6, x28
        ];
        sim_expect(code, {5: 5n, 6: 6n, 28: 12n}, {5: 4n})
    })
    
    // it('andi', () => {
    //     let code = [
    //         0xfff2f393n, // andi x7, x5, -1
    //     ];
    //     sim_expect(code, {5: 5n}, {7: 5n})

    //     code = [
    //         0xff92f393n, // andi x7, x5, -7
    //     ];
    //     sim_expect(code, {5: 1n}, {7: 1n})
    // })
    
    it('or', () => {
        let code = [
            0x007362b3n, // or x5, x6, x7
        ];
        sim_expect(code, {5: 5n, 6: 6n, 7: 7n}, {5: 7n})
    })
    
    // it('ori', () => {
    //     let code = [
    //         0x00736293n, // ori x5, x6, 7
    //     ];
    //     sim_expect(code, {5: 5n, 6: 6n}, {5: 7n})
    // })
    
    // it('xor', () => {
    //     let code = [
    //         0x0062c2b3n, // xor x5, x5, x6
    //     ];
    //     sim_expect(code, {5: 5n, 6: 6n}, {5: 3n})
    // })
    
    // it('xori', () => {
    //     let code = [
    //         0x00634313n, // xori x6, x6, 6
    //     ];
    //     sim_expect(code, {6: 5n}, {6: 3n})
    // })
    
    // it('sll', () => {
    //     let code = [
    //         0x007312b3n, // sll x5, x6, x7
    //     ];
    //     sim_expect(code, {6: 1n, 7: 3n}, {5: 8n})

    //     code = [
    //         0x007312b3n, // sll x5, x6, x7 # Only uses lower 5 bits of reg.
    //     ];
    //     sim_expect(code, {6: 1n, 7: -7n}, {5: 0x2000000n})
    // })
    
    // it('slli', () => {
    //     let code = [
    //         0x00331313n, // slli x6, x6, 3
    //     ];
    //     sim_expect(code, {6: 2n}, {6: 16n})
    // })
    
    // it('sra', () => {
    //     let code = [
    //         0x407352b3n, // sra x5, x6, x7
    //     ];
    //     sim_expect(code, {6: 8n, 7: 2n}, {5: 2n})

    //     code = [
    //         0x407352b3n, // sra x5, x6, x7
    //     ];
    //     sim_expect(code, {6: -8n, 7: 2n}, {5: -2n})
    // })
    
    // it('srai', () => {
    //     let code = [
    //         0x40235293n, // srai x5, x6, 2
    //     ];
    //     sim_expect(code, {6: 8n}, {5: 2n})

    //     code = [
    //         0x40235293n, // srai x5, x6, 2
    //     ];
    //     sim_expect(code, {6: -8n}, {5: -2n})
    // })
    
    // it('srl', () => {
    //     let code = [
    //         0x007352b3n, // srl x5, x6, x7
    //     ];
    //     sim_expect(code, {6: 8n, 7: 2n}, {5: 2n})

    //     code = [
    //         0x007352b3n, // srl x5, x6, x7
    //     ];
    //     sim_expect(code, {6: -8n, 7: 2n}, {5: 0x3FFF_FFFEn})
    // })
    
    // it('srli', () => {
    //     let code = [
    //         0x00235293n, // srli x5, x6, 2
    //     ];
    //     sim_expect(code, {6: 8n}, {5: 2n})

    //     code = [
    //         0x00235293n, // srli x5, x6, 2
    //     ];
    //     sim_expect(code, {6: -8n}, {5: 0x3FFF_FFFEn})
    // })
    
    // it('slt', () => {
    //     let code = [
    //         0x007322b3n, // slt x5, x6, x7
    //     ];
    //     sim_expect(code, {6: 6n, 7: 7n}, {5: 1n})

    //     code = [
    //         0x0063a2b3n, // slt x5, x7, x6
    //     ];
    //     sim_expect(code, {6: -1n, 7: 1n}, {5: 0n})
    // })
    
    // it('slti', () => {
    //     let code = [
    //         0x00732293n, // slti x5, x6, 7
    //     ];
    //     sim_expect(code, {6: 6n, 7: 7n}, {5: 1n})
    // })
    
    // it('sltu', () => {
    //     let code = [
    //         0x0063b2b3n, // sltu x5, x7, x6 # -1 will be max unsigned
    //     ];
    //     sim_expect(code, {6: -1n, 7: 1n}, {5: 1n})

    //     code = [
    //         0x007332b3n, // sltu x5, x6, x7
    //     ];
    //     sim_expect(code, {6: 6n, 7: 7n}, {5: 1n})

    //     code = [
    //         0x007332b3n, // sltu x5, x6, x7 # -1 will be max unsigned
    //     ];
    //     sim_expect(code, {6: -1n, 7: 1n}, {5: 0n})
    // })
    
    // it('lui', () => {
    //     let code = [
    //         0x186a0e37n, // lui x28, 100000
    //     ];
    //     sim_expect(code, {}, {28: 0x186A0_000n})

    //     code = [
    //         0xfffffe37n, // lui x28, -1
    //     ];
    //     sim_expect(code, {}, {28: 0xFFFFF_000n})
    // })
})

describe("Branch", () => {
    // it('beq', () => {
    //     let code = [
    //         0x01c28463n, // beq x5, x28, 8 # +2 instructions, true
    //         0x00100393n, // addi x7, zero, 1
    //         0x00100313n, // addi x6, zero, 1
    //     ];
    //     sim_expect(code, {5: 1n, 28: 1n}, {6: 1n, 7: 0n})

    //     code = [
    //         0x01c28863n, // beq x5, x28, 16 # +4 instructions, false
    //         0x00000013n, // addi zero, zero, 0
    //         0x00000013n, // addi zero, zero, 0
    //         0x00100393n, // addi x7, zero, 1
    //         0x00100313n, // addi x6, zero, 1
    //     ];
    //     sim_expect(code, {5: 1n, 28: 2n}, {6: 1n, 7: 1n})
    // })
    
    // it('bge', () => {
    //     let code = [
    //         0x01c2d463n, // bge x5, x28, 8 # +2 instructions, true
    //         0x00100393n, // addi x7, zero, 1
    //         0x00100313n, // addi x6, zero, 1
    //     ];
    //     sim_expect(code, {5: 0n, 28: -1n}, {6: 1n, 7: 0n})
    // })
    
    // it('bgeu', () => {
    //     let code = [
    //         0x01c2f463n, // bgeu x5, x28, 8 # +2 instructions, false
    //         0x00100393n, // addi x7, zero, 1
    //         0x00100313n, // addi x6, zero, 1
    //     ];
    //     sim_expect(code, {5: 0n, 28: -1n}, {6: 1n, 7: 1n})
    // })
    
    // it('blt', () => {
    //     let code = [
    //         0x01c2c463n, // blt x5, x28, 8 # +2 instructions, true
    //         0x00100393n, // addi x7, zero, 1
    //         0x00100313n, // addi x6, zero, 1
    //     ];
    //     sim_expect(code, {5: -2n, 28: 0n}, {6: 1n, 7: 0n})
    // })
    
    // it('bltu', () => {
    //     let code = [
    //         0x01c2e463n, // bltu x5, x28, 8 # +2 instructions, false
    //         0x00100393n, // addi x7, zero, 1
    //         0x00100313n, // addi x6, zero, 1
    //     ];
    //     sim_expect(code, {5: -0n, 28: 0n}, {6: 1n, 7: 1n})
    // })
    
    // it('bne', () => {
    //     let code = [
    //         0x01c29463n, // bne x5, x28, 8 # +2 instructions, true
    //         0x00100393n, // addi x7, zero, 1
    //         0x00100313n, // addi x6, zero, 1
    //     ];
    //     sim_expect(code, {5: 1n, 28: 3n}, {6: 1n, 7: 0n})
    // })
    
    // it('jal', () => {
    //     let code = [
    //         0x008002efn, // jal x5, 8 # +2 instructions
    //         0x00100393n, // addi x7, zero, 1
    //         0x00100313n, // addi x6, zero, 1
    //     ];
    //     sim_expect(code, {}, {5: 0x0001_0004n, 6: 1n, 7: 0n})
    // })
    
    // it('jalr', () => {
    //     let code = [
    //         0x00000013n, // addi zero, zero, 0
    //         0x000e02e7n, // jalr x5, 0(x28) # instruction 3
    //         0x00100393n, // addi x7, zero, 1
    //         0x00100313n, // addi x6, zero, 1
    //     ];
    //     sim_expect(code, {28: 0x0001_000Cn}, {5: 0x0001_0008n, 6: 1n, 7: 0n})

    //     code = [
    //         0x008e02e7n, // jalr x5, 8(x28) # instructions 2 + 1
    //         0x00000013n, // addi zero, zero, 0
    //         0x00100393n, // addi x7, zero, 1
    //         0x00100313n, // addi x6, zero, 1
    //     ];
    //     sim_expect(code, {28: 0x0001_0004n}, {5: 0x0001_0004n, 6: 1n, 7: 0n})

    //     code = [
    //         0x008e02e7n, // jalr x5, 9(x28) # instructions 2 + 1 misaligned. JALR should clear least significant bit.
    //         0x00000013n, // addi zero, zero, 0
    //         0x00100393n, // addi x7, zero, 1
    //         0x00100313n, // addi x6, zero, 1
    //     ];
    //     sim_expect(code, {28: 0x0001_0004n}, {5: 0x0001_0004n, 6: 1n, 7: 0n})
    // })
    
    // it('auipc', () => {
    //     let code = [
    //         0x00000013n, // addi zero, zero, 0
    //         0x00000013n, // addi zero, zero, 0
    //         0xfff0f297n, // auipc x5, 0xFFF0F # PC starts at 0x0001_0000
    //     ];
    //     sim_expect(code, {}, {5: 0xFFF1_F008n})
    // })
})

describe("Memory", () => {
    // it('sb/lb', () => {
    //     let code = [
    //         0x3e518423n, // sb x5, 1000(gp)
    //         0x3e818383n, // lb x7, 1000(gp)
    //     ];
    //     sim_expect(code, {5: 1n}, {7: 1n})

    //     code = [
    //         0x0051a023n, // sw x5, 0(gp)
    //         0x00118383n, // lb x7, 1(gp)
    //     ];
    //     sim_expect(code, {5: 0x01_23_45_67n}, {7: 0x45n})
    
    //     code = [
    //         0x00518023n, // sb x5, 0(gp)
    //         0x0001c383n, // lbu x7, 0(gp)
    //     ];
    //     sim_expect(code, {5: -1n}, {7: 0x00_00_00_FFn})
    // })
    
    // it('sh/lh', () => {
    //     let code = [
    //         0x3e519423n, // sh x5, 1000(gp)
    //         0x3e819303n, // lh x6, 1000(gp)
    //         0x3e81a383n, // lw x7, 1000(gp)
    //     ];
    //     sim_expect(code, {5: -10n}, {6: -10n, 7: 0x0000_FFF6n})
    
    //     code = [
    //         0x00519023n, // sh x5, 0(gp)
    //         0x0001d383n, // lhu x7, 0(gp)
    //     ];
    //     sim_expect(code, {5: -1n, 6: 1000n}, {7: 0x00_00_FF_FFn})
    // })
    
    it('sw/lw', () => {
        let code = [
            0x3e51a5a3n, // sw x5, 1003(gp)
            0x3eb1a383n, // lw x7, 1003(gp)
        ];
        sim_expect(code, {5: 20n, 6: 5n}, {7: 20n})
    })
})