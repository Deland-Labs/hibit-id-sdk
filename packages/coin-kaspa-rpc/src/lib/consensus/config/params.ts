import { validateU8, validateU64, validateU256 } from '../../validator';
import { ForkActivation } from './fork-activation';
import { NetworkId, NetworkType } from '../network';
import { Consensus, DEFAULT_REINDEX_DEPTH, KType } from './constants';
import { Testnet11Bps } from './bps';

/**
 * Class representing the consensus parameters.
 */
class Params {
  dnsSeeders: string[];
  net: NetworkId;
  ghostdagK: KType;
  legacyTimestampDeviationTolerance: bigint;
  newTimestampDeviationTolerance: bigint;
  pastMedianTimeSampleRate: bigint;
  pastMedianTimeSampledWindowSize: bigint;
  targetTimePerBlock: bigint;
  samplingActivation: ForkActivation;
  maxDifficultyTarget: bigint;
  maxDifficultyTargetF64: number;
  difficultySampleRate: bigint;
  sampledDifficultyWindowSize: bigint;
  legacyDifficultyWindowSize: number;
  minDifficultyWindowLen: number;
  maxBlockParents: number;
  mergesetSizeLimit: bigint;
  mergeDepth: bigint;
  finalityDepth: bigint;
  pruningDepth: bigint;
  coinbasePayloadScriptPublicKeyMaxLen: number;
  maxCoinbasePayloadLen: number;
  maxTxInputs: number;
  maxTxOutputs: number;
  maxSignatureScriptLen: number;
  maxScriptPublicKeyLen: number;
  massPerTxByte: bigint;
  massPerScriptPubKeyByte: bigint;
  massPerSigOp: bigint;
  maxBlockMass: bigint;
  storageMassParameter: bigint;
  storageMassActivation: ForkActivation;
  kip10Activation: ForkActivation;
  deflationaryPhaseDaaScore: bigint;
  preDeflationaryPhaseBaseSubsidy: bigint;
  coinbaseMaturity: bigint;
  skipProofOfWork: boolean;
  maxBlockLevel: number;
  pruningProofM: bigint;
  payloadActivation: ForkActivation;

  /**
   * Create a Params instance.
   * @param {string[]} dnsSeeders - List of DNS seeders.
   * @param {NetworkId} net - Network ID.
   * @param {number} ghostdagK - GhostDAG K parameter.
   * @param {bigint} legacyTimestampDeviationTolerance - Legacy timestamp deviation tolerance.
   * @param {bigint} newTimestampDeviationTolerance - New timestamp deviation tolerance.
   * @param {bigint} pastMedianTimeSampleRate - Past median time sample rate.
   * @param {bigint} pastMedianTimeSampledWindowSize - Past median time sampled window size.
   * @param {bigint} targetTimePerBlock - Target time per block.
   * @param {ForkActivation} samplingActivation - Sampling activation.
   * @param {bigint} maxDifficultyTarget - Maximum difficulty target.
   * @param {number} maxDifficultyTargetF64 - Maximum difficulty target as float64.
   * @param {bigint} difficultySampleRate - Difficulty sample rate.
   * @param {number} sampledDifficultyWindowSize - Sampled difficulty window size.
   * @param {number} legacyDifficultyWindowSize - Legacy difficulty window size.
   * @param {number} minDifficultyWindowLen - Minimum difficulty window length.
   * @param {number} maxBlockParents - Maximum block parents.
   * @param {bigint} mergesetSizeLimit - Mergeset size limit.
   * @param {bigint} mergeDepth - Merge depth.
   * @param {bigint} finalityDepth - Finality depth.
   * @param {bigint} pruningDepth - Pruning depth.
   * @param {number} coinbasePayloadScriptPublicKeyMaxLen - Maximum length of coinbase payload script public key.
   * @param {number} maxCoinbasePayloadLen - Maximum coinbase payload length.
   * @param {number} maxTxInputs - Maximum transaction inputs.
   * @param {number} maxTxOutputs - Maximum transaction outputs.
   * @param {number} maxSignatureScriptLen - Maximum signature script length.
   * @param {number} maxScriptPublicKeyLen - Maximum script public key length.
   * @param {bigint} massPerTxByte - Mass per transaction byte.
   * @param {bigint} massPerScriptPubKeyByte - Mass per script public key byte.
   * @param {bigint} massPerSigOp - Mass per signature operation.
   * @param {bigint} maxBlockMass - Maximum block mass.
   * @param {bigint} storageMassParameter - Storage mass parameter.
   * @param {ForkActivation} storageMassActivation - Storage mass activation.
   * @param {ForkActivation} kip10Activation - KIP10 activation.
   * @param {bigint} deflationaryPhaseDaaScore - Deflationary phase DAA score.
   * @param {bigint} preDeflationaryPhaseBaseSubsidy - Pre-deflationary phase base subsidy.
   * @param {bigint} coinbaseMaturity - Coinbase maturity.
   * @param {boolean} skipProofOfWork - Skip proof of work.
   * @param {number} maxBlockLevel - Maximum block level.
   * @param {bigint} pruningProofM - Pruning proof M.
   * @param {ForkActivation} payloadActivation - Payload activation.
   */
  constructor(
    dnsSeeders: string[],
    net: NetworkId,
    ghostdagK: KType,
    legacyTimestampDeviationTolerance: bigint,
    newTimestampDeviationTolerance: bigint,
    pastMedianTimeSampleRate: bigint,
    pastMedianTimeSampledWindowSize: bigint,
    targetTimePerBlock: bigint,
    samplingActivation: ForkActivation,
    maxDifficultyTarget: bigint,
    maxDifficultyTargetF64: number,
    difficultySampleRate: bigint,
    sampledDifficultyWindowSize: bigint,
    legacyDifficultyWindowSize: number,
    minDifficultyWindowLen: number,
    maxBlockParents: number,
    mergesetSizeLimit: bigint,
    mergeDepth: bigint,
    finalityDepth: bigint,
    pruningDepth: bigint,
    coinbasePayloadScriptPublicKeyMaxLen: number,
    maxCoinbasePayloadLen: number,
    maxTxInputs: number,
    maxTxOutputs: number,
    maxSignatureScriptLen: number,
    maxScriptPublicKeyLen: number,
    massPerTxByte: bigint,
    massPerScriptPubKeyByte: bigint,
    massPerSigOp: bigint,
    maxBlockMass: bigint,
    storageMassParameter: bigint,
    storageMassActivation: ForkActivation,
    kip10Activation: ForkActivation,
    deflationaryPhaseDaaScore: bigint,
    preDeflationaryPhaseBaseSubsidy: bigint,
    coinbaseMaturity: bigint,
    skipProofOfWork: boolean,
    maxBlockLevel: number,
    pruningProofM: bigint,
    payloadActivation: ForkActivation
  ) {
    // Validate uint values
    validateU64(legacyTimestampDeviationTolerance, 'legacyTimestampDeviationTolerance');
    validateU64(newTimestampDeviationTolerance, 'newTimestampDeviationTolerance');
    validateU64(pastMedianTimeSampleRate, 'pastMedianTimeSampleRate');
    validateU64(pastMedianTimeSampledWindowSize, 'pastMedianTimeSampledWindowSize');
    validateU64(targetTimePerBlock, 'targetTimePerBlock');
    validateU64(difficultySampleRate, 'difficultySampleRate');
    validateU64(mergesetSizeLimit, 'mergesetSizeLimit');
    validateU64(mergeDepth, 'mergeDepth');
    validateU64(finalityDepth, 'finalityDepth');
    validateU64(pruningDepth, 'pruningDepth');
    validateU8(coinbasePayloadScriptPublicKeyMaxLen, 'coinbasePayloadScriptPublicKeyMaxLen');
    validateU64(massPerTxByte, 'massPerTxByte');
    validateU64(massPerScriptPubKeyByte, 'massPerScriptPubKeyByte');
    validateU64(massPerSigOp, 'massPerSigOp');
    validateU64(maxBlockMass, 'maxBlockMass');
    validateU64(storageMassParameter, 'storageMassParameter');
    validateU64(deflationaryPhaseDaaScore, 'deflationaryPhaseDaaScore');
    validateU64(preDeflationaryPhaseBaseSubsidy, 'preDeflationaryPhaseBaseSubsidy');
    validateU64(coinbaseMaturity, 'coinbaseMaturity');
    validateU64(pruningProofM, 'pruningProofM');
    validateU256(maxDifficultyTarget, 'maxDifficultyTarget');

    this.dnsSeeders = dnsSeeders;
    this.net = net;
    this.ghostdagK = ghostdagK;
    this.legacyTimestampDeviationTolerance = legacyTimestampDeviationTolerance;
    this.newTimestampDeviationTolerance = newTimestampDeviationTolerance;
    this.pastMedianTimeSampleRate = pastMedianTimeSampleRate;
    this.pastMedianTimeSampledWindowSize = pastMedianTimeSampledWindowSize;
    this.targetTimePerBlock = targetTimePerBlock;
    this.samplingActivation = samplingActivation;
    this.maxDifficultyTarget = maxDifficultyTarget;
    this.maxDifficultyTargetF64 = maxDifficultyTargetF64;
    this.difficultySampleRate = difficultySampleRate;
    this.sampledDifficultyWindowSize = sampledDifficultyWindowSize;
    this.legacyDifficultyWindowSize = legacyDifficultyWindowSize;
    this.minDifficultyWindowLen = minDifficultyWindowLen;
    this.maxBlockParents = maxBlockParents;
    this.mergesetSizeLimit = mergesetSizeLimit;
    this.mergeDepth = mergeDepth;
    this.finalityDepth = finalityDepth;
    this.pruningDepth = pruningDepth;
    this.coinbasePayloadScriptPublicKeyMaxLen = coinbasePayloadScriptPublicKeyMaxLen;
    this.maxCoinbasePayloadLen = maxCoinbasePayloadLen;
    this.maxTxInputs = maxTxInputs;
    this.maxTxOutputs = maxTxOutputs;
    this.maxSignatureScriptLen = maxSignatureScriptLen;
    this.maxScriptPublicKeyLen = maxScriptPublicKeyLen;
    this.massPerTxByte = massPerTxByte;
    this.massPerScriptPubKeyByte = massPerScriptPubKeyByte;
    this.massPerSigOp = massPerSigOp;
    this.maxBlockMass = maxBlockMass;
    this.storageMassParameter = storageMassParameter;
    this.storageMassActivation = storageMassActivation;
    this.kip10Activation = kip10Activation;
    this.deflationaryPhaseDaaScore = deflationaryPhaseDaaScore;
    this.preDeflationaryPhaseBaseSubsidy = preDeflationaryPhaseBaseSubsidy;
    this.coinbaseMaturity = coinbaseMaturity;
    this.skipProofOfWork = skipProofOfWork;
    this.maxBlockLevel = maxBlockLevel;
    this.pruningProofM = pruningProofM;
    this.payloadActivation = payloadActivation;
  }

  /**
   * Create Params instance from NetworkType.
   * @param {NetworkType} value - Network type.
   * @returns {Params} Params instance.
   */
  static fromNetworkType(value: NetworkType): Params {
    switch (value) {
      case NetworkType.Mainnet:
        return MAINNET_PARAMS;
      case NetworkType.Testnet:
        return TESTNET_PARAMS;
      case NetworkType.Devnet:
        return DEVNET_PARAMS;
      case NetworkType.Simnet:
        return SIMNET_PARAMS;
      default:
        throw new Error(`Unsupported NetworkType: ${value}`);
    }
  }

  /**
   * Create Params instance from NetworkId.
   * @param {NetworkId} value - Network ID.
   * @returns {Params} Params instance.
   */
  static fromNetworkId(value: NetworkId): Params {
    switch (value.networkType) {
      case NetworkType.Mainnet:
        return MAINNET_PARAMS;
      case NetworkType.Testnet:
        switch (value.suffix) {
          case 10:
            return TESTNET_PARAMS;
          case 11:
            return TESTNET11_PARAMS;
          default:
            throw new Error(`Testnet suffix ${value.suffix} is not supported`);
        }
      case NetworkType.Devnet:
        return DEVNET_PARAMS;
      case NetworkType.Simnet:
        return SIMNET_PARAMS;
      default:
        throw new Error(`Unsupported NetworkType: ${value.networkType}`);
    }
  }
}

const MAINNET_PARAMS = new Params(
  [
    'mainnet-dnsseed-1.kaspanet.org',
    'mainnet-dnsseed-2.kaspanet.org',
    'dnsseed.cbytensky.org',
    'seeder1.kaspad.net',
    'seeder2.kaspad.net',
    'seeder3.kaspad.net',
    'seeder4.kaspad.net',
    'kaspadns.kaspacalc.net',
    'n-mainnet.kaspa.ws',
    'dnsseeder-kaspa-mainnet.x-con.at',
    'ns-mainnet.kaspa-dnsseeder.net'
  ],
  NetworkId.new(NetworkType.Mainnet),
  Consensus.LEGACY_DEFAULT_GHOSTDAG_K,
  BigInt(Consensus.LEGACY_TIMESTAMP_DEVIATION_TOLERANCE),
  BigInt(Consensus.NEW_TIMESTAMP_DEVIATION_TOLERANCE),
  BigInt(Consensus.PAST_MEDIAN_TIME_SAMPLE_INTERVAL),
  BigInt(Consensus.MEDIAN_TIME_SAMPLED_WINDOW_SIZE),
  1000n,
  ForkActivation.never(),
  Consensus.MAX_DIFFICULTY_TARGET,
  Consensus.MAX_DIFFICULTY_TARGET_AS_F64,
  BigInt(Consensus.DIFFICULTY_WINDOW_SAMPLE_INTERVAL),
  Consensus.DIFFICULTY_SAMPLED_WINDOW_SIZE,
  Consensus.LEGACY_DIFFICULTY_WINDOW_SIZE,
  Consensus.MIN_DIFFICULTY_WINDOW_LEN,
  10,
  BigInt(Consensus.LEGACY_DEFAULT_GHOSTDAG_K) * 10n,
  3600n,
  86400n,
  185798n,
  150,
  204,
  1_000_000_000,
  1_000_000_000,
  1_000_000_000,
  1_000_000_000,
  1n,
  10n,
  1000n,
  500_000n,
  BigInt(DEFAULT_REINDEX_DEPTH),
  ForkActivation.never(),
  ForkActivation.never(),
  15778800n - 259200n,
  50000000000n,
  100n,
  false,
  225,
  1000n,
  ForkActivation.never()
);

const TESTNET_PARAMS = new Params(
  ['seeder1-testnet.kaspad.net', 'dnsseeder-kaspa-testnet.x-con.at', 'ns-testnet10.kaspa-dnsseeder.net'],
  NetworkId.withSuffix(NetworkType.Testnet, 10),
  Consensus.LEGACY_DEFAULT_GHOSTDAG_K,
  BigInt(Consensus.LEGACY_TIMESTAMP_DEVIATION_TOLERANCE),
  BigInt(Consensus.NEW_TIMESTAMP_DEVIATION_TOLERANCE),
  BigInt(Consensus.PAST_MEDIAN_TIME_SAMPLE_INTERVAL),
  BigInt(Consensus.MEDIAN_TIME_SAMPLED_WINDOW_SIZE),
  1000n,
  ForkActivation.never(),
  Consensus.MAX_DIFFICULTY_TARGET,
  Consensus.MAX_DIFFICULTY_TARGET_AS_F64,
  BigInt(Consensus.DIFFICULTY_WINDOW_SAMPLE_INTERVAL),
  Consensus.DIFFICULTY_SAMPLED_WINDOW_SIZE,
  Consensus.LEGACY_DIFFICULTY_WINDOW_SIZE,
  Consensus.MIN_DIFFICULTY_WINDOW_LEN,
  10,
  BigInt(Consensus.LEGACY_DEFAULT_GHOSTDAG_K) * 10n,
  3600n,
  86400n,
  185798n,
  150,
  204,
  1_000_000_000,
  1_000_000_000,
  1_000_000_000,
  1_000_000_000,
  1n,
  10n,
  1000n,
  500_000n,
  DEFAULT_REINDEX_DEPTH,
  ForkActivation.never(),
  ForkActivation.never(),
  15778800n - 259200n,
  50000000000n,
  100n,
  false,
  250,
  1000n,
  ForkActivation.never()
);

const TESTNET11_PARAMS = new Params(
  [
    'seeder1-testnet-11.kaspad.net',
    'n-testnet-11.kaspa.ws',
    'dnsseeder-kaspa-testnet11.x-con.at',
    'ns-testnet11.kaspa-dnsseeder.net'
  ],
  NetworkId.withSuffix(NetworkType.Testnet, 11),
  Testnet11Bps.ghostDagK(),
  BigInt(Consensus.LEGACY_TIMESTAMP_DEVIATION_TOLERANCE),
  BigInt(Consensus.NEW_TIMESTAMP_DEVIATION_TOLERANCE),
  BigInt(Consensus.PAST_MEDIAN_TIME_SAMPLE_INTERVAL),
  BigInt(Consensus.MEDIAN_TIME_SAMPLED_WINDOW_SIZE),
  Testnet11Bps.targetTimePerBlock(),
  ForkActivation.always(),
  Consensus.MAX_DIFFICULTY_TARGET,
  Consensus.MAX_DIFFICULTY_TARGET_AS_F64,
  Testnet11Bps.difficultyAdjustmentSampleRate(),
  Consensus.DIFFICULTY_SAMPLED_WINDOW_SIZE,
  Consensus.LEGACY_DIFFICULTY_WINDOW_SIZE,
  Consensus.MIN_DIFFICULTY_WINDOW_LEN,
  Testnet11Bps.maxBlockParents(),
  Testnet11Bps.mergesetSizeLimit(),
  Testnet11Bps.mergeDepthBound(),
  Testnet11Bps.finalityDepth(),
  Testnet11Bps.pruningDepth(),
  150,
  204,
  10_000,
  10_000,
  1_000_000,
  1_000_000,
  1n,
  10n,
  1000n,
  500_000n,
  DEFAULT_REINDEX_DEPTH,
  ForkActivation.always(),
  ForkActivation.never(),
  Testnet11Bps.deflationaryPhaseDaaScore(),
  Testnet11Bps.preDeflationaryPhaseBaseSubsidy(),
  Testnet11Bps.coinbaseMaturity(),
  false,
  250,
  Testnet11Bps.pruningProofM(),
  ForkActivation.never()
);

const SIMNET_PARAMS = new Params(
  [],
  NetworkId.new(NetworkType.Simnet),
  Testnet11Bps.ghostDagK(),
  BigInt(Consensus.LEGACY_TIMESTAMP_DEVIATION_TOLERANCE),
  BigInt(Consensus.NEW_TIMESTAMP_DEVIATION_TOLERANCE),
  BigInt(Consensus.PAST_MEDIAN_TIME_SAMPLE_INTERVAL),
  BigInt(Consensus.MEDIAN_TIME_SAMPLED_WINDOW_SIZE),
  Testnet11Bps.targetTimePerBlock(),
  ForkActivation.always(),
  Consensus.MAX_DIFFICULTY_TARGET,
  Consensus.MAX_DIFFICULTY_TARGET_AS_F64,
  Testnet11Bps.difficultyAdjustmentSampleRate(),
  Consensus.DIFFICULTY_SAMPLED_WINDOW_SIZE,
  Consensus.LEGACY_DIFFICULTY_WINDOW_SIZE,
  Consensus.MIN_DIFFICULTY_WINDOW_LEN,
  Math.max(Testnet11Bps.maxBlockParents(), 64),
  Testnet11Bps.mergesetSizeLimit(),
  Testnet11Bps.mergeDepthBound(),
  Testnet11Bps.finalityDepth(),
  Testnet11Bps.pruningDepth(),
  150,
  204,
  10_000,
  10_000,
  1_000_000,
  1_000_000,
  1n,
  10n,
  1000n,
  500_000n,
  DEFAULT_REINDEX_DEPTH,
  ForkActivation.always(),
  ForkActivation.never(),
  Testnet11Bps.deflationaryPhaseDaaScore(),
  Testnet11Bps.preDeflationaryPhaseBaseSubsidy(),
  Testnet11Bps.coinbaseMaturity(),
  true,
  250,
  Testnet11Bps.pruningProofM(),
  ForkActivation.never()
);

const DEVNET_PARAMS = new Params(
  [],
  NetworkId.new(NetworkType.Devnet),
  Consensus.LEGACY_DEFAULT_GHOSTDAG_K,
  BigInt(Consensus.LEGACY_TIMESTAMP_DEVIATION_TOLERANCE),
  BigInt(Consensus.NEW_TIMESTAMP_DEVIATION_TOLERANCE),
  BigInt(Consensus.PAST_MEDIAN_TIME_SAMPLE_INTERVAL),
  BigInt(Consensus.MEDIAN_TIME_SAMPLED_WINDOW_SIZE),
  1000n,
  ForkActivation.never(),
  Consensus.MAX_DIFFICULTY_TARGET,
  Consensus.MAX_DIFFICULTY_TARGET_AS_F64,
  BigInt(Consensus.DIFFICULTY_WINDOW_SAMPLE_INTERVAL),
  Consensus.DIFFICULTY_SAMPLED_WINDOW_SIZE,
  Consensus.LEGACY_DIFFICULTY_WINDOW_SIZE,
  Consensus.MIN_DIFFICULTY_WINDOW_LEN,
  10,
  BigInt(Consensus.LEGACY_DEFAULT_GHOSTDAG_K) * 10n,
  3600n,
  86400n,
  185798n,
  150,
  204,
  1_000_000_000,
  1_000_000_000,
  1_000_000_000,
  1_000_000_000,
  1n,
  10n,
  1000n,
  500_000n,
  DEFAULT_REINDEX_DEPTH,
  ForkActivation.never(),
  ForkActivation.never(),
  15778800n - 259200n,
  50000000000n,
  100n,
  false,
  250,
  1000n,
  ForkActivation.never()
);

export { Params, MAINNET_PARAMS, TESTNET_PARAMS, TESTNET11_PARAMS, SIMNET_PARAMS, DEVNET_PARAMS };
