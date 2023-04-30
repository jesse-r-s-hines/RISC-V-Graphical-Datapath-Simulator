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
 * Make Bits from an string of 0 and 1s. Will ignore _ and spaces in the string (so you can use them as spacers)
 * The string should be given in MSB 0 order, i.e. most significant bit first.
 * Eg. `Bits.from("1010")` represents 10
 * @param arr The array to convert
 */
export function Bits(str: string): Bits

/**
 * Converts a number to an array of bits.
 * @param num The number or bigint to convert into bits.
 * @param length The number of bits in the array.
 * @param signed Whether the bits should be signed or not. Defaults to false.
 */
export function Bits(num: number|bigint, length: number, signed?: boolean): Bits

export function Bits(src: Bit[]|string|number|bigint, length?: number, signed?: boolean): Bits {
    if (typeof src == "object") {
        if (length != undefined || signed != undefined) throw Error("Invalid arguments to Bits()")
        return fromArray(src)
    } else if (typeof src == "string") {
        if (length != undefined || signed != undefined) throw Error("Invalid arguments to Bits()")
        return fromString(src)
    } else if (typeof src == "bigint" || typeof src == "number") {
        if (length == undefined) throw Error("Invalid arguments to Bits()")
        return fromInt(src, length, signed)
    } else {
        throw Error("Invalid arguments to Bits()")
    }
}

/** A Template tag which will take a string and return a Bits. */
export function b(strings: TemplateStringsArray) {
    return Bits(strings[0])
}

// Private methods to create Bits
function fromArray(arr: Bit[]): Bits {
    return arr.slice().reverse()
}

function fromString(str: string): Bits {
    if (!str.match(/^[01 _]*$/)) throw Error(`Invalid bit string "${str}"`)
    str = str.replace(/[ _]/g, "") // ignore " " and "_"
    return [...str].map(b => Number(b)).reverse()
}

function fromInt(num: number|bigint, length: number, signed = false): Bits {
    if (typeof num == "number") num = BigInt(num)
    const len =  BigInt(length)
    const [a, b] = signed ? [-(2n**(len-1n)), 2n**(len-1n) - 1n] : [0, 2n**len - 1n]
    if (num < a || num > b) throw Error(`${num} is invalid. Expected a ${signed ? "" : "un"}signed integer that fits in ${length} bits.`)

    const bits = Array(length)
    for (let i = 0; i < length; i++) {
        bits[i] = Number(num & 0x1n) // Least Significant Bit 0
        num = num >> 1n
    }
    return bits
}

export namespace Bits {
    /**
     * Converts a Bits to a bigint
     * @param bits The bits to convert to an int
     * @param signed Whether the bits should be interpreted signed or not. Defaults to false.
     */
    export function toInt(bits: Bits, signed = false): bigint {
        const negative = (signed && bits[bits.length - 1])

        if (negative) bits = bits.map(b => +!b) // two's complement, +1 later

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
    export function toNumber(bits: Bits, signed = false): number {
        return Number(Bits.toInt(bits, signed))
    }

    /**
     * Extends a Bits to the given size.
     * @param size the size to extend to
     * @param signed if True, will sign extend
     */
     export function extended(bits: Bits, size: number, signed = false): Bits {
        const sign = signed ? bits[bits.length - 1] : 0 // sign bit
        const extend = Array(size - bits.length).fill(sign)
        return bits.concat(extend)
    }

    /** Converts a bits to a Most Significant Bit 0 order */
    export function msb0(bits: Bits): Bit[] {
        return bits.slice().reverse()
    }

    export function toString(bits: Bits): string {
        return Bits.msb0(bits).join("")
    }

    /** Return true if the two Bits are identical. You can also compare against a string representation of the Bits */
    export function equal(a: Bits|string, b: Bits|string) {
        if (typeof a != "string") a = Bits.toString(a)
        if (typeof b != "string") b = Bits.toString(b)
        return a == b
    }

    /** Concatenates multiple bits */
    export function join(...arr: (Bits|Bit)[]): Bits {
        return Bits([]).concat(...arr.reverse())
    }
}

/**
 * Converts an unsigned int to a signed one.
 * @param bits The number of bits the int should be. Default 32.
 */
export function fromTwosComplement(num: bigint, bits = 32): bigint {
    // ~num + 1 doesn't work because of how Javscript does ~
    const bitsB = BigInt(bits)
    if (num >= (1n << (bitsB - 1n))) num -= (1n << bitsB) // interpret as two's complement
    return num
}

/**
 * Converts an signed int to an unsigned one.
 * @param bits The number of bits the int should be. Default 32.
 */
export function toTwosComplement(num: bigint, bits = 32): bigint {
    if (num < 0) num += (1n << BigInt(bits))
    return num
}
