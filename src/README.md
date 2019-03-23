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

Script Launcher is a tool, to manage your `package.json` scripts in a more flexible manner. Its functions are specialized to work on Mac, Linux and Windows. You can use the examples from the [table of contents](#table-of-contents) to get familiar with these functions.

In a traditional `package.json` you can only run scripts on a per line basis. With larger projects that have multiple environments, this can quickly become a hassle and difficult to maintain, like the example below:

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

With **script-launcher** you have the benefits of using variables, script references and many more functions, so you can make the above example easier to maintain:
``` JSON
{
  "scripts": {
    ...
    "build:$project:$config": "ng build $project --configuration=$config",
    "deploy:$project:$config":[
      "build:$project:$config",
      "firebase deploy --public dist/$project --project $project-$config"
    ],
    "deploy:$config":[
      "deploy:uva:$config",
      "deploy:hva:$config"
    ],
    ...
  }
}
```
You would use: `npm start build:uva:tst` or `npm start deploy:prd` etc, to start the above example.

It's also possible to extend the example with an interactive menu, so a new developer can get start on your project more easily:
``` JSON
  "menu": {
    "description": "deploy organization",
    "uva": {
      "description": "deploy environment",
      "acceptance": "deploy:uva:acc",
      "production": "deploy:uva:tst"
    },
    "hva": {
      "description": "deploy environment",
      "acceptance": "deploy:hva:acc",
      "production": "deploy:hva:tst"
    }
  },
  "options": {
    "menu": {
      "defaultChoice": "hva:acc"
    }
  }
```
To start the above example you would run: `npm start`

# Table of Contents
* [Installation](#installation)
* [Usage examples](#usage-examples)
* [Implementation examples](#implementation-examples)
  * [Sequential scripts](#sequential-scripts)
  * [Arguments and functions](#arguments-and-functions)
  * [Reference scripts](#reference-scripts)
  * [Change directory](#change-directory)
  * [Environment and argument values](#environment-and-argument-values)
  * [Concurrent scripts](#concurrent-scripts)
  * [Interactive menu](#interactive-menu)
* [Launcher options](#launcher-options)
  * [Launcher files](#launcher-files)
  * [Script shell](#script-shell)
  * [Menu defaults](#menu-defaults)
  * [Debug logging](#debug-logging)

## Installation

Install **script-launcher** as a development dependency in your project.
``` bash
npm install script-launcher --save-dev
```

Use **launch init** to create an example **launcher-config.json** file.
``` bash
"node_modules/.bin/launch" init
```

For easy usage, change your **package.json** start script to use script launcher as the default.
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

Start a specific launch script
```
npm start serve:uva:dev
npm start serve:uva:tst
```
Basically you can now use `npm start` instead of `npm run`.

## Implementation examples
To test an example, copy the json content from the example to the file named **launcher-config.json** and run the script.

### Sequential scripts
This example uses square brackets to start multiple script one by one. This function makes long script lines more readable.

Run `npm start build-stuff` to use this example.
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

### Arguments and functions
Use the dollar-sign in the script name and command, to specify custom script function arguments. This function makes it possible to start one script with different arguments, this works on Mac, Linux and Windows in the same way.

Run `npm start serve:uva:tst` or `npm start serve:uva:prd` etc, to use this example.
``` JSON
{
  "scripts": {
    "serve:$project:$config": "echo ng serve $project -c=$config"
  }
}
```

### Reference scripts
Use an existing script name in the command section to execute another script in your config file. This function makes it possible to reuse script from other script, with different arguments if desired.

Run `npm start deploy:tst` to use this example.
``` JSON
{
  "scripts": {
    "build:$project:$config": "echo ng build $project -c=$config",
    "deploy:$project:$config": [
      "build:$project:$config",
      "echo firebase deploy --public dist/$project -P $project-$config"
    ],
    "deploy:$config": [
      "deploy:uva:$config",
      "deploy:hva:$config"
    ]
  }
}
```

### Change directory
Specify an existing directory as an script command and it will change to that directory for the next scripts to execute. This can be handy if your script have to be run from a different location.

Run `npm start build-stuff` to use this example.
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

### Environment and argument values
Use the dollar-sign in the script command, to references command line arguments and environment variables on Linux, Mac and windows in a consistent manner.

Run `npm start build-stuff my-arg-1 my-arg-2` to use this example.
``` JSON
{
  "scripts": {
    "build-stuff": [
      "environment=my-env",
      "echo Node version: $npm_config_node_version",
      "echo Argument 1 : $1",
      "echo Argument 2 : $2",
      "echo Environment : $environment"
    ]
  }
}
```

### Concurrent scripts
This example uses the **concurrent** keyword to run multiple script in parallel and the **sequential** keyword to start multiple script one by one. This function is mostly confinent in development environment, when you want to start development server in the background.

Run `npm start build-stuff` to use this example.
``` JSON
{
  "scripts": {
    "sleep:$time": "node -e \"setTimeout(() => {}, $time)\"",
    "background:$job:$time": [
      "echo Background job : $job",
      "sleep:$time",
      "echo Completed job : $job"
    ],
    "build-stuff": {
      "concurrent": [
        "background:1:3000",
        "background:2:5000"
      ],
      "sequential": [
        "echo Sequential job : 3",
        "sleep:1000",
        "echo Sequential job : 4",
        "sleep:1000"
      ]
    }
  }
}
```

### Interactive menu
Use the **menu** section to create an interactive landing menu, so a new developer can get start on your project more easily. The value of the **description** keyword is used as a description of presented values.

Run `npm start` to use this example.
``` JSON
{
  "scripts": {
    "serve:$project:dev": {
      "concurrent": [
        "echo Start development server",
        "echo ng serve $project -c=dev"
      ]
    },
    "serve:$project:$config": "echo ng serve $project -c=$config"
  },
  "menu": {
    "description": "organization",
    "uva": {
      "description": "environment",
      "development": "serve:uva:dev",
      "acceptance": "serve:uva:acc",
      "production": "serve:uva:prd"
    },
    "hva": {
      "description": "environment",
      "development": "serve:hva:dev",
      "acceptance": "serve:hva:acc",
      "production": "serve:hva:prd"
    }
  },
  "options": {
    "menu": {
      "defaultChoice": "hva:dev"
    }
  }
}
```

## Launcher options
The launcher **options** can be used the customize the default behavior of script launcher.

### Launcher files
The **files** options can be used to configure the config files to load when starting launcher. When using multiple files they will be merged together in the loading order. Be aware the `launcher-config.json` is always the first file being loaded even when it is not present in the files list.

By using this option it's possible the split your configuration over multiple files. A could practice is to split your script and menu configurations to there own file. You could also include the `package.json` file in this list, then you can use the strength of script launcher in your `package.json` file.

The default value of this list is presented in the following example:
``` JSON
"options": {
  "files": [
    "launcher-config.json",
    "launcher-scripts.json",
    "launcher-menu.json",
    "launcher-custom.json",
  ]
}
```

### Script shell
The **script shell** options can be used to configure the spawn shell, this value is passed to the [options shell](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options) of the node **child_process.spawn** method.

The default value is presented in the following example:
``` JSON
"options": {
  "script": {
    "shell": true
  }
}
```

### Menu defaults
The **menu defaultChoice** option can be used to specify the default selected entries of your menu separated by a colon. The **menu defaultScript** option can be used for auto starting a specific script, this will disable the interactive menu.

The default value is presented in the following example:
``` JSON
"options": {
  "menu": {
    "defaultChoice": "",
    "defaultScript": ""
  }
}
```

### Debug logging
The **logLevel** option is used for debugging script launcher itself.

The default value is presented in the following example:
``` JSON
"options": {
  "logLevel": 0
}
```
