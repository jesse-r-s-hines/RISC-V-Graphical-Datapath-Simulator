import { expect } from 'chai';
import { b } from 'utils/bits';
import { TruthTable } from "utils/truthTable"


describe("Truth Table", () => {
    it('Basic', () => {
        const table = new TruthTable([
            [["0X", "0"], 0b00n],
            [["00", "1"], 0b01n],
            [["01", "1"], 0b10n],
            [["10", "X"], 0b11n],
        ])

        expect(table.match(b`00`, b`0`)).to.equal(0b00n)
        expect(table.match(b`01`, b`0`)).to.equal(0b00n)

        expect(table.match(b`00`, b`1`)).to.equal(0b01n)

        expect(table.match(b`01`, b`1`)).to.equal(0b10n)

        expect(table.match(b`10`, b`0`)).to.equal(0b11n)
        expect(table.match(b`10`, b`1`)).to.equal(0b11n)

        expect(() => table.match(b`11`, b`0`)).to.throw("No match for inputs")
        expect(() => table.match(b`11`, b`1`)).to.throw("No match for inputs")
    });
})

