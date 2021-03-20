import { expect } from 'chai';
import { sum } from '../src/demo';

describe('Sum', () => {
  it("1 + 2 = 3", () => {
    expect(sum(1, 2)).to.equal(3);
  })
});