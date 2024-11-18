import { Radix } from "utils/bits"

/**
 * Stores a snapshot of code, register, and memory settings
 */
export interface SimSetup {
    code?: string,
    memory?: string,
    registers?: Record<number, string>
    memoryRadix?: Radix,
    memoryWordSize?: number,
    registerRadix?: Radix,
}

export interface Example {
    name: string,
    description: string,
    url: string,
}

export const examples: Example[] = [
    {
        name: "Bubble Sort",
        description: "The bubble sort algorithm",
        url: require("assets/examples/bubbleSort.json"),
    }, {
        name: "Selection Sort",
        description: "The selection sort algorithm",
        url: require("assets/examples/selectionSort.json"),
    }
]
