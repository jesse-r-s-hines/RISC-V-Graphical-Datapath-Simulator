# A function that implements the selection sort algorithm.
# Based on https://github.com/cgyurgyik/riscv-assembly/blob/master/selection_sort.s

MAIN:
    # li a0, 0 # Base of array
    # li a1, 10 # Length of array
    jal ra, SEL_SORT

    j EXIT

# Takes a0 (base of array) and a1 (length of array)
SEL_SORT:
addi sp, sp, -8
sw ra, 4(sp)
sw s0, 0(sp)

addi t0, x0, 0 # i
addi t1, x0, 0 # j
addi t2, x0, 0 # min_index

addi s0, a1, 0 # store n.
addi a1, a1, -1 # n-1
UNSORTED_ARRAY_BOUNDARY_LOOP:
beq t0, a1, END_UNSORTED_ARRAY_BOUNDARY_LOOP # (while i < (n-1))

addi t2, t0, 0   # min_index = i
addi t1, t0, 1   # j = i + 1

SUBARRAY_LOOP:
beq t1, s0, END_SUBARRAY_LOOP # (while j < n)

slli t5, t1, 2  # j * sizeof(int)
add t6, a0, t5
lw t4, 0(t6)    # Load arr[j]

slli t5, t2, 2  # min_index * sizeof(int)
add t6, a0, t5  # arr[min_index]
lw t3, 0(t6)    # Load arr[min_index] 

blt t3, t4, MIN_REMAINS_SAME # if (arr[min_index] < arr[j]), don't change the min.
addi t2, t1,0   # min_index = j
MIN_REMAINS_SAME:

addi t1, t1, 1  # j = j + 1
beq x0, x0, SUBARRAY_LOOP
END_SUBARRAY_LOOP:

slli t5, t2, 2    # min_index * sizeof(int)
add t6, a0, t5    # arr[min_index]
lw t3, 0(t6)      # Load arr[min_index]  

slli t1, t0, 2    # i * sizeof(int)
add t1, t1, a0    # arr[i] 
lw t4, 0(t1)      # Load arr[i]

sw t3, 0(t1)
sw t4, 0(t6)      # swap(&arr[min_index], &arr[i])

addi t0, t0, 1 # i = i + 1
beq x0, x0, UNSORTED_ARRAY_BOUNDARY_LOOP
END_UNSORTED_ARRAY_BOUNDARY_LOOP: 

lw s0, 0(sp)
lw ra, 4(sp)
addi sp, sp, 8
jalr x0, 0(ra)

EXIT:
