# RISC-V Graphical Datapath Simulator

This is a web-based graphical simulator for a simple 32-bit, single-cycle implementation of RISC-V. The simulator lets you step through a RISC-V program and view the current values of wires and components on the datapath and explanations of what each of the datapath components do. This is very useful for teaching or learning about the RISC-V datapath. All the 32-bit integer instructions are supported except the syscall and concurrency related instructions. The datapath is closely based on the design described in *Computer Organization and Design RISC-V Edition*.

## Online Demo
![Screenshot](docs/Screenshot.png)

The simulator is available at https://jesse-r-s-hines.github.io/RISC-V-Graphical-Datapath-Simulator.

## Building

The project is written in [TypeScript](https://www.typescriptlang.org) and [React](https://react.dev) and uses [webpack](https://webpack.js.org) to bundle the project.

If you want to build the project yourself, you'll need [Node and npm](https://nodejs.org). Then run
```
npm install
npm run serve
```
which will serve the project on localhost.

## Testing
The tests use [Mocha](https://mochajs.org). Just run
```
npm test
```
