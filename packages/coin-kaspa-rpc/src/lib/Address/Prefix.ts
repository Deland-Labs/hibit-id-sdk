enum AddressPrefix {
  Mainnet = "kaspa",
  Testnet = "kaspatest",
  Simnet = "kaspasim",
  Devnet = "kaspadev",
  A = "a", // For testing
  B = "b", // For testing
}

class AddressPrefixHelper {
  public static isTest(prefix: AddressPrefix): boolean {
    return prefix === AddressPrefix.A || prefix === AddressPrefix.B;
  }

  public static parse(prefix: string): AddressPrefix {
    switch (prefix) {
      case "kaspa":
        return AddressPrefix.Mainnet;
      case "kaspatest":
        return AddressPrefix.Testnet;
      case "kaspasim":
        return AddressPrefix.Simnet;
      case "kaspadev":
        return AddressPrefix.Devnet;
      case "a":
        return AddressPrefix.A;
      case "b":
        return AddressPrefix.B;
      default:
        throw new Error(`Unknown prefix: ${prefix}`);
    }
  }
}

export { AddressPrefix, AddressPrefixHelper };
