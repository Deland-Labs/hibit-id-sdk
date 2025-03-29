// Default TRC20 ABI, from mainnet USDT: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
export const TRC20_DEFAULT_ABI = [
  {
    outputs: [
      {
        type: 'string'
      }
    ],
    constant: true,
    name: 'name',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'bool'
      }
    ],
    constant: true,
    name: 'deprecated',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    inputs: [
      {
        name: '_evilUser',
        type: 'address'
      }
    ],
    name: 'addBlackList',
    stateMutability: 'Nonpayable',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'address'
      }
    ],
    constant: true,
    name: 'upgradedAddress',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'uint8'
      }
    ],
    constant: true,
    name: 'decimals',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'uint256'
      }
    ],
    constant: true,
    name: 'maximumFee',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'uint256'
      }
    ],
    constant: true,
    name: '_totalSupply',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    name: 'unpause',
    stateMutability: 'Nonpayable',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'bool'
      }
    ],
    constant: true,
    inputs: [
      {
        name: '_maker',
        type: 'address'
      }
    ],
    name: 'getBlackListStatus',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'bool'
      }
    ],
    constant: true,
    name: 'paused',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'uint256'
      }
    ],
    constant: true,
    inputs: [
      {
        name: '_value',
        type: 'uint256'
      }
    ],
    name: 'calcFee',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    name: 'pause',
    stateMutability: 'Nonpayable',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'address'
      }
    ],
    constant: true,
    name: 'owner',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'string'
      }
    ],
    constant: true,
    name: 'symbol',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    inputs: [
      {
        name: 'newBasisPoints',
        type: 'uint256'
      },
      {
        name: 'newMaxFee',
        type: 'uint256'
      }
    ],
    name: 'setParams',
    stateMutability: 'Nonpayable',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'uint256'
      }
    ],
    constant: true,
    name: 'basisPointsRate',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'bool'
      }
    ],
    constant: true,
    inputs: [
      {
        type: 'address'
      }
    ],
    name: 'isBlackListed',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    inputs: [
      {
        name: '_clearedUser',
        type: 'address'
      }
    ],
    name: 'removeBlackList',
    stateMutability: 'Nonpayable',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'uint256'
      }
    ],
    constant: true,
    name: 'MAX_UINT',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    inputs: [
      {
        name: 'newOwner',
        type: 'address'
      }
    ],
    name: 'transferOwnership',
    stateMutability: 'Nonpayable',
    type: 'Function'
  },
  {
    inputs: [
      {
        name: '_initialSupply',
        type: 'uint256'
      },
      {
        name: '_name',
        type: 'string'
      },
      {
        name: '_symbol',
        type: 'string'
      },
      {
        name: '_decimals',
        type: 'uint8'
      }
    ],
    stateMutability: 'Nonpayable',
    type: 'Constructor'
  },
  {
    inputs: [
      {
        indexed: true,
        name: '_blackListedUser',
        type: 'address'
      },
      {
        name: '_balance',
        type: 'uint256'
      }
    ],
    name: 'DestroyedBlackFunds',
    type: 'Event'
  },
  {
    inputs: [
      {
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'Issue',
    type: 'Event'
  },
  {
    inputs: [
      {
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'Redeem',
    type: 'Event'
  },
  {
    inputs: [
      {
        name: 'newAddress',
        type: 'address'
      }
    ],
    name: 'Deprecate',
    type: 'Event'
  },
  {
    inputs: [
      {
        indexed: true,
        name: '_user',
        type: 'address'
      }
    ],
    name: 'AddedBlackList',
    type: 'Event'
  },
  {
    inputs: [
      {
        indexed: true,
        name: '_user',
        type: 'address'
      }
    ],
    name: 'RemovedBlackList',
    type: 'Event'
  },
  {
    inputs: [
      {
        name: 'feeBasisPoints',
        type: 'uint256'
      },
      {
        name: 'maxFee',
        type: 'uint256'
      }
    ],
    name: 'Params',
    type: 'Event'
  },
  {
    name: 'Pause',
    type: 'Event'
  },
  {
    name: 'Unpause',
    type: 'Event'
  },
  {
    inputs: [
      {
        indexed: true,
        name: 'previousOwner',
        type: 'address'
      },
      {
        indexed: true,
        name: 'newOwner',
        type: 'address'
      }
    ],
    name: 'OwnershipTransferred',
    type: 'Event'
  },
  {
    inputs: [
      {
        indexed: true,
        name: 'owner',
        type: 'address'
      },
      {
        indexed: true,
        name: 'spender',
        type: 'address'
      },
      {
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'Approval',
    type: 'Event'
  },
  {
    inputs: [
      {
        indexed: true,
        name: 'from',
        type: 'address'
      },
      {
        indexed: true,
        name: 'to',
        type: 'address'
      },
      {
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'Transfer',
    type: 'Event'
  },
  {
    outputs: [
      {
        type: 'bool'
      }
    ],
    inputs: [
      {
        name: '_to',
        type: 'address'
      },
      {
        name: '_value',
        type: 'uint256'
      }
    ],
    name: 'transfer',
    stateMutability: 'Nonpayable',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'bool'
      }
    ],
    inputs: [
      {
        name: '_from',
        type: 'address'
      },
      {
        name: '_to',
        type: 'address'
      },
      {
        name: '_value',
        type: 'uint256'
      }
    ],
    name: 'transferFrom',
    stateMutability: 'Nonpayable',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'uint256'
      }
    ],
    constant: true,
    inputs: [
      {
        name: 'who',
        type: 'address'
      }
    ],
    name: 'balanceOf',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'uint256'
      }
    ],
    constant: true,
    inputs: [
      {
        name: 'who',
        type: 'address'
      }
    ],
    name: 'oldBalanceOf',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'bool'
      }
    ],
    inputs: [
      {
        name: '_spender',
        type: 'address'
      },
      {
        name: '_value',
        type: 'uint256'
      }
    ],
    name: 'approve',
    stateMutability: 'Nonpayable',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'bool'
      }
    ],
    inputs: [
      {
        name: '_spender',
        type: 'address'
      },
      {
        name: '_addedValue',
        type: 'uint256'
      }
    ],
    name: 'increaseApproval',
    stateMutability: 'Nonpayable',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'bool'
      }
    ],
    inputs: [
      {
        name: '_spender',
        type: 'address'
      },
      {
        name: '_subtractedValue',
        type: 'uint256'
      }
    ],
    name: 'decreaseApproval',
    stateMutability: 'Nonpayable',
    type: 'Function'
  },
  {
    outputs: [
      {
        name: 'remaining',
        type: 'uint256'
      }
    ],
    constant: true,
    inputs: [
      {
        name: '_owner',
        type: 'address'
      },
      {
        name: '_spender',
        type: 'address'
      }
    ],
    name: 'allowance',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    inputs: [
      {
        name: '_upgradedAddress',
        type: 'address'
      }
    ],
    name: 'deprecate',
    stateMutability: 'Nonpayable',
    type: 'Function'
  },
  {
    outputs: [
      {
        type: 'uint256'
      }
    ],
    constant: true,
    name: 'totalSupply',
    stateMutability: 'View',
    type: 'Function'
  },
  {
    inputs: [
      {
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'issue',
    stateMutability: 'Nonpayable',
    type: 'Function'
  },
  {
    inputs: [
      {
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'redeem',
    stateMutability: 'Nonpayable',
    type: 'Function'
  },
  {
    inputs: [
      {
        name: '_blackListedUser',
        type: 'address'
      }
    ],
    name: 'destroyBlackFunds',
    stateMutability: 'Nonpayable',
    type: 'Function'
  }
];
