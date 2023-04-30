import { Bit, Bits } from "./bits"

export type BitDontCares = (Bit|null)[]
export class TruthTable<T> {
    // TODO Error Checking
    private table: [BitDontCares[], T][]

    constructor(table: [string[], T][]) {
        this.table = []

        for (const [rowInput, rowOutput] of table) {
            // Convert to boolean[] with nulls for X
            const rowInputConv = rowInput.map(str =>
                [...str].reverse().map(c => c == "X" ? null : Number(c)) // convert to BitDontCares
            )
            this.table.push([rowInputConv, rowOutput])
        }
    }

    /**
     * Takes a bit array, and an array of bits or nulls for don't cares
     * Example: matchInputs([1, 0, 0], [1, null, 0]) 
     */
    private static matchInput(input: Bits, expected: BitDontCares): boolean {
        if (input.length != expected.length) throw Error("Size mismatch in TruthTable")
        for (let i = 0; i < input.length; i++) {
            if (expected[i] != null && expected[i] != input[i]) {
                return false
            }
        }
        return true
    }

    /**
     * Return the proper output for the given inputs to the truth table.
     */
    match(...inputs: Bits[]): T {
        for (const [rowInputs, rowOutputs] of this.table) {
            if (rowInputs.every( (expected, i) => TruthTable.matchInput(inputs[i], expected) )) {
                return rowOutputs
            }
        }
        throw Error(`No match for inputs [${inputs.map(b => `"${Bits.toString(b)}"`).join(", ")}] in truth table.`)
    }
}
