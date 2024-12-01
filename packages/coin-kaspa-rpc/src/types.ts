export type KaspaNetwork = 'mainnet' | 'testnet-10' | 'testnet-11';

export type KaspaKrc20Response<T> = {
  message: string;
  result: T;
};

export type Krc20TokenHolder = {
  address: string;
  amount: string;
};

export type Krc20TokenDetailsWithHolders = {
  tick: string;
  max: string;
  lim: string;
  pre: string;
  to: string;
  dec: string;
  minted: string;
  opScoreAdd: string;
  opScoreMod: string;
  state: string;
  hashRev: string;
  mtsAdd: string;
  holderTotal: string;
  transferTotal: string;
  mintTotal: string;
  holder: Krc20TokenHolder[];
};

export type GetKrc20TokenInfoResponse = Krc20TokenDetailsWithHolders[];
