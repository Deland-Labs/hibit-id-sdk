enum AddressVersion {
  PubKey = 0,
  PubKeyECDSA = 1,
  ScriptHash = 8,
}

class AddressVersionHelper {
  public static publicKeyLen(version: AddressVersion): number {
    switch (version) {
      case AddressVersion.PubKey:
        return 32;
      case AddressVersion.PubKeyECDSA:
        return 33;
      case AddressVersion.ScriptHash:
        return 32;
      default:
        throw new Error(`Unknown version: ${version}`);
    }
  }
}

export { AddressVersion, AddressVersionHelper };
