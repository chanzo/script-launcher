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
* Use an array to start  scripts in parallel.
* Use the environment values on Linux, Mac and Windows in a consistent manner.
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


## **Example** : Array to start scripts sequentially.
To test this example, copy the json content below to the file named `script-launcher.json` and run `npm start build-stuff`
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

## **Example** : Array to start  scripts in parallel.
To test this example, copy the json content below to the file named `script-launcher.json` and run `npm start build-stuff`
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

## **Example** : Environment values on Linux, Mac and Windows in a consistent manner.
To test this example, copy the json content below to the file named `script-launcher.json` and run `npm start build-stuff`
``` JSON
{
  "scripts": {
    "build-stuff": {
      "concurrent": [
        "echo Long background job 1 && sleep 10",
        "echo Long background job 2 && sleep 10"
      ],
      "sequential": [
        "echo Sequential 1 && sleep 1",
        "echo Sequential 2 && sleep 1"
      ]
    }
  }
}
```

## **Example** : Script functions with arguments.
To test this example, copy the json content below to the file named `script-launcher.json` and run `npm start build:myProject:production`
``` JSON
{
  "scripts": {
    "build:$PROJECT:$CONFIGURATION":"echo build project=$PROJECT configuration=$CONFIGURATION"
  }
}
```

## **Example** : Interactive landing menu.
To test this example, copy the json content below to the file named `script-launcher.json` and run `npm start`
``` JSON
{
  "menu": {
    "description": "action",
    "build": {
      "description": "environment",
      "development": "echo building development environment...",
      "test": "echo building test environment...",
      "acceptance": "echo building acceptance environment...",
      "production": "echo building production environment..."
    },
    "deploy": {
      "description": "environment",
      "development": "echo deploying development environment...",
      "test": "echo deploying test environment...",
      "acceptance": "echo deploying acceptance environment...",
      "production": "echo deploying production environment..."
    }
  }
}
```

