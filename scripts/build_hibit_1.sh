#!/bin/bash

yarn install --frozen-lockfile

export VITE_EX3_BASE_API=https://api.hibit.app/
export VITE_EX3_WS_BASE_API=https://ws.hibit.app/
export VITE_APP_ENV=Mainnet

yarn build:wallet
