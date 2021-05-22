import { expect } from 'chai';
import { assemble } from '../src/assembler';
import { Bits, b } from '../src/utils';
import * as fs from "fs";


function assemble_expect(program: string, expected: bigint[]) {
    let result = assemble(program).map(i => Bits.toString(Bits(i, 32)))
    expect(result, program).to.eql(expected.map(i => Bits.toString(Bits(i, 32))))
}

// TODO test farther labels and big immediates
describe('Basic All Types', () => {
    it("R-type", () => {
        let code = `add x0, x1, x2`;
        assemble_expect(code, [0x00208033n]);
    
        code = `sub x3, x4, x5`;
        assemble_expect(code, [0x405201b3n]);
    })

    it("I-type", () => {
        let code = `slli x6, x7, 8`;
        assemble_expect(code, [0x00839313n]);
    
        code = `ori x8, x9, -9 `;
        assemble_expect(code, [0xff74e413n]);
    })

    it("SB-type", () => {
        let code = `
            beq x11, x12, next
            next:
        `;
        assemble_expect(code, [0x00c58263n]);

        code = `prev: bge x13, x14, prev`;
        assemble_expect(code, [0x00e6d063n]);
    })

    it("UJ-type", () => {
        let code = `
            jal x15, next
            next:
        `;
        assemble_expect(code, [0x004007efn]);

        code = `
            jal next
            next:
        `;
        assemble_expect(code, [0x004000efn]);

        code = `
            prev:
            j prev
        `;
        assemble_expect(code, [0x0000006fn]);
    })

    it("U-type", () => {
        let code = `lui x16, 100`;
        assemble_expect(code, [0x00064837n]);
    })

    it("Displacement I-type", () => {
        let code = `lb x1, 3(x2)`;
        assemble_expect(code, [0x00310083n]);
    
        code = `jalr x1, 1(x2)`;
        assemble_expect(code, [0x001100e7n]);
    })

    it("Store S-type", () => {
        let code = `sh x1, 3(x2)`;
        assemble_expect(code, [0x001111a3n]);
    })
})

describe("Registers", () => {
    it("Register Names", () => {
        let code = `or zero, x0, x31`;
        assemble_expect(code, [0x01f06033n]);
    
        code = `xor ra, s0, s11`;
        assemble_expect(code, [0x01b440b3n]);
    
        code = `sll t0, t2, t6`;
        assemble_expect(code, [0x01f392b3n]);
    
        code = `sra a0, a1, a7`;
        assemble_expect(code, [0x4115d533n]);
    })
})


describe('Numbers', () => {
    it("0", () => {
        let code = `andi x1, x2, 0`;
        assemble_expect(code, [0x00017093n]);
    
        code = `lw x1, -0(zero)`;
        assemble_expect(code, [0x00002083n]);
    
        code = `andi x1, x2, +0`;
        assemble_expect(code, [0x00017093n]);
    })

    it("Decimal", () => {
        let code = `andi x1, x2, -3`;
        assemble_expect(code, [0xffd17093n]);
    
        code = `andi x1, x2, 3`;
        assemble_expect(code, [0x00317093n]);

        code = `andi x1, x2, -2048`;
        assemble_expect(code, [0x80017093n]);
    })

    it("Hex", () => {
        let code = `sw x1, 0xA2(zero)`;
        assemble_expect(code, [0x0a102123n]);
    })

    it("Binary", () => {
        let code = `lui x1, 0b10`;
        assemble_expect(code, [0x000020b7n]);
    })
})

describe('Formatting', () => {
    it("Spacing", () => {
        let code = `
            lui   x1  ,   0   
            \taddi\tx1\t,\t x1\t,\t1\t

            lw  x2 ,  4 ( x1 ) 


            sw   x2 ,  8  (  x1  )

            `;
        assemble_expect(code, [
            0x000000b7n,
            0x00108093n,
            0x0040a103n,
            0x0020a423n,
        ]);
    })

    it('Case', () => {
        let code = `AND x1, t2, ra`;
        assemble_expect(code, [0x0013f0b3n]);
    
        code = `aNd x1, t2, ra`;
        assemble_expect(code, [0x0013f0b3n]);
    })
})

describe('Labels', () => {
    it("Labels", () => {
        let code = `
            label1:
            label_2:
            jal label1
            label3: beq zero, zero, label4
            jal label3
            label4:
        `;
        assemble_expect(code, [
            0x000000efn,
            0x00000463n,
            0xffdff0efn,
        ]);
    });
})


it("Errors", () => {
    expect(() => assemble("jal notALabel")).to.throw('Unknown label "notALabel"');
    expect(() => assemble("addi z0, x1, 2")).to.throw('Unknown register "z0"');
    expect(() => assemble("addi x1, x1, 0xFFFF")).to.throw("Expected a signed integer that fits in 12 bits");
    expect(() => assemble("addi, x1, x2, x3")).to.throw("line 1 col 5");
    expect(() => assemble("!!!")).to.throw("line 1 col 1");
    expect(() => assemble("blah x1, x2, x3")).to.throw();
    expect(() => assemble("lw x1, ")).to.throw("Unexpected end of program");
    expect(() => assemble(`
        add x1, x2, x3
        
        add x1, x2, x3,
    `)).to.throw("line 4 col 24");
})

