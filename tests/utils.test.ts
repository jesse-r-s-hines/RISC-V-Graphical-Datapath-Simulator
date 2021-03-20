import { expect } from 'chai';
import { BitArray } from '../src/utils';

describe("Bit Array", () => {
    it('Create', () => {
        let ba = BitArray.fromInt(5)
        expect(ba).to.have.ordered.members([false, false, false, false, false])

        ba = BitArray.fromInt(5, 1n)
        expect(ba).to.have.ordered.members([false, false, false, false, true])

        ba = BitArray.fromInt(3, 6n)
        expect(ba).to.have.ordered.members([true, true, false])

        ba = BitArray.fromInt(3, 7n)
        expect(ba).to.have.ordered.members([true, true, true])
    });

    it('To Int', () => {
        let ba = BitArray.fromInt(5, 0n)
        expect(BitArray.toInt(ba)).to.equal(0n)

        ba = BitArray.fromInt(5, 1n)
        expect(BitArray.toInt(ba)).to.equal(1n)

        ba = BitArray.fromInt(3, 6n)
        expect(BitArray.toInt(ba)).to.equal(6n)

        ba = BitArray.fromInt(3, 7n)
        expect(BitArray.toInt(ba)).to.equal(7n)
    });
})

