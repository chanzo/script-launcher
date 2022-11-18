[![NPM version][npm-image]][npm-url]
[![GitHub last commit][github-last-commit]](#)
[![Downloads][downloads-image]][npm-url]
[![Dependency status][david-dm-image]][david-dm-url]
[![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url]

[![NPM](https://nodei.co/npm/script-launcher.png?compact=false)](https://www.npmjs.com/package/script-launcher)

[![License][license-image]](/LICENSE)

[npm-url]: https://npmjs.org/package/script-launcher
[npm-image]: https://img.shields.io/npm/v/script-launcher.svg
[downloads-image]: https://img.shields.io/npm/dm/script-launcher.svg
[github-last-commit]: https://img.shields.io/github/last-commit/chanzo/script-launcher.svg?maxAge=2400
[david-dm-url]: https://david-dm.org/chanzo/script-launcher
[david-dm-image]: https://img.shields.io/david/chanzo/script-launcher.svg
[david-dm-dev-url]: https://david-dm.org/chanzo/script-launcher?type=dev
[david-dm-dev-image]: https://img.shields.io/david/dev/chanzo/script-launcher.svg
[license-image]: https://img.shields.io/npm/l/script-launcher.svg

# ![Logo](docs/readme-logo.png) Script Launcher Sources

This repository contains the Typescript source code of script-launcher. The sources are located in the **src** directory.
This readme describes how to build and deploy script launcher it self. For the npm package documentation open
the [readme](src/README.md) located in the **src** directory.

### Tools

- [node](https://nodejs.org/en/) - JavaScript runtime
- [nvm](https://github.com/creationix/nvm) - node version manager
- [tsc](https://www.typescriptlang.org/) - TypeScript
- [launch](https://www.npmjs.com/package/script-launcher) - Script Launcher

### Basic setup

```bash
git clone git@github.com:chanzo/script-launcher.git
cd script-launcher

npm install
npm start
```

### Build & Publish

```bash
npm start test
npm start build
cd dist/package
npm login
npm whoami
npm publish
```

### Run spesific tests

```bash
npx jest --clearCache
npm start test -- -t "'npx launch version'"
npm start test -- ./tests/debug.test.ts
```

### Resources

- [NPM Developer Guide](https://docs.npmjs.com/misc/developers#before-publishing-make-sure-your-package-installs-and-works)
- [Jest Testing Framework](https://jestjs.io/)
- [ShellJS - Unix shell commands for Node.js](https://www.npmjs.com/package/shelljs)
- [zsh-completions](https://github.com/zsh-users/zsh-completions/blob/master/zsh-completions-howto.org)

### Dependencies

- [cross-spawn](https://www.npmjs.com/package/cross-spawn) - A cross platform solution to node's spawn and spawnSync.
- [deepmerge](https://www.npmjs.com/package/deepmerge) - Merges the enumerable attributes of two or more objects deeply.
- [fast-glob](https://www.npmjs.com/package/fast-glob) - It's a very fast and efficient glob library for Node.js.
- [pretty-time](https://www.npmjs.com/package/pretty-time) - Easily format the time from node.js process.hrtime.
- [prompts](https://www.npmjs.com/package/prompts) - Lightweight, beautiful and user-friendly prompts
