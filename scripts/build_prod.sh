#!/bin/bash

yarn install --frozen-lockfile

export VITE_HIBIT_ID_API=https://idapi.hibit.app/
export VITE_HIBIT_AUTH_SERVER=https://auth.hibit.app/
export VITE_HIBIT_AUTH_CLIENT_ID=hibit_id_web
export VITE_EX3_API=https://api.hibit.app/
export VITE_TELEGRAM_BOT_ID=7464118211
export VITE_APP_ENV=MainNet

yarn build:wallet
