/**
 * Represents an array of bits as a number[] containing 0s and 1s.
 * Note that the most significant bit is actually at the end of the array. i.e. the arrays are stored backwards.
 * This matches how RISC-V numbers their instructions and integers in "Least Significant Bit 0" order.
 */
export type Bits = number[]

export namespace Bits {

    function fromArray(arr: number[]): Bits {
        return arr.reverse()
    }

    function fromInt(num: bigint, length: number, signed: boolean = false): Bits {
        let [lb, ub] = signed ? [-(2**(length - 1)), 2**(length - 1) - 1] : [0, 2**(length) - 1]
        if (num < lb || num > ub) throw Error(`${num} out of range for ${signed?"":"un"}signed ${length} bits.`)

        let bits = Array(length)
        for (let i = 0; i < length; i++) {
            bits[i] = Number(num & 0x1n) // Least Significant Bit 0
            num = num >> 1n
        }
        return bits
    }

    /**
     * Make Bits from an array of 0 and 1s.
     * The array should be given in MSB 0 order, i.e. most significant bit first.
     * Eg. `Bits([1, 0, 1, 0])` represents 10
     * @param arr The array to convert
     */
    export function from(arr: number[]): Bits

    /**
     * Converts a number to an array of bits
     * @param num The number to convert into bits. Should be positive.
     * @param length The number of bits in the array.
     * @param signed Whether the bits should be signed or not. Defaults to false.
     */
    export function from(num: bigint, length: number, signed?: boolean): Bits

    export function from(src: bigint|number[], length?: number, signed?: boolean): Bits {
        if (typeof src == "object") {
            if (length != undefined || signed != undefined) throw Error("Invalid arguments to Bits.from")
            return fromArray(src)
        } else {
            if (length == undefined) throw Error("Invalid arguments to Bits.from")
            return fromInt(src, length, signed)
        }
    }

    /**
     * Converts a Bits to a unsigned bigint
     * @param bits The bits to convert to an int
     * @param signed Whether the bits should be interpreted signed or not. Defaults to false.
     */
    export function toInt(bits: Bits, signed: boolean = false): bigint {
        let negative = (signed && bits[bits.length - 1])

        if (negative) bits = bits.map(b => +!b) // two's complement, +1 later

        // TODO signed?
        let num = 0n
        for (let i = bits.length - 1; i >= 0; i--) { // Stored backwards, 0 is the index of the LAST bit in binary representation
            num = num << 1n
            if (bits[i]) num = num | 0x1n
        }

        if (negative) num = -(num + 1n) // 2's complement. We can't use bitwise ~ here since bigint is already signed.
        return num
    }

    /**
     * Extends a Bits to the given size.
     * @param size the size to extend to
     * @param signed if True, will sign extend
     */
     export function extended(bits: Bits, size: number, signed = false): Bits {
        let sign = signed ? bits[bits.length - 1] : 0 // sign bit
        let extend = Array(size - bits.length).fill(sign)
        return bits.concat(extend)
    }

    /** Converts a bits to a Most Significant Bit 0 order */
    export function msb0(bits: Bits): number[] {
        return bits.reverse()
    }
}

/** Represents optional bits. I.e. some bits can be null or "don't cares" */
export type BitDontCares = (number|null)[]
export class TruthTable<T> {
    // TODO Error Checking
    private table: [BitDontCares[], T][]
    private inputLengths: number[]

    constructor(table: [string[], T][]) {
        this.table = []
        this.inputLengths = table[0][0].map(s => s.length)

        for (let [rowInput, rowOutput] of table) {
            // Convert to boolean[] with nulls for X
            let rowInputConv = rowInput.map(str =>
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
        let inputsB = inputs.map((x, i) => Bits.from(x, this.inputLengths[i]))

        for (let [rowInputs, rowOutputs] of this.table) {
            if (rowInputs.every( (expected, i) => TruthTable.matchInput(inputsB[i], expected) )) {
                return rowOutputs
            }
        }
        throw Error(`No match for inputs [${inputs}] in truth table.`)
    }
}