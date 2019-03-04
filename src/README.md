[![npm version](https://badge.fury.io/js/script-launcher.svg)](https://www.npmjs.com/package/script-launcher)
[![downloads-image](https://img.shields.io/npm/dm/script-launcher.svg)](https://www.npmjs.com/package/script-launcher)
[![Dependency Status](https://david-dm.org/chanzo/script-launcher.svg)](https://david-dm.org/chanzo/script-launcher) 
[![devDependency Status](https://david-dm.org/chanzo/script-launcher/dev-status.svg)](https://david-dm.org/chanzo/script-launcher?type=dev) 

[![License](https://img.shields.io/npm/l/script-launcher.svg)](/LICENSE) 

[![GitHub forks](https://img.shields.io/github/forks/chanzo/script-launcher.svg?style=social&label=Fork)](https://github.com/chanzo/script-launcher/fork)
[![GitHub stars](https://img.shields.io/github/stars/chanzo/script-launcher.svg?style=social&label=Star)](https://github.com/chanzo/script-launcher) 

# Script Launcher

Script Launcher provides a more flexible way to manage your 'package.json' scripts. The following list, is a summary of some of these extra features:

* Use an array to start scripts sequentially.
* Use an array to start  scripts concurrently.
* Use the environment and argument values on Linux, Mac and Windows in a consistent manner.
* Use script functions with arguments.
* Use an interactive landing menu, so a new developer get can start on your project more easily.

## Installation

Install `script-launcher` as a development dependency in your project.
``` bash
npm install script-launcher --save-dev
```

Use `launch init` to create an example `script-launcher.json` file.
``` bash
./node_modules/.bin/launch init
```

For easy usage, change your `package.json` start script to use script launcher as the default.
``` json
{
    ...
    "scripts": {
        "start": "launch",
        ...
    },
    ...
}
```
Now you are ready to use Script Launcher.

## Usage examples

Show menu
```
npm start
```

Run launch script directly
```
npm start build:myProject1:tst
npm start deploy:myProject2:acc
```
Basically you can now use `start` instead of `run`.

## Feature examples
To test an example, copy the json content from the example to the file named `script-launcher.json` and run the script.

### Array to start scripts sequentially.
Run `npm start build-stuff` to test this example.
``` JSON
{
  "scripts": {
    "build-stuff": [
      "echo Build step 1",
      "echo Build step 2",
      "echo Build step 3"
    ]
  }
}
```

### Array to start scripts concurrently.
Run `npm start build-stuff` to test this example.
``` JSON
{
  "scripts": {
    "build-stuff": {
      "concurrent": [
        "echo Long background job 1 && sleep 4 && echo Job 1 done.",
        "echo Long background job 2 && sleep 6 && echo Job 2 done."
      ],
      "sequential": [
        "echo Sequential 1 && sleep 1",
        "echo Sequential 2 && sleep 1"
      ]
    }
  }
}
```

### Environment and argument values on Linux, Mac and Windows in a consistent manner.
Run `npm start build-stuff my-arg-1 my-arg-2` to test this example.
``` JSON
{
  "scripts": {
    "build-stuff": [
      "echo Node version: $npm_config_node_version",
      "echo Argument 1 : $1",
      "echo Argument 2 : $2"
    ]
  }
}
```

### Script functions with parameters.
Run `npm start build:myProject:production` to test this example.
``` JSON
{
  "scripts": {
    "build:$PROJECT:$CONFIGURATION":"echo build project=$PROJECT configuration=$CONFIGURATION"
  }
}
```

### Interactive landing menu.
Run `npm start` to test this example.
``` JSON
{
  "menu": {
    "description": "action",
    "build": {
      "description": "environment",
      "development": "echo Building development environment...",
      "test": "echo Building test environment...",
      "acceptance": "echo Building acceptance environment...",
      "production": "echo Building production environment..."
    },
    "deploy": {
      "description": "environment",
      "development": "echo Deploying development environment...",
      "test": "echo Deploying test environment...",
      "acceptance": "echo Deploying acceptance environment...",
      "production": "echo Deploying production environment..."
    }
  }
}
```

