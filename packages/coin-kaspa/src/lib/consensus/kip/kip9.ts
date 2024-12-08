/**
 * Temp enum for the transition phases of KIP9
 */
enum Kip9Version {
  /**
   * Initial KIP9 mass calculation, w/o the relaxed formula and summing storage mass and compute mass
   */
  Alpha,

  /**
   * Currently proposed KIP9 mass calculation, with the relaxed formula (for the cases `|O| = 1 OR |O| <= |I| <= 2`),
   * and using a maximum operator over storage and compute mass
   */
  Beta
}

export { Kip9Version };
