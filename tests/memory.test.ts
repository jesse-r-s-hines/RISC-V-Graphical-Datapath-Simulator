import { Memory } from '../src/memory';
import { expect } from 'chai';
import dedent from 'ts-dedent';

describe("Memory", () => {
    it('Test Byte', () => {
        let mem = new Memory(2n**32n)
    
        expect(mem.loadByte(0n)).to.equal(0n) // Returns zero for new memory spots
        mem.storeByte(0n, 10n)
        expect(mem.loadByte(0n)).to.equal(10n)

        mem.storeByte(100n, 11n)
        expect(mem.loadByte(100n)).to.equal(11n)
    });
    
    it('Test Words', () => {
        let mem = new Memory(2n**32n)
    
        mem.storeHalfWord(64n, 1000n)
        expect(mem.loadHalfWord(64n)).to.equal(1000n)
    
        mem.storeWord(2n, 10n**6n) // Doesn't have to be word aligned
        expect(mem.loadWord(2n)).to.equal(1000000n)
    
        mem.storeWord(8n, 0xFFFF_FFFFn)
        expect(mem.loadWord(8n)).to.equal(0xFFFF_FFFFn)
    
        mem.storeDoubleWord(8n, 0xFFFF_FFFF_FFFF_FFFFn)
        expect(mem.loadDoubleWord(8n)).to.equal(0xFFFF_FFFF_FFFF_FFFFn)
    
        mem.storeDoubleWord(8n, 10n**10n)
        expect(mem.loadDoubleWord(8n)).to.equal(10n**10n)
    });
    
    it('Test Endianness', () => {
        let mem = new Memory(2n**32n)
    
        mem.storeDoubleWord(0n, 0x01_23_45_67_89_AB_CD_EFn)
    
        let bytes = [0xEFn, 0xCDn, 0xABn, 0x89n, 0x67n, 0x45n, 0x23n, 0x01n] // backwards
        for (let [i, byte] of bytes.entries()) {
          expect(mem.loadByte(BigInt(i))).to.equal(byte)
        }
    
        expect(mem.loadWord(2n)).to.equal(0x45_67_89_ABn)
        expect(mem.loadHalfWord(6n)).to.equal(0x01_23n)
    
        mem.storeByte(4n, 0x00n)
        expect(mem.loadDoubleWord(0n)).to.equal(0x01_23_45_00_89_AB_CD_EFn)
    });

    it('Test Load/Store slice', () => {
        let mem = new Memory(2n**32n)
    
        mem.store(0n, 8, 0x01_23_45_67_89_AB_CD_EFn)
    
        let bytes = [0xEFn, 0xCDn, 0xABn, 0x89n, 0x67n, 0x45n, 0x23n, 0x01n] // backwards
        for (let [i, byte] of bytes.entries()) {
          expect(mem.load(BigInt(i), 1)).to.equal(byte)
        }
    
        expect(mem.load(2n, 4)).to.equal(0x45_67_89_ABn)
        expect(mem.load(6n, 2)).to.equal(0x01_23n)
    
        mem.store(4n, 1, 0x00n)
        expect(mem.load(0n, 8)).to.equal(0x01_23_45_00_89_AB_CD_EFn)
    });
    
    it('Test Out Of Bounds', () => {
        let mem = new Memory(2n**16n)
    
        expect(() => mem.storeByte(-1n, 1n)).to.throw("out of range")
        expect(() => mem.loadByte(-1n)).to.throw("out of range")
    
        expect(() => mem.storeByte(2n**16n, 1n)).to.throw("out of range")
        expect(() => mem.loadByte(2n**16n)).to.throw("out of range")
    
        expect(() => mem.storeDoubleWord(2n**16n - 8n, 1n)).to.throw("out of range")
        expect(() => mem.loadDoubleWord(2n**16n - 8n)).to.throw("out of range")
    
        expect(() => mem.storeDoubleWord(2n**16n - 9n, 1n)).not.to.throw()
        expect(() => mem.loadDoubleWord(2n**16n - 9n)).not.to.throw()
    });
    
    it('Test Invalid Value', () => {
        let mem = new Memory(2n**16n)
    
        expect(() => mem.storeByte(0n, -2n)).to.throw("invalid")
        expect(() => mem.storeByte(0n, 300n)).to.throw("invalid")
        expect(() => mem.storeByte(0n, 256n)).to.throw("invalid")
        expect(() => mem.storeByte(0n, 255n)).not.to.throw()
    
        expect(() => mem.storeWord(0n, -2n)).to.throw("invalid")
        expect(() => mem.storeWord(0n, 10n**10n)).to.throw("invalid")
        expect(() => mem.storeWord(0n, 2n**32n)).to.throw("invalid")
        expect(() => mem.storeWord(0n, 2n**32n - 1n)).not.to.throw()
    });
    
    it('Test toString', () => {
        let mem = new Memory(2n**32n)
        mem.storeDoubleWord(0n, 100n)
        mem.storeDoubleWord(8n, 101n)
        mem.storeDoubleWord(64n, 10n**10n)
    
        expect(mem.toString()).to.equal(dedent`
            0x00000000: 0x0000000000000064
            0x00000008: 0x0000000000000065
            0x00000040: 0x00000002540be400
        `)
        expect(mem.toString(8, false)).to.equal(dedent`
            0x00000000: 100
            0x00000008: 101
            0x00000040: 10000000000
        `)
        expect(mem.toString(4)).to.equal(dedent`
            0x00000000: 0x00000064
            0x00000004: 0x00000000
            0x00000008: 0x00000065
            0x0000000c: 0x00000000
            0x00000040: 0x540be400
            0x00000044: 0x00000002
        `)
    });
})

