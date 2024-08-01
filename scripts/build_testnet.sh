#!/bin/bash

yarn install --frozen-lockfile

cd apps/wallet/ || exit

export VITE_HIBIT_ID_API=https://testnetidapi.hibit.app/
export VITE_HIBIT_AUTH_SERVER=https://testnetauth.hibit.app/
export VITE_HIBIT_AUTH_CLIENT_ID=IdServer_HibitIdWeb
export VITE_EX3_API=https://alphaapi.ex3.one/
export VITE_TELEGRAM_BOT_ID=7359440424
export VITE_APP_ENV=TestNet

yarn build