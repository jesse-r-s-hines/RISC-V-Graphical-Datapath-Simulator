import { expect } from "chai";
import { Simulator } from "simulator/simulator";
import { toTwosComplement } from "utils/bits";
import { assemble } from "assembler/assembler"

function testCode(code: string, regs: Record<number, bigint> = {}, expected: Record<number, bigint> = {}) {
    for (const reg in regs) regs[reg] = toTwosComplement(regs[reg], 32)
    const sim = new Simulator(assemble(code), regs)
    sim.run()
    for (const reg in expected) {
        expect(sim.regFile.registers[reg], `${code}\n\nregister x${reg}`).to.equal(toTwosComplement(expected[reg], 32))
    }
}

/** Test if a branch is taken. The branch should branch to "label"*/
function testBranch(branch: string, regs: Record<number, bigint> = {}, taken: boolean) {
    const code = `
        ${branch}
        addi x30, zero, 1
        label: addi x31, zero, 1
    `
    testCode(code, regs, {30: taken ? 0n : 1n, 31: 1n})
}

describe("Misc", () => {
    it('sp and gp initialization', () => {
        testCode(``, {}, {2: 0xBFFF_fff0n, 3: 0x1000_8000n})
        testCode(``, {3: 42n}, {2: 0xBFFF_fff0n, 3: 42n})
    })

    it('Empty', () => {
        const sim = new Simulator()
        expect( () => sim.run() ).does.not.throw()
    })

    it('Set Zero', () => {
        const sim = new Simulator()
        expect( () => sim.setRegisters({0: 10n})).to.throw()
    })
})

describe("Arithmetic", () => {
    it("Can't write zero", () => {
        const code = `addi x0, x0, 6`
        testCode(code, {}, {0: 0n})
    })

    it('add', () => {
        let code = `add x5, x6, x7`
        testCode(code, {6: 6n, 7: 7n}, {5: 13n})

        code = `add x5, x6, x7` // overflow
        testCode(code, {6: 2147483647n, 7: 1n}, {5: -2147483648n})
    })
    
    it('addi', () => {
        let code = `addi x5, x6, 6`
        testCode(code, {6: 2n}, {5: 8n})

        code = `addi x5, x6, -6`
        testCode(code, {6: 2n}, {5: -4n})
    })
    
    it('sub', () => {
        let code = `sub x5, x6, x7`
        testCode(code, {6: 6n, 7: 7n}, {5: -1n})

        code = `sub x5, x6, x7` // underflow
        testCode(code, {6: -2147483648n, 7: 1n}, {5: 2147483647n})
    })
    
    it('and', () => {
        const code = `and x5, x6, x28`
        testCode(code, {5: 5n, 6: 6n, 28: 12n}, {5: 4n})
    })
    
    it('andi', () => {
        let code = `andi x7, x5, -1`
        testCode(code, {5: 5n}, {7: 5n})

        code = `andi x7, x5, -7`
        testCode(code, {5: 1n}, {7: 1n})
    })
    
    it('or', () => {
        let code = `or x5, x6, x7`
        testCode(code, {6: 6n, 7: 7n}, {5: 7n})

        code = `or x5, x6, x7`
        testCode(code, {6: -1n, 7: 6n}, {5: -1n})
    })
    
    it('ori', () => {
        const code = `ori x5, x6, 7`
        testCode(code, {5: 5n, 6: 6n}, {5: 7n})
    })
    
    it('xor', () => {
        let code = `xor x5, x5, x6`
        testCode(code, {5: 5n, 6: 6n}, {5: 3n})

        code = `xor x5, x5, x6`
        testCode(code, {5: -5n, 6: 6n}, {5: -3n})
    })
    
    it('xori', () => {
        const code = `xori x6, x6, 6`
        testCode(code, {6: 5n}, {6: 3n})
    })
    
    it('sll', () => {
        let code = `sll x5, x6, x7`
        testCode(code, {6: 1n, 7: 3n}, {5: 8n})

        code = `sll x5, x6, x7` // Only uses lower 5 bits of reg.
        testCode(code, {6: 1n, 7: -7n}, {5: 0x2000000n})

        code = `sll x5, x6, x7` // Shifts off extra bits
        testCode(code, {6: 0xFFFF_FFFFn, 7: 2n}, {5: 0xFFFF_FFFCn})
    })
    
    it('slli', () => {
        const code = `slli x6, x6, 3`
        testCode(code, {6: 2n}, {6: 16n})
    })
    
    it('sra', () => {
        let code = `sra x5, x6, x7`
        testCode(code, {6: 8n, 7: 2n}, {5: 2n})

        code = `sra x5, x6, x7`
        testCode(code, {6: -8n, 7: 2n}, {5: -2n})
    })
    
    it('srai', () => {
        let code = `srai x5, x6, 2`
        testCode(code, {6: 8n}, {5: 2n})

        code = `srai x5, x6, 2`
        testCode(code, {6: -8n}, {5: -2n})
    })
    
    it('srl', () => {
        let code = `srl x5, x6, x7`
        testCode(code, {6: 8n, 7: 2n}, {5: 2n})

        code = `srl x5, x6, x7`
        testCode(code, {6: -8n, 7: 2n}, {5: 0x3FFF_FFFEn})
    })
    
    it('srli', () => {
        let code = `srli x5, x6, 2`
        testCode(code, {6: 8n}, {5: 2n})

        code = `srli x5, x6, 2`
        testCode(code, {6: -8n}, {5: 0x3FFF_FFFEn})
    })
    
    it('slt', () => {
        let code = `slt x5, x6, x7`
        testCode(code, {6: 6n, 7: 7n}, {5: 1n})

        code = `slt x5, x7, x6`
        testCode(code, {6: -1n, 7: 1n}, {5: 0n})
    })
    
    it('slti', () => {
        const code = `slti x5, x6, 7`
        testCode(code, {6: 6n, 7: 7n}, {5: 1n})
    })
    
    it('sltu', () => {
        let code = `sltu x5, x7, x6` // -1 will be max unsigned
        testCode(code, {6: -1n, 7: 1n}, {5: 1n})

        code = `sltu x5, x6, x7`
        testCode(code, {6: 6n, 7: 7n}, {5: 1n})

        code = `sltu x5, x6, x7` // -1 will be max unsigned
        testCode(code, {6: -1n, 7: 1n}, {5: 0n})
    })
    
    it('lui', () => {
        let code = `lui x28, 100000`
        testCode(code, {}, {28: 0x186A0_000n})

        code = `lui x28, -1`
        testCode(code, {}, {28: 0xFFFFF_000n})
    })
})

describe("Branch", () => {
    it('beq', () => {
        const code = `beq x5, x28, label`
        testBranch(code, {5: 1n, 28: 1n}, true)

        const code2 = `beq x0, x0, label`
        testBranch(code2, {}, true)
    })
    
    it('bge', () => {
        let code = `bge x5, x28, label`
        testBranch(code, {5: 0n, 28: -1n}, true)
    
        code = `bge x5, x28, label`
        testBranch(code, {5: -1n, 28: -1n}, true)
    
        code = `bge x5, x28, label`
        testBranch(code, {5: -1n, 28: 0n}, false)
    })
    
    it('bgeu', () => {
        const code = `bgeu x5, x28, label`
        testBranch(code, {5: 0n, 28: -1n}, false)
    })
    
    it('blt', () => {
        let code = `blt x5, x28, label`
        testBranch(code, {5: -2n, 28: 0n}, true)
    
        code = `blt x5, x28, label` // false
        testBranch(code, {5: -100n, 28: -100n}, false)
    
        code = `blt x5, x28, label` // true
        testBranch(code, {5: 100n, 28: 101n}, true)
    })
    
    it('bltu', () => {
        const code = `bltu x5, x28, label`
        testBranch(code, {5: -0n, 28: 0n}, false)
    })
    
    it('bne', () => {
        const code = `bne x5, x28, label`
        testBranch(code, {5: 1n, 28: 3n}, true)

        const code2 = `bne x0, x0, label`
        testBranch(code2, {}, false)
    })

    it('long branch', () => {
        const code = `
            beq x5, x28, label
            addi zero, zero, 0
            addi zero, zero, 0
            li x7, 1
            label:
            li x6, 1
        `
        testCode(code, {5: 1n, 28: 2n}, {6: 1n, 7: 1n}) // Don't take

        testCode(code, {5: 1n, 28: 1n}, {6: 1n, 7: 0n}) // take

        const code2 = `
            li x6, 4
            label:
            addi x5, x5, 1
            addi zero, zero, 0
            addi zero, zero, 0
            bne x5, x6, label
            li x7, 1
        `
        testCode(code2, {5: 0n, 28: 2n}, {5: 4n, 6: 4n, 7: 1n})
    })
    
    it('jal', () => {
        const code = `
            jal x5, dest
            addi x7, zero, 1
            dest: addi x6, zero, 1
        `
        testCode(code, {}, {5: 0x0000_0004n, 6: 1n, 7: 0n})

        const code2 = `
            jal x1, label1
            label2:
            li x2, 1
            jal x3, exit
            label1:
            jal x4, label2
            li x2, 2
            exit:
        `
        testCode(code2, {}, {1: 0x0000_0004n, 2: 1n, 3: 0x0000_0000Cn, 4: 0x0000_0010n})
    })
    
    it('jalr', () => {
        let code = `
            addi zero, zero, 0
            jalr x5, 0(x28) # instruction 3
            addi x7, zero, 1
            addi x6, zero, 1
        `
        testCode(code, {28: 0x0000_000Cn}, {5: 0x0000_0008n, 6: 1n, 7: 0n})

        code = `
            jalr x5, 8(x28) # instructions 2 + 1
            addi zero, zero, 0
            addi x7, zero, 1
            addi x6, zero, 1
        `
        testCode(code, {28: 0x0000_0004n}, {5: 0x0000_0004n, 6: 1n, 7: 0n})

        code = `
            jalr x5, 9(x28) # instructions 2 + 1 misaligned. JALR should clear least significant bit.
            addi zero, zero, 0
            addi x7, zero, 1
            addi x6, zero, 1
        `
        testCode(code, {28: 0x0000_0004n}, {5: 0x0000_0004n, 6: 1n, 7: 0n})
    })

    // it('auipc', () => {
    //     let code = `
    //         addi zero, zero, 0
    //         addi zero, zero, 0
    //         auipc x5, 0xFFF0F # PC starts at 0x0001_0000
    //     `
    //     testCode(code, {}, {5: 0xFFF1_F008n})
    // })
})

describe("Memory", () => {
    it('sb/lb', () => {
        let code = `
            sb x5, 1000(gp)
            lb x7, 1000(gp)
        `
        testCode(code, {5: 1n}, {7: 1n})

        code = `
            sw x5, 0(gp)
            lb x7, 1(gp)
        `
        testCode(code, {5: 0x01_23_45_67n}, {7: 0x45n})
    
        code = `
            sb x5, 0(gp)
            lbu x7, 0(gp)
        `
        testCode(code, {5: -1n}, {7: 0x00_00_00_FFn})

        code = `
            sb x5, 0(gp)
            lw x7, 0(gp)
        `
        testCode(code, {5: 0x00_00_FF_FFn}, {7: 0x00_00_00_FFn})
    })
    
    it('sh/lh', () => {
        let code = `
            sh x5, 1000(gp)
            lh x6, 1000(gp)
            lw x7, 1000(gp)
        `
        testCode(code, {5: -10n}, {6: -10n, 7: 0x0000_FFF6n})
    
        code = `
            sh x5, 0(gp)
            lhu x7, 0(gp)
        `
        testCode(code, {5: -1n}, {7: 0x00_00_FF_FFn})

        code = `
            sh x5, 0(gp)
            lw x7, 0(gp)
        `
        testCode(code, {5: 0x00_FF_12_23n}, {7: 0x00_00_12_23n})
    })
    
    it('sw/lw', () => {
        let code = `
            sw x5, 1003(gp)
            lw x7, 1003(gp)
        `
        testCode(code, {5: 20n, 6: 5n}, {7: 20n})

        code = `
            sw x5, 1003(gp)
            lw x7, 1003(gp)
        `
        testCode(code, {5: -20n, 6: 5n}, {7: -20n})
    })
})
