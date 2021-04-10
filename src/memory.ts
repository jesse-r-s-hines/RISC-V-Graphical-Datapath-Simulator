/**
 * Represents memory. This will be used to represent the state in the data and instruction memories.
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
        this.size = size // size should be a power of two
        this.data = new Map() // map of bytes to values
    }

    /**
     * Loads the given number of bytes at addr as a single number.
     * Returns a positive bigint, and treats the memory as little-endian.
     * @param addr Address to load from
     * @param bytes the number of bytes to load (ie. 1, 2, 4, 8 for byte/half-word/word/double-word)
     */
    public load(addr: bigint, bytes: number): bigint {
        let bytesB = BigInt(bytes) // Convert to bigint so we can add it to bigints
        if (addr < 0n || (addr + bytesB) >= this.size) throw Error(`Memory address ${addr} out of range for ${bytes} bytes.`)

        let val = 0n
        for (let i = bytesB - 1n; i >= 0; i--) { // Backwards because little-endian
            let byte = this.data.get(addr + i) ?? 0n
            val = (val << 8n) | byte
        }
        return val
    }

    /**
     * Stores a number accross the given number of bytes.
     * Treats the memory as little-endian.
     * @param addr Address to store to
     * @param bytes the number of bytes to store as (ie. 1, 2, 4, 8 for byte/half-word/word/double-word)
     * @param val the number to store
     */
    public store(addr: bigint, bytes: number, val: bigint) {
        let bytesB = BigInt(bytes) // Convert to bigint so we can add it to bigints
        if (addr < 0n || (addr + bytesB) >= this.size) throw Error(`Memory address ${addr} out of range for ${bytes} bytes.`)
        if (val < 0n || val >= 2n ** (8n * bytesB))
            throw Error(`${val} is invalid. Expected a positive integer that fits in ${bytes} bytes.`)
        
        for (let i = 0n; i < bytesB; i++) {
            this.data.set(addr + i, val & 0xFFn)
            val = val >> 8n
        }
    }

    /** Returns a single byte from the memory as an unsigned int. */
    loadByte(addr: bigint): bigint  { return this.load(addr, 1) }
    /** Stores a single unsigned int as a byte */
    storeByte(addr: bigint, val: bigint) { this.store(addr, 1, val) }

    /** Returns a single half word from the memory as an unsigned int. */
    loadHalfWord(addr: bigint): bigint  { return this.load(addr, 2) }
    /** Stores a single unsigned int as a half word */
    storeHalfWord(addr: bigint, val: bigint) { this.store(addr, 2, val) }

    /** Returns a single word from the memory as an unsigned int. */
    loadWord(addr: bigint): bigint  { return this.load(addr, 4) }
    /** Stores a single unsigned int as a word */
    storeWord(addr: bigint, val: bigint) { this.store(addr, 4, val) }

    /** Returns a single double word from the memory as an unsigned int. */
    loadDoubleWord(addr: bigint): bigint  { return this.load(addr, 8) }
    /** Stores a single unsigned int as a double word */
    storeDoubleWord(addr: bigint, val: bigint) { this.store(addr, 8, val) }



    /**
     * Loads an arary from memory as an array of positive integers
     * @param addr Address the array starts
     * @param elemBytes The number of bytes each element takes
     * @param size The number of elements in the array to load
     */
    loadArray(addr: bigint, elemBytes: number, size: number): bigint[] {
        let arr: bigint[] = Array(size)
        for (let i = 0; i < size; i++)
            arr[i] = this.load(addr + BigInt(elemBytes * i), elemBytes)
        return arr
    }
    
    /**
     * Takes a bigint[] and stores it in the memory.
     * @param addr Address to start the array
     * @param elemBytes The number of bytes each element should take
     * @param arr The array to store. Should contain positive integers.
     */
    storeArray(addr: bigint, elemBytes: number, arr: bigint[]) {
        for (let [i, val] of arr.entries())
            this.store(addr + BigInt(elemBytes * i), elemBytes, val)
    }

    /**
     * Returns an iterator over the memory. It returns a sequence of [address, value] tuples, except where
     * there are large spans of unused memory, then it includes a [[start, end], 0n] tuple where [start, end]
     * is and incluse range of word-aligned addresses that are unused.
     * @param wordSize The number of bytes in each entry
     */
    *dump(wordSize: number = 8): Generator<[bigint|[bigint, bigint], bigint]> {
        let addrShift = BigInt(Math.ceil(Math.log2(wordSize)))
        let gapSize = 4n // number of missing entries before we skip
        let wordSizeB = BigInt(wordSize)

        let addresses = Array.from(this.data.keys())
        addresses = addresses.map(a => ((a >> addrShift) << addrShift) ) // word align all entries
        addresses = [...new Set(addresses)] // remove duplicates
        addresses.sort((a, b) => (a < b) ? -1 : ((a > b) ? 1 : 0)) // have to specify sort func for BigInts
        addresses.push(this.size) // Make it add a range at the end.

        let prevAddr: bigint = -wordSizeB
        for (let addr of addresses) {
            if ( (addr - prevAddr) / wordSizeB - 1n > gapSize ) { // collapse missing entries
                yield [[prevAddr + wordSizeB, addr - wordSizeB], 0n]
            } else if ( (addr - prevAddr) > wordSizeB) { // expand small gap of missing entries
                for (let addr2 = prevAddr + wordSizeB; addr2 < addr; addr2 += wordSizeB) {
                    yield [addr2, this.load(addr2, wordSize)]
                }
            }
            if (addr < this.size) yield [addr, this.load(addr, wordSize)]
            prevAddr = addr;
        }
    }


    /**
     * Returns the content of memory as string.
     * @param wordSize How many bytes will be shown as one "row". Should be a power of 2.
     * @param hex If true each value will be converted to hex. Otherwise it will converted to decimal
     */
    toString(wordSize = 8, hex = true) {
        let addrShift = BigInt(Math.ceil(Math.log2(wordSize)))
        let addrSize = (this.size - 1n).toString(16).length
        let addresses = Array.from(this.data.keys())
        addresses.sort((a, b) => (a < b) ? -1 : ((a > b) ? 1 : 0)) // have to specify sort func for BigInts

        let rows = []
        let prevWord = undefined
        for (let i of addresses) {
            let wordI = (i >> addrShift) << addrShift // erase bottom bits
            if (wordI != prevWord) {
                let val = this.load(i, wordSize)
                let valStr = hex ? `0x${val.toString(16).padStart(wordSize*2, "0")}` : val.toString()
                rows.push(`0x${i.toString(16).padStart(addrSize, "0")}: ${valStr}`)
                prevWord = wordI
            }
        }

        return rows.join("\n")
    }
}
