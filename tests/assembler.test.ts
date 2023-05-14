import { expect } from 'chai';
import { assemble, assembleKeepLineInfo } from 'assembler/assembler';
import { Bits, bits } from 'utils/bits';

function assembleExpect(program: string, expected: bigint[]) {
    // convert to string to make it easier to see what bits are off.
    const actual = assemble(program).map((instr) => bits(instr, 32).toString())
    const expectedStr = expected.map((instr) => bits(instr, 32).toString())
    expect(actual, program).to.eql(expectedStr)
}

// TODO test farther labels and big immediates
describe('Basic All Types', () => {
    it("R-type", () => {
        let code = `add x0, x1, x2`;
        assembleExpect(code, [0x00208033n]);
    
        code = `sub x3, x4, x5`;
        assembleExpect(code, [0x405201B3n]);
    })

    it("I-type", () => {
        let code = `slli x6, x7, 8`;
        assembleExpect(code, [0x00839313n]);
    
        code = `ori x8, x9, -9`;
        assembleExpect(code, [0xFF74E413n]);
    })

    it("IS-type", () => {
        const code = `srai x5, x6, 2`;
        assembleExpect(code, [0x40235293n]);
    })

    it("SB-type", () => {
        let code = `
            beq x11, x12, next
            next:
        `;
        assembleExpect(code, [0x00C58263n]);

        code = `prev: bge x13, x14, prev`;
        assembleExpect(code, [0x00E6D063n]);
    })

    it("UJ-type", () => {
        let code = `
            jal x15, next
            next:
        `;
        assembleExpect(code, [0x004007EFn]);

        code = `
            jal next
            next:
        `;
        assembleExpect(code, [0x004000EFn]);

        code = `
            prev:
            j prev
        `;
        assembleExpect(code, [0x0000006Fn]);
    })

    it("U-type", () => {
        const code = `lui x16, 100`;
        assembleExpect(code, [0x00064837n]);
    })

    it("Displacement I-type", () => {
        let code = `lb x1, 3(x2)`;
        assembleExpect(code, [0x00310083n]);
    
        code = `jalr x1, 1(x2)`;
        assembleExpect(code, [0x001100E7n]);
    })

    it("Store S-type", () => {
        const code = `sh x1, 3(x2)`;
        assembleExpect(code, [0x001111A3n]);
    })

    it("Pseudo Instructions", () => {
        let code = `mv s0, s5`
        assembleExpect(code, [0x000A8413n]);

        code = `li a0, 200`
        assembleExpect(code, [0x0C800513n]);
    })
})

describe("Registers", () => {
    it("Register Names", () => {
        let code = `or zero, x0, x31`;
        assembleExpect(code, [0x01F06033n]);
    
        code = `xor ra, s0, s11`;
        assembleExpect(code, [0x01B440B3n]);
    
        code = `sll t0, t2, t6`;
        assembleExpect(code, [0x01F392B3n]);
    
        code = `sra a0, a1, a7`;
        assembleExpect(code, [0x4115D533n]);
    })
})


describe('Numbers', () => {
    it("0", () => {
        let code = `andi x1, x2, 0`;
        assembleExpect(code, [0x00017093n]);
    
        code = `lw x1, -0(zero)`;
        assembleExpect(code, [0x00002083n]);
    
        code = `andi x1, x2, +0`;
        assembleExpect(code, [0x00017093n]);
    })

    it("Decimal", () => {
        let code = `andi x1, x2, -3`;
        assembleExpect(code, [0xFFD17093n]);
    
        code = `andi x1, x2, 3`;
        assembleExpect(code, [0x00317093n]);

        code = `andi x1, x2, -2048`;
        assembleExpect(code, [0x80017093n]);
    })

    it("Hex", () => {
        let code = `sw x1, 0xA2(zero)`;
        assembleExpect(code, [0x0A102123n]);

        code = `sw x1, 0Xa2(zero)`;
        assembleExpect(code, [0x0A102123n]);
    })

    it("Binary", () => {
        let code = `lui x1, 0b10`;
        assembleExpect(code, [0x000020B7n]);
        code = `lui x1, 0B10`;
        assembleExpect(code, [0x000020B7n]);
    })
})

describe('Formatting', () => {
    it("Spacing & Line Numbers", () => {
        const code = `
            lui   x1  ,   0   
            \taddi\tx1\t,\t x1\t,\t1\t

            lw  x2 ,  4 ( x1 ) 


            sw   x2 ,  8  (  x1  )

            `;
        assembleExpect(code, [
            0x000000B7n,
            0x00108093n,
            0x0040A103n,
            0x0020A423n,
        ])
    })

    it('Case', () => {
        let code = `AND x1, t2, ra`;
        assembleExpect(code, [0x0013F0B3n]);
    
        code = `aNd x1, t2, ra`;
        assembleExpect(code, [0x0013F0B3n]);
    })
})

describe("Line Info", () => {
    it("Line info", () => {
        const code = `
            lui x1, 0
            addi x1, x1, 1

            lw  x2 ,  4 ( x1 ) 


            sw   x2 ,  8  (  x1  )
            `;
        expect(assembleKeepLineInfo(code), code).to.eql([
            [2, 0x000000B7n],
            [3, 0x00108093n],
            [5, 0x0040A103n],
            [8, 0x0020A423n],
        ])
    })
})

describe('Labels', () => {
    it("Labels", () => {
        const code = `
            label1:
            label_2:
            jal label1
            label3: beq zero, zero, label4
            jal label3
            label4:
        `;
        assembleExpect(code, [
            0x000000EFn,
            0x00000463n,
            0xFFDFF0EFn,
        ]);
    });
})

describe("Empty", () => {
    it("Empty", () => {
        assembleExpect("", []);
        assembleExpect("  \n  ", []);
    });
})

it("Errors", () => {
    expect(() => assemble("jal notALabel")).to.throw('Unknown label "notALabel"');
    expect(() => assemble("addi z0, x1, 2")).to.throw('Unknown register "z0"');
    expect(() => assemble("addi x1, x1, 0xFFFF")).to.throw("Expected an integer that fits in 12 bits");
    expect(() => assemble("slli x1, x1, 64")).to.throw("Expected an integer that fits in 5 bits");
    expect(() => assemble("addi, x1, x2, x3")).to.throw("line 1 col 5");
    expect(() => assemble("!!!")).to.throw("line 1 col 1");
    expect(() => assemble("blah x1, x2, x3")).to.throw();
    expect(() => assemble("lw x1, ")).to.throw("Unexpected end of program");
    expect(() => assemble(`
        add x1, x2, x3
        
        add x1, x2, x3,
    `)).to.throw("line 4 col 24");
})

