/** Represents a bit as 0|1 value. */
export type Bit = 0|1
export function bit(value: bigint|number|boolean|string): Bit { return Number(value) ? 1 : 0 }

/**
 * Most significant bit first vs least significant bit first
 * With lsb0, the most significant bit is actually at the end of the array. i.e. the arrays are stored backwards.
 * RISC-V instructions and integers are "Least Significant Bit 0" order.
 */
export type BitOrder = "msb0"|"lsb0"

/** A class that represents an immutable bit array */
export class Bits {
    private constructor(
        /** Bits represented as a unsigned int */
        private readonly value: bigint,
        /** Number of bits */
        public readonly length: number,
    ) {
        if (length <= 0) throw Error('Empty bits are invalid')
    }

    static create(arr: Bit[]|string|Bits): Bits
    static create(num: number|bigint, length: number): Bits

    /**
     * Construct a Bits object.
     * Construct from:
     * - An array of 0 and 1s.
     *   The array should be given in MSB 0 order, i.e. most significant bit first.
     *   E.g. `new Bits([1, 0, 1, 0])` represents 10
     * - Make Bits from an string of 0 and 1s. Will ignore _ and spaces in the string (so you can use them as spacers)
     *   The string should be given in MSB 0 order, i.e. most significant bit first.
     *   E.g. `new Bits("1010")` represents 10
     * - Another Bits object
     * - Or a number or bigint. You'll need to explicitly pass the length and whether it's signed or not.
     *   E.g. `new Bits(10, 4)` represents 10
     * @param value The object to convert into bits.
     * @param length The number of bits
     * @param check Whether to throw if the number doesn't fit in the given length instead of just truncating. Defaults to true.
     */
    static create(value: Bit[]|string|Bits|number|bigint, length?: number): Bits {
        if (Array.isArray(value)) {
            if (length != undefined) throw Error("Invalid arguments to Bits.create()");
            return Bits.fromArray(value)
        } else if (typeof value == "string") {
            if (length != undefined) throw Error("Invalid arguments to Bits.create()");
            return Bits.fromString(value)
        } else if (typeof value == "bigint" || typeof value == "number") {
            if (length == undefined) throw Error("Invalid arguments to Bits.create()");
            return Bits.fromInt(value, length)
        } else if (value instanceof Bits) {
            if (length != undefined) throw Error("Invalid arguments to Bits.create()");
            return value // bits are immutable
        } else {
            throw Error("Invalid arguments to Bits.create()")
        }
    }


    // Private methods to create Bits

    /** Create from MSB0 array */
    private static fromArray(arr: Bit[]): Bits {
        let num = 0n
        for (let i = 0; i < arr.length; i++) {
            if(arr[i]) num = num | (1n << BigInt(arr.length - i - 1))
        }
        return new Bits(num, arr.length)
    }

    private static fromString(str: string): Bits {
        str = str.replace(/[ _]/g, "") // ignore " " and "_"
        if (!str.match(/^[01]+$/)) throw Error(`Invalid bit string "${str}"`)
        return Bits.fromInt(BigInt(`0b${str}`), str.length)
    }

    private static fromInt(num: number|bigint, length: number, check = true): Bits {
        num = BigInt(num)
        const unsigned = toTwosComplement(num, length)
        const truncated = unsigned & ((1n << BigInt(length)) - 1n) // truncate to length

        if (check) {
            const lenB =  BigInt(length)
            const [min, max] = [-(2n**(lenB-1n)), 2n**lenB - 1n]
            if (truncated != unsigned || num < min || num > max)
                throw Error(`${num} is invalid. Expected an integer that fits in ${length} bits.`)
        }

        return new Bits(truncated, length)
    }

    /**
     * Converts a Bits to a bigint
     * @param signed Whether the bits should be interpreted signed or not. Defaults to false.
     */
    toInt(signed = false): bigint {
        return signed ? fromTwosComplement(this.value, this.length) : this.value
    }

    /**
     * Converts a Bits to a number. Note that if the bits is too large precision will be lost. 
     * @param signed Whether the bits should be interpreted signed or not. Defaults to false.
     */
    toNumber(signed = false): number {
        return Number(this.toInt(signed))
    }

    /**
     * Converts a Bits to an array containing 0s and 1s.
     * @param bitorder The bit order to use. Defaults to LSB 0 (least significant bit first like RISC-V does)
     */
    toArray(bitorder: BitOrder = 'lsb0'): Bit[] {
        const arr: Bit[] = []
        let num = this.value;
        for (let i = 0; i < this.length; i++) {
            arr.push(bit(num & 1n))
            num = num >> 1n
        }

        if (bitorder == "msb0") arr.reverse()
        return arr
    }

    /**
     * Extends a Bits to the given length.
     * @param length the length to extend to
     * @param signed if True, will sign extend
     */
    extend(length: number, signed = false): Bits {
        const arr = this.toArray('msb0')
        const sign = signed ? arr[0] : 0 // sign bit
        const extend = Array(length - this.length).fill(sign)
        return Bits.create([...extend, ...arr])
    }

    toString(): string {
        return this.toArray('msb0').join("")
    }

    /**
     * Return true if the two Bits are identical.
     * You can also compare against a string or array representation of the Bits
     */
    equals(other: Bits|Bit[]|string): boolean {
        other = Bits.create(other)
        return this.value == other.value && this.length == other.length
    }

    /**
     * Concatenates multiple bits. Can also pass string or Bit[]
     * Note that this is in MSB-0 order
     */
    static join(...arr: (Bits|Bit[]|string)[]): Bits {
        return Bits.create(arr.flatMap(b => Bits.create(b).toArray('msb0')))
    }

    /** Returns a slice of the Bits starting at start and ending at (but not including) end. Indexes are in LSB0 */
    slice(start: number, end: number): Bits {
        if (start < 0 || end > this.length || start >= end) throw Error(`Invalid bit slice ${start}:${end}`)
        const num = (this.value >> BigInt(start) ) & ((1n << BigInt(end - start)) - 1n)
        return Bits.create(num, end - start)
    }

    /** Returns the bit at index. Indexes are in LSB0 */
    at(index: number): Bit {
        if (index < 0 || index >= this.length) throw Error(`Invalid bit index ${index}`)
        return bit(this.value >> BigInt(index) & 1n)
    }

    /** Returns a new bits with the given bit set to value. Indexes are in LSB0 */
    set(index: number, value: Bit): Bits {
        if (index < 0 || index >= this.length) throw Error(`Invalid bit index ${index}`)
        const mask = 1n << BigInt(index)
        const num = value ? this.value | mask : this.value & ~mask
        return new Bits(num, this.length)
    }
}

/** A Template tag which will take a string and return a Bits. */
export function b(strings: TemplateStringsArray) {
    return Bits.create(strings[0])
}

/** Function to return a Bits object */
export const bits = Bits.create;

/**
 * Converts an unsigned int to a signed one.
 * @param bits The number of bits the int should be. Default 32.
 */
export function fromTwosComplement(num: bigint, bits: number): bigint {
    // ~num + 1 doesn't work because of how Javscript does ~
    const bitsB = BigInt(bits)
    if (num >= (1n << (bitsB - 1n))) num -= (1n << bitsB) // interpret as two's complement
    return num
}

/**
 * Converts an signed int to an unsigned one.
 * @param bits The number of bits the int should be. Default 32.
 */
export function toTwosComplement(num: bigint, bits: number): bigint {
    if (num < 0) num += (1n << BigInt(bits))
    return num
}
