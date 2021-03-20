/**
 * Represents memory.
 * Uses a map so that you can emulate the full address space but only allocate the memory actually needed. 
 * (Essentially emulating a makeshift form of virtual memory)
 * 
 * You can store store/load bytes, halfwords, words, and doublewords
 * RISC-V is little-endian so halfwords/words/doublewords will be stored least significant byte first.
 * 
 * All functions have to take and return bigints, as javascript's normal number is a float and can't represent
 * a 64 bit integer precisely.
 */
export class Memory {
    private data: Map<bigint, bigint>; 

    constructor(public size: bigint) {
        this.size = size
        this.data = new Map() // map of bytes to values
    }

    /** Takes a start and a size and loads the consecutive bytes as a positive integer */
    private loadSlice(start: bigint, size: number): bigint {
        let sizeB = BigInt(size) // Convert to bigint so we can add it to bigints
        if (start < 0n || (start + sizeB) >= this.size) throw Error(`Memory index ${start} out of range for ${size} bytes.`)

        let val = 0n
        for (let i = sizeB - 1n; i >= 0; i--) { // Backwards because little-endian
            let byte = this.data.get(start + i) ?? 0n
            val = (val << 8n) | byte
        }
        return val
    }

    /** Takes a start and a size and stores number accross the bytes */
    private storeSlice(start: bigint, size: number, val: bigint) {
        let sizeB = BigInt(size) // Convert to bigint so we can add it to bigints
        if (start < 0n || (start + sizeB) >= this.size) throw Error(`Memory index ${start} out of range for ${size} bytes.`)
        if (val < 0n || val >= 2n ** (8n * sizeB))
            throw Error(`${val} is invalid. Expected a positive integer that fits in ${size} bytes.`)
        
        for (let i = 0n; i < sizeB; i++) {
            this.data.set(start + i, val & 0xFFn)
            val = val >> 8n
        }
    }

    /** Returns a single byte from the memory as an unsigned int. */
    loadByte(index: bigint): bigint  { return this.loadSlice(index, 1) }
    /** Stores a single unsigned int as a byte */
    storeByte(index: bigint, val: bigint) { this.storeSlice(index, 1, val) }

    /** Returns a single half word from the memory as an unsigned int. */
    loadHalfWord(index: bigint): bigint  { return this.loadSlice(index, 2) }
    /** Stores a single unsigned int as a half word */
    storeHalfWord(index: bigint, val: bigint) { this.storeSlice(index, 2, val) }

    /** Returns a single word from the memory as an unsigned int. */
    loadWord(index: bigint): bigint  { return this.loadSlice(index, 4) }
    /** Stores a single unsigned int as a word */
    storeWord(index: bigint, val: bigint) { this.storeSlice(index, 4, val) }

    /** Returns a single double word from the memory as an unsigned int. */
    loadDoubleWord(index: bigint): bigint  { return this.loadSlice(index, 8) }
    /** Stores a single unsigned int as a double word */
    storeDoubleWord(index: bigint, val: bigint) { this.storeSlice(index, 8, val) }

    /**
     * Returns the content of memory as string.
     * @param wordSize How many bytes will be shown as one "row". Should be a power of 2.
     * @param hex If true each value will be converted to hex. Otherwise it will converted to decimal
     */
    toString(wordSize = 8, hex = true) {
        let addrShift = BigInt(Math.ceil(Math.log2(wordSize)))
        let addrSize = (this.size - 1n).toString(16).length
        let indexes = Array.from(this.data.keys())
        indexes.sort((a, b) => (a < b) ? -1 : ((a > b) ? 1 : 0)) // have to specify sort func for BigInts

        let rows = []
        let prevWord = undefined
        for (let i of indexes) {
            let wordI = (i >> addrShift) << addrShift // erase bottom bits
            if (wordI != prevWord) {
                let val = this.loadSlice(i, wordSize)
                let valStr = hex ? `0x${val.toString(16).padStart(wordSize*2, "0")}` : val.toString()
                rows.push(`0x${i.toString(16).padStart(addrSize, "0")}: ${valStr}`)
                prevWord = wordI
            }
        }

        return rows.join("\n")
    }
}
