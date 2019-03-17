[![npm version](https://badge.fury.io/js/script-launcher.svg)](https://www.npmjs.com/package/script-launcher)
[![GitHub last commit](https://img.shields.io/github/last-commit/chanzo/script-launcher.svg?maxAge=2400)](#)
[![downloads-image](https://img.shields.io/npm/dm/script-launcher.svg)](https://www.npmjs.com/package/script-launcher)
[![Dependency Status](https://david-dm.org/chanzo/script-launcher.svg)](https://david-dm.org/chanzo/script-launcher) 
[![devDependency Status](https://david-dm.org/chanzo/script-launcher/dev-status.svg)](https://david-dm.org/chanzo/script-launcher?type=dev) 

[![NPM](https://nodei.co/npm/script-launcher.png?compact=false)](https://www.npmjs.com/package/script-launcher)

[![License](https://img.shields.io/npm/l/script-launcher.svg)](/LICENSE) 

[![GitHub forks](https://img.shields.io/github/forks/chanzo/script-launcher.svg?style=social&label=Fork)](https://github.com/chanzo/script-launcher/fork)
[![GitHub stars](https://img.shields.io/github/stars/chanzo/script-launcher.svg?style=social&label=Star)](https://github.com/chanzo/script-launcher) 

# Script Launcher

Script Launcher is a tool, to manage your `package.json` scripts in a more flexible manner. Its features are specialized to work on Mac, Linux and Windows. You can use the examples from the table of content to get familiar with these features.

In a traditional `package.json` you can only run commands on a per line basis. With larger projects that have multiple environments, this can quickly become a hassle and difficult to maintain, like the example below:

```JSON
{
  "scripts": {
    ...
    "build:uva:dev": "ng build uva --prod --configuration=dev",
    "build:uva:tst": "ng build uva --prod --configuration=tst",
    "build:uva:acc": "ng build uva --prod --configuration=acc",
    "build:uva:prd": "ng build uva --prod --configuration=prd",
    "build:hva:dev": "ng build hva --prod --configuration=dev",
    "build:hva:tst": "ng build hva --prod --configuration=tst",
    "build:hva:acc": "ng build hva --prod --configuration=acc",
    "build:hva:prd": "ng build hva --prod --configuration=prd",
    "deploy:dev": "npm run build:uva:dev && npm run build:hva:dev && firebase deploy --public dist/uva --project status-uva-dev && firebase deploy --public dist/hva --project status-hva-dev",
    "deploy:tst": "npm run build:uva:tst && npm run build:hva:tst && firebase deploy --public dist/uva --project status-uva-tst && firebase deploy --public dist/hva --project status-hva-tst",
    "deploy:acc": "npm run build:uva:acc && npm run build:hva:acc && firebase deploy --public dist/uva --project status-uva-acc && firebase deploy --public dist/hva --project status-hva-acc",
    "deploy:prd": "npm run build:uva:prd && npm run build:hva:prd && firebase deploy --public dist/uva --project status-uva-prd && firebase deploy --public dist/hva --project status-hva-prd",
    ...
  }        
}
```

With script-launcher you have the benefits of using variables and references, so you can make the above example easier to maintain:
``` JSON
{
  "scripts": {
    ...
    "build:$project:$config": "ng build $project -configuration=$config",
    "deploy:$project:$config":[
      "build:$project:$config",
      "firebase deploy --public dist/$project --project $project-$config"
    ],
    "deploy:$config":[
      "deploy:uva:$config",
      "deploy:hva:$config"
    ]
    ...
  }
}
```
To start the above example you would run: `npm start build:uva:tst` or `npm start deploy:prd` etc. 



## Table of Contents
* [Installation](#installation)
* [Usage examples](#usage-examples)
* [Implementation examples](#implementation-examples)
  * [Use array's to start multiple scripts sequentially.](#array-sequential-scripts)
  * [Use array's to start multiple scripts concurrently.](#array-concurrent-scripts)
  * [Change directory in a separate script line](#change-directory)
  * [Environment and argument values can be used on Linux, Mac and Windows in a consistent manner.](#environment-and-argument-values-on-linux-mac-and-windows)
  * [Pass arguments to script, use them like functions.](#script-functions-with-parameters)
  * Gain the possibility to reference your scripts from other scripts.
  * [Use an interactive landing menu, so a new developer get can start on your project more easily.](#interactive-landing-menu)

## Installation

Install `script-launcher` as a development dependency in your project.
``` bash
npm install script-launcher --save-dev
```

Use `launch init` to create an example `launcher-config.json` file.
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
To test an example, copy the json content from the example to the file named `launcher-config.json` and run the script.

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

### Change directory
Run `npm start build-stuff` to test this example.
```
{
  "scripts": {
    "build-stuff": [
      "node_modules/script-launcher",
      "dir"
    ]
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

