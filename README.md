# Hibit ID
HibitID frontend monorepo based on React, Typescript, and [Turbo](https://turbo.build/)
## Develop
```
yarn install

# wallet app
yarn dev:wallet
# sdk test app
yarn dev:sdk
```
## Build
```
# wallet app
yarn build:wallet
# sdk library
yarn build:sdk
```
## Workspaces
- apps
  - `wallet`: HibitID wallet app frontend project, built with Tailwindcss and DaisyUI
- packages
  - `sdk`: HibitID sdk for dapps to integrate HibitID wallet
