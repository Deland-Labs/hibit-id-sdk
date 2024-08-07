import { expect, test } from 'vitest'
import { objToQuery, queryToObj } from '.'

test('obj to query', () => {
  const obj = {
    a: 1,
    c: '3',
    e: ['5', '6'],
    f: { g: 7, h: 8 },
  }
  expect(objToQuery(obj)).toBe(
    'a=1&c=3&e=%5B%225%22%2C%226%22%5D&f=%7B%22g%22%3A7%2C%22h%22%3A8%7D'
  )
})

test('query to obj', () => {
  const query = 'a=1&c=3&e=%5B%225%22%2C%226%22%5D&f=%7B%22g%22%3A7%2C%22h%22%3A8%7D'
  expect(queryToObj(query)).toStrictEqual({
    a: '1',
    c: '3',
    e: ['5', '6'],
    f: { g: 7, h: 8 },
  })
})
