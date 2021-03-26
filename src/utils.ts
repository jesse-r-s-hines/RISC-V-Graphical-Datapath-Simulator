export class BitArray {
    /**
     * Converts a number to an array of bits, returning a boolean[].
     * @param size The number of bits in the array
     * @param num The number to convert into bits. Should be positive.
     */
    static fromInt(size: number, num: bigint = 0n): boolean[] {
        // TODO check for invalid num
        // TODO sign extend?
        // if (start < 0n || (start + sizeB) >= this.size) throw Error(`Memory index ${start} out of range for ${size} bytes.`)
        // if (val < 0n || val >= 2n ** (8n * sizeB))
        //     throw Error(`${val} is invalid. Expected a positive integer that fits in ${size} bytes.`)
        let arr = Array(size)
        for (let i = size - 1; i >= 0; i--) {
            arr[i] = Boolean(num & 0x1n)
            num = num >> 1n
        }
        return arr
    }

    /**
     * Converts a boolean[] to a bigint
     */
    static toInt(bits: boolean[]): bigint {
        // TODO signed?
        let num = 0n
        for (let bit of bits) {
            num = num << 1n
            if (bit) num = num | 0x1n
        }
        return num
    }
}

export class TruthTable<T> {
    // TODO Error Checking
    // TODO return/take BitArray?
    private table: [(boolean|null)[][], T][]
    private inputLengths: number[]

    constructor(table: [string[], T][]) {
        this.table = []
        this.inputLengths = table[0][0].map(s => s.length)

        for (let [rowInput, rowOutput] of table) {
            // Convert to boolean[] with nulls for X
            let rowInputConv = rowInput.map( x => [...x].map(c => c == "X" ? null : !!+c) )
            // Convert bigint[]
            this.table.push([rowInputConv, rowOutput])
        }
    }

    /**
     * Takes a bit array, and an array of booleans or nulls for don't cares
     * Example: matchInputs([true, false, false], [true, null, false]) 
     */
    private static matchInput(input: boolean[], expected: (boolean|null)[]): boolean {
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
        let inputsB = inputs.map((x, i) => BitArray.fromInt(this.inputLengths[i], x))

        for (let [rowInputs, rowOutputs] of this.table) {
            if (rowInputs.every( (expected, i) => TruthTable.matchInput(inputsB[i], expected) )) {
                return rowOutputs
            }
        }
        throw Error(`No match for inputs [${inputs}] in truth table.`)
    }
}