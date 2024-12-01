class SubnetworkConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubnetworkConversionError';
  }
}

export { SubnetworkConversionError };
