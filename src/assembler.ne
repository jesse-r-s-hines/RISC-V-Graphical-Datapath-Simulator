
@{%
const moo = require("moo") // Have to use require instead of import here to get webpack to work

const lexer = moo.compile({
    WS:      {match: /[ \t]+/, value: x => ""},
    newline: {match: '\n', lineBreaks: true},
    comment: {match: /#.*?$/, value: x => ""},
    number:  /0b[01]+|0x[0-9a-fA-F]+|[+-]?[0-9]+/,
    identifier: /[a-zA-Z_][a-zA-Z_0-9]*/,
    symbol: [",", "(", ")", ":"],
});

// Modify the next method to remove any token with a null value.
const mooNext = lexer.next;
lexer.next = () => {
    let tok;
    while ((tok = mooNext.call(lexer)) && tok.value === "") {}
    return tok;
};

const op = ([[o]]) => o.text
%}
@lexer lexer

program -> line {% id %} | line %newline program {% ([l, _, p]) => [...l, ...p] %}
# split labels out as a separate "line"
line -> (label ":"):? instr:? %comment:? {% ([l, i, c]) => [l ? {type: "label", label: l[0]} : null, i].filter(s => s) %}

instr -> (int_instr | imm_instr | branch_instr | jump_instr | lui_instr | displacement_instr | store_instr) {% ([[i], n]) => i %}

# add x5, x6, x7  # R-type
int_instr -> int_op reg "," reg "," reg {% ([i, rd, , rs1, , rs2]) => ({instr: i, rd: rd, rs1: rs1, rs2: rs2, type: "R"}) %}
int_op -> ("add" | "sub" | "and" | "or" | "xor" | "sll" | "sra" | "srl" | "slt" | "sltu") {% op %}

# addi x5, x6, 1  # I-type
imm_instr -> imm_op reg "," reg "," num {% ([i, rd, , rs1, , imm]) => ({instr: i, rd: rd, rs1: rs1, imm: imm, type: "I"}) %}
imm_op -> ("addi" | "andi" | "ori" | "xori" | "slli" | "srai" | "srli" | "slti" | "sltiu") {% op %}

# beq x5, x28, label  # SB-type
branch_instr -> branch_op reg "," reg "," label  {% ([i, rs1, , rs2, , label]) => ({instr: i, rs1: rs1, rs2: rs2, label: label, type: "SB"}) %}
branch_op -> ("beq" | "bge" | "bgeu" | "blt" | "bltu" | "bne") {% op %}

# "jal x1, label" or "jal label"  # UJ-type 
jump_instr ->
    "jal" reg "," label {% ([i, rd, , label]) => ({instr: "jal", rd: rd, label: label, type: "UJ"}) %} |
    "jal" label {% ([i, label]) => ({instr: "jal", rd: "ra", label: label, type: "UJ"}) %} |
    "j" label {% ([i, label]) => ({instr: "jal", rd: "x0", label: label, type: "UJ"}) %}

# lui x28, 100000  # U-type
lui_instr -> lui_op reg "," num {% ([i, rd, , imm]) => ({instr: i, rd: rd, imm: imm, type: "U"}) %}
lui_op -> ("lui") {% op %}

# lw x7, 0(gp)  # I-type
displacement_instr -> 
    displacement_op reg "," num "(" reg ")"  {% ([i, rd, , imm, , rs1, ]) => ({instr: i, rd: rd, rs1: rs1, imm: imm, type: "I"}) %}
    # displacement_op reg "," num  {% ([i, rd, , imm]) => ({instr: i, rd: rd, rs1: "zero", imm: imm, type: "I"}) %} |
    # displacement_op reg "," "(" reg ")"  {% ([i, rd, , , rs1, ]) => ({instr: i, rd: rd, rs1: rs1, imm: 0, type: "I"}) %}
displacement_op -> ("lb" | "lbu" | "lh" | "lhu" | "lw" | "jalr") {% op %}

# sw x7, 0(gp)  # S-type
store_instr ->
    store_op reg "," num "(" reg ")" {% ([i, rs2, , imm, , rs1, ]) => ({instr: i, rs1: rs1, rs2: rs2, imm: imm, type: "S"}) %}
    # store_op reg "," num {% ([i, rs2, , imm]) => ({instr: i, rs1: "zero", rs2: rs2, imm: imm, type: "S"}) %} |
    # store_op reg "," "(" reg ")" {% ([i, rs2, , , rs1, ]) => ({instr: i, rs1: rs1, rs2: rs2, imm: 0, type: "S"}) %}
store_op -> ("sb" | "sh" | "sw") {% op %}

label -> %identifier {% ([l]) => l.text %}
reg -> %identifier {% ([r]) => r.text %}
num -> %number {% ([n]) => Number(n) %}


