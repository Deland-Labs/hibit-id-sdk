#!/bin/bash

yarn install --frozen-lockfile

export VITE_HIBIT_ID_API=https://testnetidapi.hibit.app/
export VITE_HIBIT_AUTH_SERVER=https://testnetauth.hibit.app/
export VITE_HIBIT_AUTH_CLIENT_ID=hibit_id_local
export VITE_TELEGRAM_BOT_ID=6944468360
export VITE_APP_ENV=TestNet

yarn build:wallet