main:
    # la a0, array
    # li a1, 100
    jal ra, sort

    j quit

swap:
    slli t1, a1, 2 # reg t1 = k * 4
    add t1, a0, t1 # reg t1 = v + (k * 4)
    lw t0, 0(t1) # reg t0 (temp) = v[k]
    lw t2, 4(t1) # reg t2 = v[k + 1]
    sw t2, 0(t1) # v[k] = reg t2
    sw t0, 4(t1) # v[k + 1] = reg t0 (temp)
    jalr x0, 0(ra) # return to calling routine

# paramaters: a0: address of array, a1: length of array
sort:
    # Saving registers 
    addi sp, sp, -20 # make room on stack for 5 registers
    sw ra, 16(sp) # save return address
    sw s6, 12(sp) # save s6
    sw s5, 8(sp) # save s5
    sw s4, 4(sp) # save s4
    sw s3, 0(sp) # save s3

    # Procedure Body
    mv s5, a0 # copy parameter v into s5 (address of array)
    mv s6, a1 # copy parameter n into s6 (length of array)

    li s3, 0 # i = 0
    for1tst:
    bge s3, s6, exit1 # go to exit1 if i >= n
        addi s4, s3, -1 # j = i - 1
        for2tst:
        blt s4, x0, exit2 # go to exit2 if j < 0
            slli t0, s4, 2 # t0 = j * 4
            add t0, s5, t0 # t0 = v + (j * 4)
            lw t1, 0(t0) # t1 = v[j]
            lw t2, 4(t0) # t2 = v[j + 1]
            bge t2, t1, exit2 # go to exit2 if t1 < t2

            mv a0, s5 # first swap parameter is v
            mv a1, s4 # second swap parameter is j
            jal ra, swap # call swap
        addi s4, s4, -1 # j -= 1
        j for2tst # go to for2tst
        exit2:
    addi s3, s3, 1 # i += 1
    j for1tst # go to for1tst
    exit1:

    # Restoring registers
    lw s3, 0(sp) # restore s3
    lw s4, 4(sp) # restore s4
    lw s5, 8(sp) # restore s5
    lw s6, 12(sp) # restore s6
    lw ra, 16(sp) # restore return address
    addi sp, sp, 20 # restore stack pointer

    jalr x0, 0(ra) # procedure return.

quit:
