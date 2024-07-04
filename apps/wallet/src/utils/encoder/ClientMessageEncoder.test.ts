import BigNumber from 'bignumber.js';
import { Ex3BigInteger } from '../../apis/models';
import { CborDataFactory, cborIndex } from './ClientMessageEncoder';

class TestCborData {
  @cborIndex(0)
  public value1!: Ex3BigInteger;
  @cborIndex(1)
  public value2!: string;
}

class ParentCborData {
  @cborIndex(0)
  public value1!: TestCborData;
  @cborIndex(1)
  public value2!: string;
}

class ParentCborData2 {
  @cborIndex(0)
  public value1?: TestCborData;
  @cborIndex(1)
  public value2!: string;
}

test('ParentCborData', () => {
  const testCborData = new TestCborData();
  testCborData.value2 = '100.26';
  testCborData.value1 = new BigNumber(10026);
  const parentData = new ParentCborData();
  parentData.value1 = testCborData;
  parentData.value2 = 'value2';
  const result = CborDataFactory.createCborArray(parentData);
  expect(result).toEqual([[new BigNumber(10026), '100.26'], 'value2']);
});


test('null data', () => {
  const parentData = new ParentCborData2();
  parentData.value2 = 'value2';
  const result = CborDataFactory.createCborArray(parentData);
  expect(result).toEqual([undefined, 'value2']);
});
