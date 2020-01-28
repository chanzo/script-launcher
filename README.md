[![npm version](https://badge.fury.io/js/script-launcher.svg)](https://www.npmjs.com/package/script-launcher)
[![GitHub last commit](https://img.shields.io/github/last-commit/chanzo/script-launcher.svg?maxAge=2400)](#)
[![downloads-image](https://img.shields.io/npm/dm/script-launcher.svg)](https://www.npmjs.com/package/script-launcher)
[![Dependency Status](https://david-dm.org/chanzo/script-launcher.svg)](https://david-dm.org/chanzo/script-launcher) 
[![devDependency Status](https://david-dm.org/chanzo/script-launcher/dev-status.svg)](https://david-dm.org/chanzo/script-launcher?type=dev) 

[![NPM](https://nodei.co/npm/script-launcher.png?compact=false)](https://www.npmjs.com/package/script-launcher)

[![License](https://img.shields.io/npm/l/script-launcher.svg)](/LICENSE) 

[![GitHub forks](https://img.shields.io/github/forks/chanzo/script-launcher.svg?style=social&label=Fork)](https://github.com/chanzo/script-launcher/fork)
[![GitHub stars](https://img.shields.io/github/stars/chanzo/script-launcher.svg?style=social&label=Star)](https://github.com/chanzo/script-launcher) 

# ![Logo](docs/readme-logo.png) Script Launcher Sources

This repository contains the Typescript source code of script-launcher. The sources are located in the **src** directory.
This readme describes how to build and deploy script launcher it self. For the npm package documentation open
the [readme](src/README.md) located in the **src** directory.

### Tools
* [node](https://nodejs.org/en/) - JavaScript runtime
* [nvm](https://github.com/creationix/nvm) - node version manager
* [tsc](https://www.typescriptlang.org/) - TypeScript
* [launch](https://www.npmjs.com/package/script-launcher) - Script Launcher

### Basic setup
``` bash
git clone git@github.com:chanzo/script-launcher.git
cd script-launcher

npm install
npm start
```

### Build & Publish
``` bash
npm start test
npm start build
cd dist/package
npm login
npm whoami
npm publish
```

### Run spesific tests
``` bash
npx jest --clearCache
npm start test -- -t "'launch  --version'"
npm start test -- ./tests/debug.test.ts
```

### Experimental tab completion support for script-launcher in zsh
``` bash
complete -C "npx launch list" -o default 'npm'
# Or when script-launcher is installed globally
complete -C "launch list" -o default 'npm'

cd src && complete -o default -C "$PWD/launch-completion.sh"  'npm' && cd ..
cd src && complete -o default -F "$PWD/launch-completion.sh"  'npm' && cd ..

export COMP_CWORD=2
export COMP_LINE=npm run a
export COMP_POINT=11

_npm_completion "npm a run"
```

### npm completion
``` bash
_npm_completion_test () {
  local words cword

  date -Iseconds > coml.log
  echo "COMP_CWORD: $COMP_CWORD" >> coml.log
  echo "COMP_LINE: $COMP_LINE"   >> coml.log
  echo "COMP_POINT: $COMP_POINT" >> coml.log

  if [[ $COMP_LINE != "npm start"* ]] ; then
    echo "npm default" >> coml.log
    if type _get_comp_words_by_ref &>/dev/null; then
      _get_comp_words_by_ref -n = -n @ -n : -w words -i cword
    else
      cword="$COMP_CWORD"
      words=("${COMP_WORDS[@]}")
    fi

    local si="$IFS"
    IFS=$'\n' COMPREPLY=($(COMP_CWORD="$cword" \
                            COMP_LINE="$COMP_LINE" \
                            COMP_POINT="$COMP_POINT" \
                            npm completion -- "${words[@]}" \
                            2>/dev/null)) || return $?
    IFS="$si"
    if type __ltrim_colon_completions &>/dev/null; then
      __ltrim_colon_completions "${words[cword]}"
    fi
  else
    echo "script-launcher" >> coml.log
    npx launch list
  fi
}
complete -o default -F _npm_completion_test npm
```
### script-launcher completion
``` bash
eval "$(npm completion)"

_launch_completion () {
  if [[ $COMP_LINE != "npm start"* ]] ; then
    _npm_completion
  else
    npx launch list
  fi
}
complete -o default -F _launch_completion npm
```





### Resources
* [NPM Developer Guide](https://docs.npmjs.com/misc/developers#before-publishing-make-sure-your-package-installs-and-works)
* [Jest Testing Framework](https://jestjs.io/)
* [ShellJS - Unix shell commands for Node.js](https://www.npmjs.com/package/shelljs)

### Dependencies 
* [cross-spawn](https://www.npmjs.com/package/cross-spawn) - A cross platform solution to node's spawn and spawnSync.            
* [deepmerge](https://www.npmjs.com/package/deepmerge) - Merges the enumerable attributes of two or more objects deeply.     
* [glob](https://www.npmjs.com/package/glob) - Match files using the patterns the shell uses, like stars and stuff.
* [Inquirer.js](https://www.npmjs.com/package/inquirer) - A collection of common interactive command line user interfaces.    
* [pretty-time](https://www.npmjs.com/package/pretty-time) - Easily format the time from node.js process.hrtime.
* [string-argv](https://www.npmjs.com/package/string-argv) - Parses a string into an argument array to mimic process.argv.       
