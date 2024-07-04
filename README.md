# EX3 dapp
EX3 frontend monorepo based on React, Typescript, and [Turbo](https://turbo.build/)
## Develop
```
yarn install
yarn dev:<workspace_name>
```
## Build
```
yarn build:<workspace_name>
```
## Workspaces
- apps
  - `web`: EX3 frontend project, built with ReactBootstrap and less
  - `new-web`: EX3 new UI frontend project, built with Tailwindcss and DaisyUI
- packages
  - `common`: common shared package
