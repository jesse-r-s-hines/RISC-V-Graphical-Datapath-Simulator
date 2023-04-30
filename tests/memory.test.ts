import { Memory } from 'simulator/memory';
import { expect } from 'chai';
import dedent from 'ts-dedent';

describe("Load/Store", () => {
    it('Test Byte', () => {
        const mem = new Memory(2n**32n)
    
        expect(mem.loadByte(0n)).to.equal(0n) // Returns zero for new memory spots
        mem.storeByte(0n, 10n)
        expect(mem.loadByte(0n)).to.equal(10n)

        mem.storeByte(100n, 11n)
        expect(mem.loadByte(100n)).to.equal(11n)
    });
    
    it('Test Words', () => {
        const mem = new Memory(2n**32n)
    
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
        const mem = new Memory(2n**32n)
    
        mem.storeDoubleWord(0n, 0x01_23_45_67_89_AB_CD_EFn)
    
        const bytes = [0xEFn, 0xCDn, 0xABn, 0x89n, 0x67n, 0x45n, 0x23n, 0x01n] // backwards
        for (const [i, byte] of bytes.entries()) {
          expect(mem.loadByte(BigInt(i))).to.equal(byte)
        }
    
        expect(mem.loadWord(2n)).to.equal(0x45_67_89_ABn)
        expect(mem.loadHalfWord(6n)).to.equal(0x01_23n)
    
        mem.storeByte(4n, 0x00n)
        expect(mem.loadDoubleWord(0n)).to.equal(0x01_23_45_00_89_AB_CD_EFn)
    });

    it('Test Load/Store slice', () => {
        const mem = new Memory(2n**32n)
    
        mem.store(0n, 8, 0x01_23_45_67_89_AB_CD_EFn)
    
        const bytes = [0xEFn, 0xCDn, 0xABn, 0x89n, 0x67n, 0x45n, 0x23n, 0x01n] // backwards
        for (const [i, byte] of bytes.entries()) {
          expect(mem.load(BigInt(i), 1)).to.equal(byte)
        }
    
        expect(mem.load(2n, 4)).to.equal(0x45_67_89_ABn)
        expect(mem.load(6n, 2)).to.equal(0x01_23n)
    
        mem.store(4n, 1, 0x00n)
        expect(mem.load(0n, 8)).to.equal(0x01_23_45_00_89_AB_CD_EFn)
    });
    
    it('Test Out Of Bounds', () => {
        const mem = new Memory(2n**16n)
    
        expect(() => mem.storeByte(-1n, 1n)).to.throw("out of range")
        expect(() => mem.loadByte(-1n)).to.throw("out of range")
    
        expect(() => mem.storeByte(2n**16n, 1n)).to.throw("out of range")
        expect(() => mem.loadByte(2n**16n)).to.throw("out of range")
    
        expect(() => mem.storeDoubleWord(2n**16n - 7n, 1n)).to.throw("out of range")
        expect(() => mem.loadDoubleWord(2n**16n - 7n)).to.throw("out of range")

        expect(() => mem.storeDoubleWord(2n**16n - 8n, 1n)).to.not.throw()
        expect(() => mem.loadDoubleWord(2n**16n - 8n)).to.not.throw()
    });
    
    it('Test Invalid Value', () => {
        const mem = new Memory(2n**16n)
    
        expect(() => mem.storeByte(0n, -2n)).to.throw("invalid")
        expect(() => mem.storeByte(0n, 300n)).to.throw("invalid")
        expect(() => mem.storeByte(0n, 256n)).to.throw("invalid")
        expect(() => mem.storeByte(0n, 255n)).not.to.throw()
    
        expect(() => mem.storeWord(0n, -2n)).to.throw("invalid")
        expect(() => mem.storeWord(0n, 10n**10n)).to.throw("invalid")
        expect(() => mem.storeWord(0n, 2n**32n)).to.throw("invalid")
        expect(() => mem.storeWord(0n, 2n**32n - 1n)).not.to.throw()
    });

    it("Test store/load array", () => {
        const mem = new Memory(2n**16n)

        const arr = [0x0011_2233_4455_6677n, 0x8899_AABB_CCDD_EEFFn]

        mem.storeArray(100n, 8, arr)
        expect(mem.loadArray(100n, 8, 2)).to.eql(arr)
        expect(mem.loadArray(100n, 8, 1)).to.eql([0x0011_2233_4455_6677n])
        expect(mem.loadArray(100n, 1, 16)).to.eql([
            0x77n, 0x66n, 0x55n, 0x44n, 0x33n, 0x22n, 0x11n, 0x00n, 0xFFn, 0xEEn, 0xDDn, 0xCCn, 0xBBn, 0xAAn, 0x99n, 0x88n, 
        ])
        expect(mem.loadArray(105n, 1, 5)).to.eql([0x22n, 0x11n, 0x00n, 0xFFn, 0xEEn])

        expect(mem.loadArray(100n, 8, 0)).to.eql([])
        expect(() => mem.storeArray(100n, 8, [])).to.not.throw()
    })
})

describe("Dump", () => {
    it("Basic", () => {
        const mem = new Memory(2n**16n)

        expect([...mem.dump(8)]).to.eql([[[0x0000n, 0xFFF8n], 0n]])

        mem.storeByte(14n, 1n)
        expect([...mem.dump(4)]).to.eql([ // expand small groups (<= 4) of missing addresses
            [0x0000n, 0n], [0x0004n, 0n], [0x0008n, 0n], [0x000Cn, 0x00_01_00_00n],
            [[0x0010n, 0xFFFCn], 0n],
        ])

        expect([...mem.dump(2)]).to.eql([
            [[0x0000n, 0x000Cn], 0n],
            [0x000En, 0x00_01n],
            [[0x0010n, 0xFFFEn], 0n],
        ])

        mem.storeWord(0n, 0x11_22_33_44n)
        expect([...mem.dump(4)]).to.eql([
            [0x0000n, 0x11_22_33_44n], [0x0004n, 0n], [0x0008n, 0n], [0x000Cn, 0x00_01_00_00n],
            [[0x0010n, 0xFFFCn], 0n],
        ])

        mem.storeHalfWord(0x00FEn, 0x11_22n)
        expect([...mem.dump(4)]).to.eql([
            [0x0000n, 0x11_22_33_44n], [0x0004n, 0n], [0x0008n, 0n], [0x000Cn, 0x00_01_00_00n],
            [[0x0010n, 0x00F8n], 0n],
            [0x00FCn, 0x11_22_00_00n],
            [[0x0100n, 0xFFFCn], 0n],
        ])


        mem.storeWord(0x0004n, 100n)
        expect([...mem.dump(4)]).to.eql([
            [0x0000n, 0x11_22_33_44n], [0x0004n, 100n], [0x0008n, 0n], [0x000Cn, 0x00_01_00_00n],
            [[0x0010n, 0x00F8n], 0n],
            [0x00FCn, 0x11_22_00_00n],
            [[0x0100n, 0xFFFCn], 0n],
        ])
    })

    it("Edges", () => {
        const mem = new Memory(2n**16n)
        mem.storeWord(0x0000n, 0x11_22_33_44n)
        mem.storeWord(0xFFFCn, 0x55_66_77_88n)
        expect([...mem.dump(4)]).to.eql([
            [0x0000n, 0x11_22_33_44n],
            [[0x0004n, 0xFFF8n], 0n],
            [0xFFFCn, 0x55_66_77_88n],
        ])

        expect([...mem.dump(1)]).to.eql([
            [0x0000n, 0x44n],
            [0x0001n, 0x33n],
            [0x0002n, 0x22n],
            [0x0003n, 0x11n],
            [[0x0004n, 0xFFFBn], 0n],
            [0xFFFCn, 0x88n],
            [0xFFFDn, 0x77n],
            [0xFFFEn, 0x66n],
            [0xFFFFn, 0x55n],
        ])
    })

    it("Gaps", () => {
        let mem = new Memory(2n**16n)
        mem.storeHalfWord(0x0000n, 0x11_22n)
        mem.storeHalfWord(0x0008n, 0x33_44n)
        expect([...mem.dump(2, 4)]).to.eql([
            [0x0000n, 0x11_22n],
            [0x0002n, 0x00_00n],
            [0x0004n, 0x00_00n],
            [0x0006n, 0x00_00n],
            [0x0008n, 0x33_44n],
            [[0x000An, 0xFFFEn], 0n],
        ])

        mem = new Memory(2n**16n)
        mem.storeHalfWord(0x0000n, 0x11_22n)
        mem.storeHalfWord(0x0008n, 0x33_44n)
        expect([...mem.dump(2, 3)]).to.eql([
            [0x0000n, 0x11_22n],
            [[0x0002n, 0x0006n], 0n],
            [0x0008n, 0x33_44n],
            [[0x000An, 0xFFFEn], 0n],
        ])

        mem = new Memory(2n**16n)
        mem.storeHalfWord(0x0000n, 0x11_22n)
        mem.storeHalfWord(0x0004n, 0x33_44n)
        expect([...mem.dump(2, 1)]).to.eql([
            [0x0000n, 0x11_22n],
            [[0x0002n, 0x0002n], 0n],
            [0x0004n, 0x33_44n],
            [[0x0006n, 0xFFFEn], 0n],
        ])

        mem = new Memory(2n**16n)
        mem.storeHalfWord(0x0006n, 0x33_44n)
        expect([...mem.dump(2, 4)]).to.eql([
            [0x0000n, 0n],
            [0x0002n, 0n],
            [0x0004n, 0n],
            [0x0006n, 0x33_44n],
            [[0x0008n, 0xFFFEn], 0n],
        ])

        mem = new Memory(2n**16n)
        mem.storeHalfWord(0x0008n, 0x33_44n)
        expect([...mem.dump(2, 4)]).to.eql([
            [[0x0000n, 0x0006n], 0n],
            [0x0008n, 0x33_44n],
            [[0x000An, 0xFFFEn], 0n],
        ])
    })

    it("No collapse", () => {
        const mem = new Memory(2n**4n)
        mem.storeByte(0x0n, 0x11n)
        mem.storeByte(0xFn, 0x22n)
        expect([...mem.dump(1, Infinity)]).to.eql([
            [0x0n, 0x11n],
            ...[...Array(14)].map((_, i) => [BigInt(i + 1), 0n]),
            [0xFn, 0x22n],
        ])
    })

    it("Manual 0s", () => {
        const mem = new Memory(2n**16n)
        mem.storeHalfWord(0x0000n, 0x11_22n)
        for (let i = 0x0002n; i < 0x00FEn; i += 2n) {
            mem.storeHalfWord(i, 0x0n)
        }
        mem.storeHalfWord(0x00FEn, 0x33_44n)
        expect([...mem.dump(2, 4)]).to.eql([
            [0x0000n, 0x11_22n],
            [[0x0002n, 0x00FCn], 0n],
            [0x00FEn, 0x33_44n],
            [[0x0100n, 0xFFFEn], 0n],
        ])
    })
})

describe("Other", () => {
    it('Test toString', () => {
        const mem = new Memory(2n**32n)
        mem.storeDoubleWord(0n, 100n)
        mem.storeDoubleWord(8n, 101n)
        mem.storeDoubleWord(64n, 10n**10n)
    
        expect(mem.toString()).to.equal(dedent`
            0x00000000: 0x0000000000000064
            0x00000008: 0x0000000000000065
            0x00000010 - 0x00000038: 0x0000000000000000
            0x00000040: 0x00000002540BE400
            0x00000048 - 0xFFFFFFF8: 0x0000000000000000
        `)
        expect(mem.toString(8, false)).to.equal(dedent`
            0x00000000: 100
            0x00000008: 101
            0x00000010 - 0x00000038: 0
            0x00000040: 10000000000
            0x00000048 - 0xFFFFFFF8: 0
        `)
        expect(mem.toString(4)).to.equal(dedent`
            0x00000000: 0x00000064
            0x00000004: 0x00000000
            0x00000008: 0x00000065
            0x0000000C - 0x0000003C: 0x00000000
            0x00000040: 0x540BE400
            0x00000044: 0x00000002
            0x00000048 - 0xFFFFFFFC: 0x00000000
        `)
    });
})