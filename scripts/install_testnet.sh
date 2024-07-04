#!/bin/bash

yarn install --frozen-lockfile

export VITE_BASE_API=https://alphaapi.ex3.one/
export VITE_WS_BASE_API=https://alphaws.ex3.one/
export VITE_APP_ENV=TestNet
