import { Radix } from "utils/radix"

/**
 * Stores a snapshot of code, register, and memory settings
 */
export interface Example {
    name: string,
    description: string,
    url?: string,
    code?: string,
    memory?: string,
    registers?: Record<number, string>
    dataMemRadix?: Radix,
    dataMemWordSize?: number,
    regFileRadix?: Radix,
}

export const examples: Example[] = [
    {
        name: "Blank",
        description: "Clear the code, registers, and memory",
    }, {
        name: "Bubble Sort",
        description: "The bubble sort algorithm",
        url: require("assets/examples/bubbleSort.s"),
        dataMemRadix: "signed", regFileRadix: "signed",
        memory: [7, 3, 1, 5, 1, 5, 10, 0, -5, -2].join("\n"),
        registers: {10: "0", 11: "10"},
    }, {
        name: "Selection Sort",
        description: "The selection sort algorithm",
        url: require("assets/examples/selectionSort.s"),
        dataMemRadix: "signed", regFileRadix: "signed",
        memory: [7, 3, 1, 5, 1, 5, 10, 0, -5, -2].join("\n"),
        registers: {10: "0", 11: "10"},
    }
]
