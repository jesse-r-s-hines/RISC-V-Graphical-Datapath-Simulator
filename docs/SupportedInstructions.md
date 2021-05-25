# Supported Instructions
## Arithmetic 
- add
- addi
- sub
- and
- andi
- or
- ori
- xor
- xori
- sll
- slli
- sra
- srai
- srl
- srli
- slt
- slti
- sltiu
- sltu
- lui

## Branch
- beq
- bge
- bgeu
- blt
- bltu
- bne
- jal
- jalr

## Memory
- lb
- lbu
- lh
- lhu
- lw
- sb
- sh
- sw

# Instruction Opcodes Chart
Name  | Format  | funct7  | funct3 | Opcode  |
------|---------|---------|--------|----------
add   | R-type  | 0000000 |  000   | 0110011 |
sub   | R-type  | 0100000 |  000   | 0110011 |
sll   | R-type  | 0000000 |  001   | 0110011 |
slt   | R-type  | 0000000 |  010   | 0110011 |
sltu  | R-type  | 0000000 |  011   | 0110011 |
xor   | R-type  | 0000000 |  100   | 0110011 |
srl   | R-type  | 0000000 |  101   | 0110011 |
sra   | R-type  | 0100000 |  101   | 0110011 |
or    | R-type  | 0000000 |  110   | 0110011 |
and   | R-type  | 0000000 |  111   | 0110011 |
addi  | I-type  |         |  000   | 0010011 |
slti  | I-type  |         |  010   | 0010011 |
sltiu | I-type  |         |  011   | 0010011 |
xori  | I-type  |         |  100   | 0010011 |
ori   | I-type  |         |  110   | 0010011 |
andi  | I-type  |         |  111   | 0010011 |
slli  | I-type  | 0000000 |  001   | 0010011 |
srli  | I-type  | 0000000 |  101   | 0010011 |
srai  | I-type  | 0100000 |  101   | 0010011 |
lb    | I-type  |         |  000   | 0000011 |
lh    | I-type  |         |  001   | 0000011 |
lw    | I-type  |         |  010   | 0000011 |
lbu   | I-type  |         |  100   | 0000011 |
lhu   | I-type  |         |  101   | 0000011 |
jalr  | I-type  |         |  000   | 1100111 |
sb    | S-type  |         |  000   | 0100011 |
sh    | S-type  |         |  001   | 0100011 |
sw    | S-type  |         |  010   | 0100011 |
beq   | SB-type |         |  000   | 1100011 |
bne   | SB-type |         |  001   | 1100011 |
blt   | SB-type |         |  100   | 1100011 |
bge   | SB-type |         |  101   | 1100011 |
bltu  | SB-type |         |  110   | 1100011 |
bgeu  | SB-type |         |  111   | 1100011 |
lui   | U-type  |         |        | 0110111 |
auipc | U-type  |         |        | 0010111 |
jal   | UJ-type |         |        | 1101111 |





