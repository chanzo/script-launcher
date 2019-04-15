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

Extend your **package.json** scripts with features like: functions, arrays, concurrency and many more. Script Launcher is specialized to work on Mac, Linux and Windows. Use the examples from the [table of contents](#table-of-contents) to get familiar with these features.

In a traditional **package.json** you can only run scripts on a per line basis. With larger projects that have multiple environments, this can quickly become a hassle and difficult to maintain, like the example below:

```JSON
// Traditional package.json scripts //
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
    "deploy:uva:dev": "npm run build:uva:dev && firebase deploy --public dist/uva --project status-uva-dev",
    "deploy:uva:tst": "npm run build:uva:tst && firebase deploy --public dist/uva --project status-uva-tst",
    "deploy:uva:acc": "npm run build:uva:acc && firebase deploy --public dist/uva --project status-uva-acc",
    "deploy:uva:prd": "npm run build:uva:prd && firebase deploy --public dist/uva --project status-uva-prd",
    "deploy:hva:dev": "npm run build:hva:dev && firebase deploy --public dist/hva --project status-hva-dev",
    "deploy:hva:tst": "npm run build:hva:tst && firebase deploy --public dist/hva --project status-hva-tst",
    "deploy:hva:acc": "npm run build:hva:acc && firebase deploy --public dist/hva --project status-hva-acc",
    "deploy:hva:prd": "npm run build:hva:prd && firebase deploy --public dist/hva --project status-hva-prd",
    "deploy:dev": "npm run deploy:uva:dev && npm run deploy:hva:dev",
    "deploy:tst": "npm run deploy:uva:tst && npm run deploy:hva:tst",
    "deploy:acc": "npm run deploy:uva:acc && npm run deploy:hva:acc",
    "deploy:prd": "npm run deploy:uva:prd && npm run deploy:hva:prd",
    ...
  }        
}
```

With **script-launcher** you have the benefits of using variables, script references and many more features, so you can make the above example easier to maintain:
``` JSON
// Example using script launcher //
{
  "scripts": {
    ...
    "build:$project:$config": "ng build $project --prod --configuration=$config",
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
To start this example you would use: `npm start build:uva:tst` or `npm start deploy:prd` etc.

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
You would use: `npm start` to start the menu.

# Table of Contents
* [Installation](#installation)
* [Usage examples](#usage-examples)
* [Implementation examples](#implementation-examples)
  * [Sequential scripts](#sequential-scripts)
  * [Change directory](#change-directory)
  * [Parameters and functions](#parameters-and-functions)
  * [Reference scripts](#reference-scripts)
  * [Environment values and special commands](#environment-values-and-special-commands)
  * [Environment and command line argument values](#environment-and-command-line-argument-values)
  * [Launch arguments, command arguments, parameters and arguments](#launch-arguments-command-arguments-parameters-and-arguments)
  * [Concurrent scripts](#concurrent-scripts)
  * [Inline script blocks](#inline-script-blocks)
  * [Conditions and exclusions](#conditions-and-exclusions)
  * [Interactive menu](#interactive-menu)
* [Launcher arguments](#launcher-arguments)
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

Use **launch init** to create the starter **launcher-config.json** and **launcher-menu.json**file.
``` bash
"node_modules/.bin/launch" init
```

Change your **package.json** start script, so it will start script launcher. If you do not want to change your start script, you can also add custom scripts, the name of the custom script is then used as the launch script to start.
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
You are now ready to start use Script Launcher, by running `npm start <<launch script name>>` as described in the examples below.

## Usage examples

Show menu
```
npm start
```

Start a specific launch script
```
npm start serve:dev
npm start build:prd
```
Basically you can now use `npm start` instead of `npm run`.

## Implementation examples
To test an example, copy the json content from the example to the file named **launcher-config.json** and run the script.

### Sequential scripts
This example uses square brackets to start multiple script one by one. This feature makes long script lines more readable.

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

### Change directory
Specify an existing directory as an script command and it will change to that directory for the next scripts to execute. This can be handy if your script have to be run from a different location.

Run `npm start build-stuff` to use this example.
``` JSON
{
  "scripts": {
    "build-stuff": [
      "node_modules/script-launcher",
      "dir"
    ]
  }
}
```

### Parameters and functions
Use the dollar-sign in the script name and command, to specify script function parameter. This feature makes it possible to start one script with different parameters, this works on Mac, Linux and Windows in the same way.

Run `npm start serve:uva:tst` or `npm start serve:hva:prd` etc, to use this example.
``` JSON
{
  "scripts": {
    "serve:$project:$config": "echo ng serve $project -c=$config"
  }
}
```

### Reference scripts
Use an existing script name in the command section to execute another script in your config file. This feature makes it possible to reuse script from other script, with different arguments if desired.

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

*## Environment values and special commands
* LAUNCH_VERSION
* LAUNCH_PLATFORM
* LAUNCH_START
* LAUNCH_CURRENT
* LAUNCH_ELAPSED
* LAUNCH_BLUE
* LAUNCH_BOLD
* LAUNCH_CYAN
* LAUNCH_DIM
* LAUNCH_GREEN
* LAUNCH_NORMAL
* LAUNCH_ORANGE
* LAUNCH_RED
* LAUNCH_YELLOW
* Use "--" to generate a line with the width of the terminal

```JSON
{
  "scripts": {
    "build-stuff": [
      "echo Version: $LAUNCH_VERSION",
      "echo Platform: LAUNCH_PLATFORM",
      "echo Time: $LAUNCH_START",
      "--",
      "echo ${LAUNCH_BLUE}Blue$LAUNCH_NORMAL",
      "echo ${LAUNCH_BOLD}Bold$LAUNCH_NORMAL",
      "echo ${LAUNCH_CYAN}Cyan$LAUNCH_NORMAL",
      "echo ${LAUNCH_DIM}Dim$LAUNCH_NORMAL",
      "echo ${LAUNCH_GREEN}Green$LAUNCH_NORMAL",
      "echo ${LAUNCH_ORANGE}Orange$LAUNCH_NORMAL",
      "echo ${LAUNCH_RED}Red$LAUNCH_NORMAL",
      "echo ${LAUNCH_YELLOW}Yellow$LAUNCH_NORMAL",
      "--",
      "echo Current: $LAUNCH_CURRENT",
      "echo Elapsed: $LAUNCH_ELAPSED"
    ]
  }
}
```

### Environment and command line argument values
Use the dollar-sign in the script command, to references command line arguments and environment variables on Linux, Mac and windows in a consistent manner. It is also possible to set environment variables.

Run `npm start build-stuff arg1 arg2 arg3` to use this example.
``` JSON
{
  "scripts": {
    "build-stuff": [
      "environment=my-env",
      "echo Node version: $npm_config_node_version",
      "echo Argument 1 : $1",
      "echo Argument 2 : $2",
      "echo All arguments: $*",
      "echo Environment : $environment"
    ]
  }
}
```

### Launch arguments, command arguments, parameters and arguments
* **Launch arguments:** These are values passed to `laucher` directly, from the **package.json** script command line, for example: `launch interactive` or `launch menu`
* **Command arguments:** These are values passed from the command line that was used to start the script, for example: `npm start build my-arg1 my-arg2`
* **Parameters:** These are for passing a fixed set of values to a function. Parameters are accessed by their name, for example: `$project`
* **Arguments:** These are for passing dynamic set of values to a function. Arguments are accessed by a number, for example: `$1`

Run `npm start build-stuff:param1:param2 arg1 arg2 arg3` to use this example.

``` JSON
{
  "scripts": {
    "myFunc:$funcParam1:$funcParam2": [
      "echo Function Parameter 1: $funcParam1",
      "echo Function Parameter 2: $funcParam2",
      "echo Function Arguments 1: $1",
      "echo Function Arguments 2: $2",
      "echo Function All arguments: $*"
    ],
    "build-stuff:$myParam1:$myParam2": [
      "echo Parameter 1: $myParam1",
      "echo Parameter 2: $myParam2",
      "echo Arguments 1: $1",
      "echo Arguments 2: $2",
      "echo All arguments: $*",
      "echo -------------------------------------------------------",
      "myFunc:$myParam1:funcParam funcArg $1"
    ]
  }
}
```

### Concurrent scripts
This example uses the **concurrent** keyword to run multiple script in parallel and the **sequential** keyword to start multiple script one by one. This feature is convenient in a development environment, when you want to start development server in the background.

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

### Inline script blocks
This example uses the inline script blocks to run multiple script in parallel and to run multiple script one by one.

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
    "build-stuff": [
      [
        "background:1:3000",
        "background:2:5000"
      ],
      {
        "sequential": [
          "echo Sequential job : 3",
          "sleep:1000",
          "echo Sequential job : 4",
          "sleep:1000"
        ]
      }
    ]
  }
}
```


### Conditions and exclusions
* **condition:** Must evaluate to true or 0 for the corresponding script block to be executed.
* **exclusion:** Must evaluate to false or !0 for the corresponding script block to be executed.

Condition and exclusion can be a string or an array of strings containing a JavaScript expression returning a Boolean, directory name or a shell command.

Run `npm start build-stuff` to use this example.
``` JSON
{
  "scripts": {
    "build-stuff": [
      {
        "exclusion": "node_modules_test",
        "sequential": [
          "echo npm install",
          "mkdir node_modules_test"
        ]
      },
      {
        "condition": "node_modules_test",
        "sequential": [
          "echo npm start",
          {
            "condition": "'$LAUNCH_PLATFORM'==='win32'",
            "sequential": "del /q node_modules_test"
          },
          {
            "condition": "'$LAUNCH_PLATFORM'!=='win32'",
            "sequential": "rm -d node_modules_test"
          }
        ]
      }
    ]
  },
  "options": {
    "logLevel": 3
  }
}
```

### Interactive menu
Use the **menu** section to create an interactive landing menu, so a new developer can get start on your project more easily. The value of the **description** keyword is used as a description of presented values. Use `launch interactive` to ignore the `launcher-custom.json` file.


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

## Launcher arguments
Use the help for a list of available options.
``` bash
"node_modules/.bin/launch" help
```

## Launcher options
The launcher **options** can be used the customize the default behavior of script launcher.

### Launcher files
The **files** options can be used to configure the config files to load when starting launcher. When using multiple files they will be merged together in the loading order. Be aware the `launcher-config.json` is always the first file being loaded even when it is not present in the files list.

By using this option it's possible the split your configuration over multiple files. It's a good practice is to split your script and menu configurations to their own file. You could also include the `package.json` file in this list, then you can use the strength of script launcher in your `package.json` file.

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
The **script shell** options can be used to configure the spawn shell, this value is passed to the [options shell](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options) of the node **child_process.spawn** method. If you want to specify a shell for a specific platform, use one of the [platform names](https://nodejs.org/api/process.html#process_process_platform) as a nested object name. If there is no platform name match found the default will be used.

Example shell option for specific platform
``` JSON
"options": {
  "script": {
    "shell": {
      "aix":"bash",
      "darwin":"bash",
      "freebsd":"bash",
      "linux":"bash",
      "openbsd":"bash",
      "sunos":"bash",
      "win32":"cmd.exe",
      "default":"bash"
    }
  }
}
```

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

### Logging
The **logLevel** option is used for configuring the script launcher log level, available values are: 0=disabled  1=info  2=log  2=debug

The default value is presented in the following example:
``` JSON
"options": {
  "logLevel": 0
}
```





* Special script command "--" added to generate a line with the width of the terminal
* Added support for bracket accolade environment variable names like ${LAUNCH_VERSION}
