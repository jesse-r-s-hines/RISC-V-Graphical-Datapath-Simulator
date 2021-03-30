/** Represents a bit as either a boolean or a 0|1 value. */
export type Bit = number|boolean


/**
 * Represents an array of bits as a number[] containing 0s and 1s.
 * Note that the most significant bit is actually at the end of the array. i.e. the arrays are stored backwards.
 * This matches how RISC-V numbers their instructions and integers in "Least Significant Bit 0" order.
 */
export type Bits = Bit[]

/**
 * Make Bits from an array of 0 and 1s.
 * The array should be given in MSB 0 order, i.e. most significant bit first.
 * Eg. `Bits.from([1, 0, 1, 0])` represents 10
 * @param arr The array to convert
 */
export function Bits(arr: Bit[]): Bits

/**
 * Make Bits from an string of 0 and 1s.
 * The string should be given in MSB 0 order, i.e. most significant bit first.
 * Eg. `Bits.from("1010")` represents 10
 * @param arr The array to convert
 */
export function Bits(are: string): Bits

/**
 * Converts a bigint to an array of bits
 * @param num The bigint to convert into bits. Should be positive.
 * @param length The number of bits in the array.
 * @param signed Whether the bits should be signed or not. Defaults to false.
 */
export function Bits(num: bigint, length: number, signed?: boolean): Bits

export function Bits(src: Bit[]|string|bigint, length?: number, signed?: boolean): Bits {
    if (typeof src == "object") {
        if (length != undefined || signed != undefined) throw Error("Invalid arguments to Bits.from")
        return fromArray(src)
    } else if (typeof src == "string") {
        return fromString(src)
    } else { // bigint
        if (length == undefined) throw Error("Invalid arguments to Bits.from")
        return fromInt(src, length, signed)
    }
}

// Private methods to module
function fromArray(arr: Bit[]): Bits {
    return arr.reverse()
}

function fromString(str: string): Bits {
    return [...str].map(b => Number(b)).reverse()
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

export namespace Bits {
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
     * Converts a bits to a number. Note that if the bits is too large precision will be lost. 
     * @param bits The bits to convert to an number
     * @param signed Whether the bits should be interpreted signed or not. Defaults to false.
     */
    export function toNumber(bits: Bits, signed: boolean = false): number {
        return Number(Bits.toInt(bits, signed))
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
    export function msb0(bits: Bits): Bit[] {
        return bits.reverse()
    }

    export function toString(bits: Bits): string {
        return bits.reverse().join("")
    }
}

/** Represents optional bits. I.e. some bits can be null or "don't cares" */
export type BitDontCares = (Bit|null)[]
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
    match(inputs: Bits[]): T {
        for (let [rowInputs, rowOutputs] of this.table) {
            if (rowInputs.every( (expected, i) => TruthTable.matchInput(inputs[i], expected) )) {
                return rowOutputs
            }
        }
        throw Error(`No match for inputs [${inputs.map(b => `"${Bits.toString(b)}"`).join(", ")}] in truth table.`)
    }
}