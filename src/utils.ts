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

export class TruthTable {
    // TODO Error Checking
    // TODO return/take BitArray?
    // TODO "compile" the table
    // private table: [(boolean|null)[], bigint[]][]

    constructor(private table: [string[], string[]][]) {}

    /**
     * Takes a bit array, and a string of bits with optional "Don't Cares" and checks if input mathes expected.
     * Example: matchInputs([true, false, false], "1X0") 
     */
    private static matchInput(input: bigint, expected: string): boolean {
        let inputB = BitArray.fromInt(expected.length, input)

        for (let i = 0; i < inputB.length; i++) {
            if (expected[i] != "X" && Number(expected[i]) != Number(inputB[i])) {
                return false
            }
        }
        return true
    }

    match(inputs: bigint[]): bigint[] {
        for (let [rowInputs, rowOutputs] of this.table) {
            if (rowInputs.every( (expected, i) => TruthTable.matchInput(inputs[i], expected) )) {
                return rowOutputs.map(o => BigInt(parseInt(o, 2)))
            }
        }
        throw Error(`No match for inputs [${inputs}] in truth table.`)
    }
}