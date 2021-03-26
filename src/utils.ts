export type Bits = number[]
export namespace Bits {
    /**
     * Converts a number to an array of bits, returning a Bits containing 0s and 1s.
     * @param num The number to convert into bits. Should be positive.
     * @param size The number of bits in the array
     */
    export function fromInt(num: bigint, size: number): Bits {
        // TODO check for invalid num
        // TODO sign extend?
        // if (start < 0n || (start + sizeB) >= this.size) throw Error(`Memory index ${start} out of range for ${size} bytes.`)
        // if (val < 0n || val >= 2n ** (8n * sizeB))
        //     throw Error(`${val} is invalid. Expected a positive integer that fits in ${size} bytes.`)
        let arr: Bits = Array(size)
        for (let i = size - 1; i >= 0; i--) {
            arr[i] = Number(num & 0x1n)
            num = num >> 1n
        }
        return arr
    }

    /**
     * Converts a boolean[] to a unsigned bigint
     */
    export function toInt(bits: Bits): bigint {
        // TODO signed?
        let num = 0n
        for (let bit of bits) {
            num = num << 1n
            if (bit) num = num | 0x1n
        }
        return num
    }

    /**
     * Extends a bit array to the given size.
     * @param size the size to extend to
     * @param signed if True, will sign extend
     */
    export function extend(bits: Bits, size: number, signed = false): Bits {
        let sign = signed ? bits[0] : 0
        let extend = Array(size - bits.length).fill(sign)
        return [...extend, ...bits]
    }
}

/** Represents optional bits. I.e. some bits can be null or "don't cares" */
export type BitsDontCares = (number|null)[]
export class TruthTable<T> {
    // TODO Error Checking
    private table: [BitsDontCares[], T][]
    private inputLengths: number[]

    constructor(table: [string[], T][]) {
        this.table = []
        this.inputLengths = table[0][0].map(s => s.length)

        for (let [rowInput, rowOutput] of table) {
            // Convert to boolean[] with nulls for X
            let rowInputConv = rowInput.map( x => [...x].map(c => c == "X" ? null : Number(c)) )
            // Convert bigint[]
            this.table.push([rowInputConv, rowOutput])
        }
    }

    /**
     * Takes a bit array, and an array of bits or nulls for don't cares
     * Example: matchInputs([1, 0, 0], [1, null, 0]) 
     */
    private static matchInput(input: Bits, expected: BitsDontCares): boolean {
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
    match(inputs: bigint[]): T {
        let inputsB = inputs.map((x, i) => Bits.fromInt(x, this.inputLengths[i]))

        for (let [rowInputs, rowOutputs] of this.table) {
            if (rowInputs.every( (expected, i) => TruthTable.matchInput(inputsB[i], expected) )) {
                return rowOutputs
            }
        }
        throw Error(`No match for inputs [${inputs}] in truth table.`)
    }
}