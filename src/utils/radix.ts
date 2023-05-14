/** Converting numbers and strings between different numeric representations */

import { Bits, fromTwosComplement, toTwosComplement } from "utils/bits"

export type Radix = "hex" | "bin" | "signed" | "unsigned"

/**
 * Takes a string an converts into into a positive bigint with the given radix. Throw exception if fails.
 * Strings with "0x" and "0b" prefixes will be interpreted as hex and binary regardless of radix.
 * @param length the number of bits the output will be. 
 */
export function parseInt(str: string, radix: Radix, length: number): bigint {
    let num: bigint
    try {
        if (radix == "hex") {
            num = BigInt( /^0[xb]/.test(str) ? str : `0x${str}` )
        } else if (radix == "bin") {
            num = BigInt( /^0[xb]/.test(str) ? str : `0b${str}` )
        } else if (radix == "signed") {
            num =  toTwosComplement(BigInt(str), length)
        } else { // (radix == "unsigned")
            num =  BigInt(str)
        }
        if (num < 0n || num >= 2n ** BigInt(length)) throw Error() // just trigger catch.
    } catch { // Int to big or parsing failed
        throw Error(`"${str}" is invalid. Expected a ${length} bit ${radix} integer.`)
    }
    return num
}

/**
 * Outputs a string from an positive bigint or Bits with the radix.
 * TODO: Move into bits.ts
 * @param length the number of bits the output will be. If omitted and you pass a Bits, it will get the size from the
 *               bits, otherwise it will default to 32.
 */
export function intToStr(num: bigint|Bits, radix: string, length?: number): string {
    if (num instanceof Bits) {
        length = length ?? num.length
        num = num.toInt()
    } else {
        length = length ?? 32
    }

    if (radix == "hex") {
        return "0x" + num.toString(16).toUpperCase().padStart(Math.ceil(length / 4), "0")
    } else if (radix == "bin") {
        return "0b" + num.toString(2).padStart(length, "0")
    } else if (radix == "signed") {
        return fromTwosComplement(num, length).toString()
    } else { // (radix == "unsigned")
        return num.toString()
    }
}
