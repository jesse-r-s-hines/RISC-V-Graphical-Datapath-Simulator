/** Converting numbers and strings between different numeric representations */

import { Bits, fromTwosComplement, toTwosComplement } from "utils/bits"

export type Radix = "hex" | "bin" | "signed" | "unsigned"

/**
 * Takes a string an converts into into a positive bigint with the given radix. Throw exception if fails.
 * Strings with "0x" and "0b" prefixes will be interpreted as hex and binary regardless of radix.
 * @param bits the number of bits the output will be. 
 */
export function parseInt(str: string, radix: Radix, bits: number): bigint {
    let num: bigint
    try {
        if (radix == "hex") {
            num = BigInt( /^0[xb]/.test(str) ? str : `0x${str}` )
        } else if (radix == "bin") {
            num = BigInt( /^0[xb]/.test(str) ? str : `0b${str}` )
        } else if (radix == "signed") {
            num =  toTwosComplement(BigInt(str), bits)
        } else { // (radix == "unsigned")
            num =  BigInt(str)
        }
        if (num < 0n || num >= 2n ** BigInt(bits)) throw Error() // just trigger catch.
    } catch { // Int to big or parsing failed
        throw Error(`"${str}" is invalid. Expected a ${bits} bit ${radix} integer.`)
    }
    return num
}

/**
 * Outputs a string from an positive bigint or Bits with the radix.
 * @param bits the number of bits the output will be. If omitted and you pass a Bits, it 
 *             will get the size from the bits, otherwise it will default to 32.
 */
export function intToStr(num: bigint|Bits, radix: string, bits?: number): string {
    if (num instanceof Array) {
        bits = bits ?? num.length
        num = Bits.toInt(num)
    } else {
        bits = bits ?? 32
    }

    if (radix == "hex") {
        return "0x" + num.toString(16).toUpperCase().padStart(Math.ceil(bits / 4), "0")
    } else if (radix == "bin") {
        return "0b" + num.toString(2).padStart(bits, "0")
    } else if (radix == "signed") {
        return fromTwosComplement(num, bits).toString()
    } else { // (radix == "unsigned")
        return num.toString()
    }
}

