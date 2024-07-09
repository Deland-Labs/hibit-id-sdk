export const objToQuery = <T extends object>(obj: T, delimiter: string = '&') => {
  return Object.entries(obj)
    .map(([key, value]) => `${key}=${encodeURIComponent(JSON.stringify(value))}`)
    .join(delimiter)
}

export const queryToObj = <T extends object>(query: string, delimiter: string = '&') => {
  return Object.fromEntries(
    query
      .split(delimiter)
      .map((str) => str.split('='))
      .map(([key, value]) => [key, JSON.parse(decodeURIComponent(value))])
  ) as T
}
