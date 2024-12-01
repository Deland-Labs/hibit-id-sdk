import { Buffer } from 'buffer';

const TransactionHash = Buffer.from('TransactionHash');
const TransactionID = Buffer.from('TransactionID');
const TransactionSigning = Buffer.from('TransactionSigningHash');
const Block = Buffer.from('BlockHash');
const ProofOfWork = Buffer.from('ProofOfWorkHash');
const MerkleBranch = Buffer.from('MerkleBranchHash');
const MuHashElement = Buffer.from('MuHashElement');
const MuHashFinalize = Buffer.from('MuHashFinalize');
const PersonalMessageSigning = Buffer.from('PersonalMessageSigningHash');

export {
  TransactionHash,
  TransactionID,
  TransactionSigning,
  Block,
  ProofOfWork,
  MerkleBranch,
  MuHashElement,
  MuHashFinalize,
  PersonalMessageSigning
};
