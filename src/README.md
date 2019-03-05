[![npm version](https://badge.fury.io/js/script-launcher.svg)](https://www.npmjs.com/package/script-launcher)
[![downloads-image](https://img.shields.io/npm/dm/script-launcher.svg)](https://www.npmjs.com/package/script-launcher)
[![Dependency Status](https://david-dm.org/chanzo/script-launcher.svg)](https://david-dm.org/chanzo/script-launcher) 
[![devDependency Status](https://david-dm.org/chanzo/script-launcher/dev-status.svg)](https://david-dm.org/chanzo/script-launcher?type=dev) 

[![License](https://img.shields.io/npm/l/script-launcher.svg)](/LICENSE) 

[![GitHub forks](https://img.shields.io/github/forks/chanzo/script-launcher.svg?style=social&label=Fork)](https://github.com/chanzo/script-launcher/fork)
[![GitHub stars](https://img.shields.io/github/stars/chanzo/script-launcher.svg?style=social&label=Star)](https://github.com/chanzo/script-launcher) 

# Script Launcher

Script Launcher is a tool, to manage your 'package.json' scripts in a more flexible manner. Its features are specialized to work on Mac, Linux and Windows. You can use the examples from the table of content to get familiar with these features.

In a traditional package json you can add run commands on a per line basis. With multiple environments this can become a hassle like the example below:

```JSON
{
  "scripts": {
    ...
    "build:uva:dev": "ng build --prod --no-progress --project=uva --configuration=dev",
    "build:uva:tst": "ng build --prod --no-progress --project=uva --configuration=tst",
    "build:uva:acc": "ng build --prod --no-progress --project=uva --configuration=acc",
    "build:uva:prd": "ng build --prod --no-progress --project=uva --configuration=prd",
    "build:hva:dev": "ng build --prod --no-progress --project=hva --configuration=dev",
    "build:hva:tst": "ng build --prod --no-progress --project=hva --configuration=tst",
    "build:hva:acc": "ng build --prod --no-progress --project=hva --configuration=acc",
    "build:hva:prd": "ng build --prod --no-progress --project=hva --configuration=prd",
    ...
  }        
}
```

With script-launcher you have the benefits of using variables and make the above example easier to maintain:
``` JSON
{
  "scripts": {
    ...
    "build:$PROJECT:$CONFIGURATION": "ng build --project=$PROJECT --configuration=$CONFIGURATION",
    ...
  }
}
```
To start the above example you would run: `npm start build:uva:tst` or `npm start build:hva:prd` etc. 



## Table of Contents
* [Installation](#Installation)
* [Usage examples](#Usage-examples)
* [Implementation examples](#Implementation-examples)
  * [Use array's to start multiple scripts sequentially.](#Array-sequential-scripts)
  * [Use array's to start multiple scripts concurrently.](#Array-concurrent-scripts)
  * [Environment and argument values can be used on Linux, Mac and Windows in a consistent manner.](#Environment-and-argument-values-on-Linux-Mac-and-Windows)
  * [Pass arguments to script, use them like functions.](#Script-functions-with-parameters)
  * Gain the possibility to reference your scripts from other scripts.
  * [Use an interactive landing menu, so a new developer get can start on your project more easily.](#interactive-landing-menu)

## Installation

Install `script-launcher` as a development dependency in your project.
``` bash
npm install script-launcher --save-dev
```

Use `launch init` to create an example `script-launcher.json` file.
``` bash
# Linux and Mac
./node_modules/.bin/launch init
# Windows
.\node_modules\.bin\launch init
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
You are now ready to start use Script Launcher.

## Usage examples

Show menu
```
npm start
```

Start a launch script
```
npm start build:myProject1:tst
npm start deploy:myProject2:acc
```
Basically you can now use `npm start` instead of `npm run`.

## Implementation examples
To test an example, copy the json content from the example to the file named `script-launcher.json` and run the script.

### Array sequential scripts.
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

### Array concurrent scripts.
Run `npm start build-stuff` to test this example.

**Linux and Macos example using sleep**
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

**Windows example using timeout**
``` JSON
{
  "scripts": {
    "build-stuff": {
      "concurrent": [
        "echo Long background job 1 && (timeout 4 > nul) && echo Job 1 done.",
        "echo Long background job 2 && (timeout 6 > nul) && echo Job 2 done."
      ],
      "sequential": [
        "echo Sequential 1 && (timeout 1 > nul)",
        "echo Sequential 2 && (timeout 1 > nul)"
      ]
    }
  }
}
```

### Environment and argument values on Linux, Mac and Windows.
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
    "build:$PROJECT:$CONFIGURATION": "echo build project=$PROJECT configuration=$CONFIGURATION"
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

