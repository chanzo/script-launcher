# Script Launcher

[![NPM version][npm-image]][npm-url]
[![GitHub last commit][github-last-commit]](#)
[![Downloads][downloads-image]][npm-url]
[![Dependency status][david-dm-image]][david-dm-url]
[![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url]
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

Enhance your **package.json** scripts with features like: menus, functions, arrays, concurrency and many more. The features of Script Launcher are specialized in such a way, that working with Mac, Linux and Windows can be seamless experience.

![alt text](usage-animation.gif 'Script Launcher usage example')

## Table of Contents

- [Installation](#installation)
- [Usage examples](#usage-examples)
- [Migrate package.json scripts](#migrate-packagejson-scripts)
- [Motivation](#motivation)
- [Implementation examples](#implementation-examples)
  - [Sequential scripts](#sequential-scripts)
  - [Change directory](#change-directory)
  - [Parameters and functions](#parameters-and-functions)
  - [Reference scripts](#reference-scripts)
  - [Reference scripts by using wildcards](#reference-scripts-by-using-wildcards)
  - [Environment and command line argument values](#environment-and-command-line-argument-values)
  - [Environment String Manipulation and Expanding Variables](#environment-string-manipulation-and-expanding-variables)
  - [Launch arguments, command arguments, parameters and arguments](#launch-arguments-command-arguments-parameters-and-arguments)
  - [Escaping characters](#escaping-characters)
  - [Environment values and special commands](#environment-values-and-special-commands)
  - [Glob patterns](#glob-patterns)
  - [Concurrent scripts](#concurrent-scripts)
  - [Inline script blocks](#inline-script-blocks)
  - [Confirmation prompt](#confirmation-prompt)
  - [Condition and exclusion constraints](#condition-and-exclusion-constraints)
  - [Repeaters (String)](#repeaters-string)
  - [Repeaters (Object)](#repeaters-object)
  - [Interactive menu](#interactive-menu)
  - [Menu save default script](#menu-save-default-script)
- [Launcher arguments](#launcher-arguments)
  - [Launcher Options: dry](#launcher-options-dry)
  - [Launcher Command: init](#launcher-command-init)
  - [Launcher Command: migrate](#launcher-command-migrate)
  - [Launcher Command: script](#launcher-command-script)
  - [Launcher Command: list](#launcher-command-list)
- [Launcher settings](#launcher-settings)
- [Launcher options](#launcher-options)
  - [Launcher files](#launcher-files)
  - [Script shell](#script-shell)
  - [Glob Options](#glob-options)
  - [Menu options](#menu-options)
  - [Logging](#logging)
  - [Limit Concurrency](#limit-concurrency)
- [Enable tab completion](#enable-tab-completion)

## Installation

Install **script-launcher** as a development dependency in your project.

```bash
npm install script-launcher --save-dev
```

Use **launch init** to create a starter configuration based on one of the available templates.

```bash
npx launch init basic
```

If not already done so, change your **package.json** start script, so it will start Script Launcher. If you do not want to change your start script, you can also add [custom run scripts](#start-a-specific-launch-script-by-using-the-npm-run) for starting Script Launcher.

Example: **package.json**

```text
{
    ...
    "scripts": {
        "start": "launch",
        ...
    },
    ...
}
```

You are now ready to start use Script Launcher by running: `npm start` or `npm start serve:dev`.

## Usage examples

### Show menu

```bash
npm start
```

You can also show the menu by running: `npx launch`

<details>
  <summary><strong>Output:</strong></summary>

```text
✔ Select action › serve
✔ Select environment › acc
✔ Are you sure … yes

Executing: npm start serve:acc

Serve acc command.
```

</details>
&nbsp;

### Start a specific launcher script

```bash
npm start serve:dev
npm start build:production
```

Basically you can now use `npm start` instead of `npm run`.

<details>
  <summary><strong>Output:</strong></summary>

```text
Serve dev command.
Build production command.
```

</details>
&nbsp;

### List available launcher scripts

```bash
npx launch list
```

<details>
  <summary><strong>Output:</strong></summary>

```text
build:acc
build:dev
build:production
serve:acc
serve:dev
serve:production
```

</details>
&nbsp;

### Start a specific launch script, by using the `npm run`

For a cusom run script to work, you have to add a script to your **package.json** file, make sure there is a similar named script in your **launcher-config.json** file.

Example: **package.json**

```text
{
    ...
    "scripts": {
        "lint": "launch",
        "test": "launch",
        ...
    },
    ...
}
```

Example: **launcher-config.json**

```json
{
  "scripts": {
    "lint": "echo Linting code...",
    "test": "echo Testing code..."
  }
}
```

Example run commands

```bash
npm run lint
npm run test
```

## Migrate package.json scripts

Make sure all your repository changes are fully committed so you can undo the changes easily if they do not suit your needs. Remove or rename the start script in your **package.json** file.

Now your are ready to migrate your **package.json** scripts to **launcher-config.json** scripts. By executing the command:

```bash
npx launch migrate
```

Migrate using parameter migration option:

```bash
npx launch migrate --params
```

## Motivation

In a traditional **package.json** you can only run scripts on a per line basis. With larger projects that have multiple environments, this can quickly become a hassle and difficult to maintain, like the example below:

```json
// Traditional package.json scripts //
{
  "scripts": {
    "build:uva:dev": "ng build uva -c=dev --prod",
    "build:uva:tst": "ng build uva -c=tst --prod",
    "build:uva:acc": "ng build uva -c=acc --prod",
    "build:uva:prd": "ng build uva -c=prd --prod",
    "build:hva:dev": "ng build hva -c=dev --prod",
    "build:hva:tst": "ng build hva -c=tst --prod",
    "build:hva:acc": "ng build hva -c=acc --prod",
    "build:hva:prd": "ng build hva -c=prd --prod",
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
    "deploy:prd": "npm run deploy:uva:prd && npm run deploy:hva:prd"
  }
}
```

With **script-launcher** you have the benefits of using variables, script references and many more features, so you can make the above example easier to maintain:

```json
// Example when using the Script Launcher migrate command:
// npx launch migrate --params
{
  "scripts": {
    "build:$project:$config": "ng build $project -c=$config --prod",
    "deploy:$project:$config": [
      "build:$project:$config",
      "firebase deploy --public dist/$project --project status-$project-$config"
    ],
    "deploy:$config": [
      "deploy:uva:$config",
      "deploy:hva:$config"
    ]
  }
}
```

To start this example you would use: `npm start build:uva:tst`, `npm start deploy:prd` etc.

It's also possible to extend the example with an interactive menu, so a new developer can get start on your project more easily:

```json
{
  "menu": {
    "description": "deploy organization",
    "uva:University of Amsterdam.": {
      "description": "deploy environment",
      "acceptance": "deploy:uva:acc",
      "production": "deploy:uva:tst"
    },
    "hva:Amsterdam University of Applied Sciences.": {
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
}
```

You would use: `npm start` to start the menu.

## Implementation examples

To test an example, copy the json content from the example to the file named **launcher-config.json** and run the script.

### Sequential scripts

This example uses square brackets to start multiple script one by one. This feature will make long script lines more readable.

**Create file**: launcher-config.json

```json
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

**Run**: `npm start build-stuff`

<details>
  <summary><strong>Output:</strong></summary>

```text
Build step 1
Build step 2
Build step 3
```

</details>
&nbsp;

### Change directory

Specify an existing directory as an script command and it will change to that directory for the next scripts it executes. This can be handy if your script have to be run from within a different location.

**Create file**: launcher-config.json

```json
{
  "scripts": {
    "build-stuff": [
      "node_modules/script-launcher",
      "echo *.js"
    ]
  }
}
```

**Run**: `npm start build-stuff`

<details>
  <summary><strong>Output:</strong></summary>

```text
common.js config-loader.js executor.js launch-menu.js launch.js logger.js scripts.js spawn-process.js variables.js
```

</details>
&nbsp;

### Parameters and functions

Use the dollar-sign in the script id and command, to specify script function parameter. You can specify a default value by using the equal sign. This feature makes it possible to start one script with different parameters.

**Create file**: launcher-config.json

```json
{
  "scripts": {
    "serve:$project=uva:$config=dev": "echo ng serve $project -c=$config"
  }
}
```

**Run**: `npm start serve` , `npm start serve::tst` or `npm start serve:hva:prd` etc.

<details>
  <summary><strong>Output:</strong></summary>

```text
ng serve uva -c=dev
```

```text
ng serve uva -c=tst
```

```text
ng serve hva -c=prd
```

</details>
&nbsp;

### Reference scripts

Use an existing script id in the command section to execute another script in your config file. This feature makes it possible to reuse scripts from another script, with different arguments if desired.

**Create file**: launcher-config.json

```json
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

**Run**: `npm start deploy:tst`

<details>
  <summary><strong>Output:</strong></summary>

```text
ng build uva -c=tst
firebase deploy --public dist/uva -P uva-tst
ng build hva -c=tst
firebase deploy --public dist/hva -P hva-tst
```

</details>
&nbsp;

### Reference scripts by using wildcards

Use wildcards '\*' to select multiple scripts. Wildcards cannot be used for selecting function by there parameters, this will result in a parameter containing the wildcard..

**Create file**: launcher-config.json

```json
{
  "scripts": {
    "build:css": "echo Building: .css files",
    "build:js": "echo Building: .js files",
    "build:html": "echo Building: .html files",
    "build:all": {
      "concurrent": [
        "build:*"
      ]
    }
  }
}
```

**Run**: `npm start build:*` , `npm start build:all` or `npx launch --concurrent build:*`

<details>
  <summary><strong>Output:</strong></summary>

```text
Building: .css files
Building: .js files
Building: .html files
```

</details>
&nbsp;

### Environment and command line argument values

Use the dollar-sign in the script command, to references command line arguments and environment variables on Linux, Mac and windows in a consistent manner. It is also possible to set environment variables and use aliases.

For compatibility reasons: when using a script id that is equal to the command being executed, all arguments are appended automatically.

**Create file**: launcher-config.json

```json
{
  "scripts": {
    "build-stuff": [
      "environment=my-env",
      "package=$npm_package",
      "echo Package version: $package_version",
      "echo Package version: $npm_package_version",
      "echo Argument 1 : $1",
      "echo Argument 2 : $2",
      "echo",
      "echo All arguments: $*",
      "echo Offset arguments: $2*",
      "echo Environment : $environment"
    ],
    "echo": "echo"
  }
}
```

In this example **node** will be an alias for **$npm_config_node**. So **$node_version** corresponds to **$npm_config_node_version**

**Run**: `npm start build-stuff arg1 arg2 arg3` or `npm start echo arg1 arg2 arg3`

<details>
  <summary><strong>Output:</strong></summary>

```text
Package version: 1.37.3
Package version: 1.37.3
Argument 1 : arg1
Argument 2 : arg2
All arguments: arg1 arg2 arg3
Offset arguments: arg2 arg3
Environment : my-env
```

```text
arg1 arg2 arg3
```

</details>
&nbsp;

### Environment String Manipulation and Expanding Variables

| Pattern                | Description                                      |
| ---------------------- | ------------------------------------------------ |
| ${var:num1:num2}       | Substring                                        |
| ${var/pattern/string}  | Find and replace (only replace first occurrence) |
| ${var//pattern/string} | Find and replace all occurrences                 |
| ${var,}                | Convert first character to lowercase.            |
| ${var,,}               | Convert all characters to lowercase.             |
| ${var^}                | Convert first character to uppercase.            |
| ${var^^}               | Convert all character to uppercase..             |

**Create file**: launcher-config.json

```json
{
  "scripts": {
    "build-stuff": [
      "var=app-uva=hva-prd",
      "echo ${var::-8}",
      "echo ${var:8}",
      "echo ${var:4:7}",
      "echo ${var/-/=}",
      "echo ${var//-/=}",
      "echo ${var^^}",
      "echo ${var^}",
      "var=APP-UVA=HVA-PRD",
      "echo ${var,,}",
      "echo ${var,}",
      "echo ${*^^}",
      "echo ${2*,}"
    ]
  }
}
```

**Run**: `npm start build-stuff arg1 ARG2 arg3`

<details>
  <summary><strong>Output:</strong></summary>

```text
app-uva
hva-prd
uva=hva
app=uva=hva-prd
app=uva=hva=prd
APP-UVA=HVA-PRD
App-uva=hva-prd
app-uva=hva-prd
aPP-UVA=HVA-PRD
ARG1 ARG2 ARG3
aRG2 arg3
```

</details>
&nbsp;

### Launch arguments, command arguments, parameters and arguments

- **Launch arguments:** These are values passed to `laucher` directly, for example: `launch init` or `launch version`
- **Command arguments:** These are values passed from the command line that was used to start the script, for example: `npm start build my-arg1 my-arg2`
- **Function arguments:** These are values passed from scripts to a function. Arguments are accessed by a number, for example: `$1`
- **Parameters:** These are for passing a fixed set of values to a function. Parameters are accessed by their name, for example: `$project`

**Create file**: launcher-config.json

```json
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
      "--",
      "echo Main Parameter 1: $myParam1",
      "echo Main Parameter 2: ${myParam2}",
      "echo Main Arguments 1: $1",
      "echo Main Arguments 2: $2",
      "echo Main All arguments: $*",
      "echo Main Offset arguments: $2*",
      "--",
      "myFunc:$myParam1:funcParam funcArg $1",
      "--"
    ]
  }
}
```

**Run**: `npm start build-stuff:param1:param2 arg1 arg2 arg3`

<details>
  <summary><strong>Output:</strong></summary>

```text
--------------------------------
Main Parameter 1: param1
Main Parameter 2: param2
Main Arguments 1: arg1
Main Arguments 2: arg2
Main All arguments: arg1 arg2 arg3
Main Offset arguments: arg2 arg3
--------------------------------
Function Parameter 1: param1
Function Parameter 2: funcParam
Function Arguments 1: funcArg
Function Arguments 2: arg1
Function All arguments: funcArg arg1
--------------------------------
```

</details>
&nbsp;

### Escaping characters

Use a backslash in the script command, to escaping variables.

**Create file**: launcher-config.json

```json
{
  "scripts": {
    "escaping": [
      "echo '\\$1                    ' : '$1'",
      "echo '\\$npm_package_version  ' : '$npm_package_version'",
      "echo '\\${1}                  ' : '${1}'",
      "echo '\\${npm_package_version}' : '${npm_package_version}'"
    ]
  }
}
```

**Run**: `npm start escaping arg1`

<details>
  <summary><strong>Output:</strong></summary>

```text
$1                     : arg1
$npm_package_version   : 1.37.3
${1}                   : arg1
${npm_package_version} : 1.37.3
```

</details>
&nbsp;

### Environment values and special commands

| Pattern                 | Type        | Description                                                                                   |
| ----------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| **launch_version**      | Environment | Launcher Version number                                                                       |
| **launch_platform**     | Environment | Operating system **[platform](https://nodejs.org/api/process.html#process_process_platform)** |
| **launch_time_start**   | Environment | Start time                                                                                    |
| **launch_time_current** | Environment | Current time                                                                                  |
| **launch_time_elapsed** | Environment | Elapsed time                                                                                  |
| **launch_style_blue**   | Environment | <span style="color:#0000FF">**Blue text**</span>                                              |
| **launch_style_bold**   | Environment | **Bold text**                                                                                 |
| **launch_style_cyan**   | Environment | <span style="color:#00FFFF">**Cyan text**</span>                                              |
| **launch_style_dim**    | Environment | <span style="color:#707070">**Dim text**</span>                                               |
| **launch_style_green**  | Environment | <span style="color:#00FF00">**Green text**</span>                                             |
| **launch_style_normal** | Environment | Nomal text                                                                                    |
| **launch_style_red**    | Environment | <span style="color:#FF0000">**Red text**</span>                                               |
| **launch_style_yellow** | Environment | <span style="color:#FFFF00">**Yellow text**</span>                                            |
| **"echo"**              | Command     | Output an empty line                                                                          |
| **""**                  | Command     | Output an empty line                                                                          |
| **"--"**                | Command     | Line with the width of the terminal                                                           |
| **" \|\| true"**        | Command     | Added at the end of a command to suppress errors                                              |
| **"#"**                 | Command     | Added at the begining for a line to disable execution                                         |
| **"\|?"**               | Command     | Grep like functionality                                                                       |

**Create file**: launcher-config.json

```json
{
  "scripts": {
    "build-stuff": {
      "condition": "echo grep example |? example",
      "sequential-then": [
        "echo ${launch_style_bold}Version:$launch_style_normal $launch_version",
        "echo ${launch_style_bold}Platform:$launch_style_normal $launch_platform",
        "echo ${launch_style_bold}Time:$launch_style_normal $launch_time_start",
        "--",
        "echo Color: ${launch_style_blue}Blue$launch_style_normal",
        "echo Color: ${launch_style_bold}Bold$launch_style_normal",
        "echo",
        "echo Color: ${launch_style_cyan}Cyan$launch_style_normal",
        "echo Color: ${launch_style_dim}Dim$launch_style_normal",
        "",
        "# The error of the next action will be suppressed",
        "exit 1 || true",
        "echo Color: ${launch_style_green}Green$launch_style_normal",
        "echo Color: ${launch_style_red}Red$launch_style_normal",
        "echo Color: ${launch_style_yellow}Yellow$launch_style_normal",
        "--",
        "echo ${launch_style_bold}Current:$launch_style_normal $launch_time_current",
        "echo ${launch_style_bold}Elapsed:$launch_style_normal $launch_time_elapsed"
      ]
    }
  }
}
```

**Run**: `npm start build-stuff`

<details>
  <summary><strong>Output:</strong></summary>

```text
grep example
Version: $version
Platform: $platform
Time: 2019-09-16 10:33:20.628
--------------------------------
Color: Blue
Color: Bold
Color: Cyan
Color: Dim

Color: Green
Color: Red
Color: Yellow
--------------------------------
Current: 2019-09-16 10:33:42.285
Elapsed: 137ms
```

</details>
&nbsp;

### Glob patterns

Script Launcher makes use of the [Glob](https://www.npmjs.com/package/glob) package, so you can use any of the supported glob patterns in your scripts.

**Create file**: launcher-config.json

```json
{
  "scripts": {
    "build-stuff": [
      "node_modules/script-launcher",
      "echo Javascript files files: *.js",
      "echo Markdown files: **/*.md"
    ]
  }
}
```

**Run**: `npm start build-stuff`

<details>
  <summary><strong>Output:</strong></summary>

```text
Javascript files files: common.js config-loader.js executor.js launch-menu.js launch.js logger.js scripts.js spawn-process.js variables.js
Markdown files: README.md
```

</details>
&nbsp;

### Concurrent scripts

This example uses the **concurrent** keyword to run multiple script in parallel and the **sequential** keyword to start multiple script one by one. This feature is convenient in a development environment, when you want to start development server in the background.

Use the `limit` [argument](#launcher-arguments) or [option](#limit-concurrency) to limit the number of commands to execute in parallel..

**Create file**: launcher-config.json

```json
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

**Run**: `npm start build-stuff`

<details>
  <summary><strong>Output:</strong></summary>

```text
Background job : 1
Background job : 2
Sequential job : 3
Sequential job : 4
Completed job : 1
Completed job : 2
```

</details>
&nbsp;

### Inline script blocks

This example uses the inline script blocks to run multiple script in parallel and to run multiple script one by one.

**Create file**: launcher-config.json

```json
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

**Run**: `npm start build-stuff`

<details>
  <summary><strong>Output:</strong></summary>

```text
Background job : 1
Background job : 2
Completed job : 1
Completed job : 2
Sequential job : 3
Sequential job : 4
```

</details>
&nbsp;

### Confirmation prompt

Confirmation prompts can be used for asking a confirmation to continue. Use the **confirm** argument to auto confirm.

**Create file**: launcher-config.json

```json
{
  "scripts": {
    "build-stuff": {
      "confirm": "Are you sure you want to continue",
      "sequential-then": "echo You are sure!",
      "sequential-else": "echo You are not sure!"
    }
  }
}
```

**Run**: `npm start build-stuff` , `npx launch build-stuff confirm` or `npx launch build-stuff --confirm=false`

<details>
  <summary><strong>Output:</strong></summary>

```text
✔ Are you sure you want to continue ... yes
You are sure!
```

```text
✔ Are you sure you want to continue ... yes
You are sure!
```

```text
✔ Are you sure you want to continue ... no
You are not sure!
```

</details>
&nbsp;

### Condition and exclusion constraints

- **condition:** Must evaluate to true or 0 for the corresponding script block to be executed.
- **exclusion:** Must evaluate to false or !0 for the corresponding script block to be executed.

The value of the **condition** and **exclusion** statement can be a string or an array of strings containing a JavaScript expression returning a Boolean, directory name or a shell command.

**Create file**: launcher-config.json

```json
{
  "scripts": {
    "build-stuff": [
      {
        "exclusion": "node_modules_test",
        "sequential-then": [
          "echo npm install",
          "mkdir node_modules_test"
        ]
      },
      {
        "condition": "node_modules_test",
        "sequential-then": [
          "echo npm start",
          {
            "condition": "'$launch_platform'==='win32'",
            "sequential": "echo Test platform type.",
            "sequential-then": "rmdir node_modules_test",
            "sequential-else": "rm -d node_modules_test"
          }
        ]
      }
    ]
  },
  "options": {
    "logLevel": 2
  }
}
```

**Run**: `npm start build-stuff`

<details>
  <summary><strong>Output:</strong></summary>

```text
/bin/sh: 1: node_modules_test: not found
npm install
npm start
Test platform type.
```

</details>
&nbsp;

### Repeaters (String)

The **repeater** statement must contain a reference to a settings array. The corresponding script block will be executed for each instance in the settings array.

Example using a string array.
**Create file**: launcher-config.json

```json
{
  "scripts": {
    "ping": [
      {
        "repeater": "$launch_setting_servers",
        "sequential": [
          "echo Action: $launch_setting_command $_"
        ]
      }
    ]
  },
  "settings": {
    "command": "ping",
    "servers": [
      "www.google.com",
      "duckduckgo.com",
      "bing.com"
    ]
  }
}
```

**Run**: `npm start ping`

<details>
  <summary><strong>Output:</strong></summary>

```text
Action: ping www.google.com
Action: ping duckduckgo.com
Action: ping bing.com
```

</details>
&nbsp;

### Repeaters (Object)

Example using an object array.
**Create file**: launcher-config.json

```json
{
  "scripts": {
    "ping": [
      {
        "repeater": "$launch_setting_servers",
        "sequential": [
          "echo $_name",
          "--",
          "echo Action: $launch_setting_command $_host",
          ""
        ]
      }
    ]
  },
  "settings": {
    "command": "ping",
    "servers": [
      {
        "name": "Google",
        "host": "www.google.com"
      },
      {
        "name": "DuckDuckGo",
        "host": "duckduckgo.com"
      },
      {
        "name": "Bing",
        "host": "bing.com"
      }
    ]
  }
}
```

**Run**: `npm start ping`

<details>
  <summary><strong>Output:</strong></summary>

```text
Google
--------------------------------
Action: ping www.google.com

DuckDuckGo
--------------------------------
Action: ping duckduckgo.com

Bing
--------------------------------
Action: ping bing.com

```

</details>
&nbsp;

### Interactive menu

Use the **menu** section to create an interactive landing menu, so a new developer can get start on your project more easily.

- **description** keyword is used as a description of presented values.
- Use a colon to separate the menu item name and description.

The **options.menu.timeout** can be used to auto close the menu after a specified time. Use the [Menu options](#menu-options) section for more information on all the available options.

**Create file**: launcher-config.json

```json
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
    "uva:University of Amsterdam.": {
      "description": "environment",
      "development": "serve:uva:dev",
      "acceptance": "serve:uva:acc",
      "production": "serve:uva:prd"
    },
    "hva:Amsterdam University of Applied Sciences.": {
      "description": "environment",
      "development:Builds and serves your app for development.": "serve:hva:dev",
      "acceptance:Builds and serves your app for acceptance.": "serve:hva:acc",
      "production:Builds and serves your app for production.": "serve:hva:prd"
    }
  },
  "options": {
    "menu": {
      "defaultChoice": "hva:development"
    }
  }
}
```

**Run**: `npm start menu uva:acceptance` , `npm start menu` or `npm start`

<details>
  <summary><strong>Output:</strong></summary>

```text
? Select organization › - Use arrow-keys. Return to submit.
❯   uva - University of Amsterdam.
    hva

✔ Select organization › uva
? Select environment › - Use arrow-keys. Return to submit.
    development
❯   acceptance
    production

✔ Select environment › acceptance

Executing: npm start serve:uva:acc

ng serve uva -c=acc
```

```text
? Select organization › - Use arrow-keys. Return to submit.
    uva
❯   hva - Amsterdam University of Applied Sciences.

✔ Select organization › hva

Executing: npm start serve:hva:dev

Start development server
ng serve hva -c=dev
```

</details>
&nbsp;

### Menu save default script

Use the **menu** section options to specify a **defaultScript**, this will disable the interactive menu.

Best practices is to specify the menu default options in the **launcher-custom.json** file, and add this file the your **.gitignore**. Now every developer can customize its menu without interfering with the project defaults.

Use `npm start menu` to ignore the **defaultScript** option, so the menu will be interactive.

**Create file**: launcher-config.json

```json
{
  "scripts": {
    "serve:$environment": "echo Serve script: $environment",
    "build:$environment": "echo Build script: $environment"
  },
  "menu": {
    "description": "organization",
    "uva:University of Amsterdam.": {
      "description": "environment",
      "serve": "serve:uva",
      "build": "build:uva"
    },
    "hva:Amsterdam University of Applied Sciences.": {
      "description": "environment",
      "serve": "serve:hva",
      "build": "build:hva"
    }
  },
  "options": {
    "menu": {
      "defaultScript": "build:hva"
    }
  }
}
```

**Run**: `npm start`

<details>
  <summary><strong>Output:</strong></summary>

```text
Auto menu:                               (Use the menu by running: npm start menu)
Executing: npm start build:hva

Build script: hva
```

</details>
&nbsp;

## Launcher arguments

Use the **help** for a list of available options.

**Run**: `npx launch help`

```bash
Usage: launch [command] [options...]

Commands:
  init         [template] Create starter config files.
  list         [type] List available launcher scripts.
  migrate      Migrate your package.json scripts.
  help         Show this help.
  version      Outputs launcher version.

Options:
  logLevel=    Set log level.
  dry=         Do not execute commands.
  config=      Merge in an extra config file.
  confirm=     Auto value for confirm conditions.
  ansi=        Enable or disable ansi color output.
  directory=   The directory from which configuration files are loaded.
  menuTimeout= Set menu timeout in seconds.
  params=      Set the number of parameters to preserve.
  concurrent=  Execute commandline wildcard matches in parallel.
  limit=       Limit the number of commands to execute in parallel.
```

## Launcher Options: dry

**Run**: `npx launch build:css build:js --dry` this will execute a dry run on the **build:css** and **build:js** script

```bash
Loaded config:  launcher-config.json

Date              : 2019-09-16 10:33:20.628
Version           : 1.37.3
Launch script     : [ 'build:css', 'build:js' ]
Launch arguments  : [ '--directory=./tests/temp/0052', 'build:css', 'build:js', '--dry' ]

Script id       : build:css
Circular        : false
Script params   : {}
Script args     : [ 'build:css' ]

Dry Command     : 'echo Building: .css files '
Dry Command     : 'echo Building: .js files '

ExitCode: 0
Elapsed: 237ms
```

### Launcher Command: init

Use the **init** command to create a starter configuration for you project.

**Run**: `npx launch init` this will list the available templates

```bash
Available templates:

angular
basic
blank

Example usage: npx launch init basic
```

**Run**: `npx launch init basic` this will create a basic starter configuration

```bash
Create starter config: basic

Creating: launcher-config.json
Creating: launcher-menu.json

Updating package.json.

Start script of package.json updated.
```

### Launcher Command: migrate

Use the **migrate** command to convert your **package.json** script to a script-launcher configuration. Use the **params** option the parameterize your script functions.

**Run**: `npx launch migrate --params=1` this will convert your **package.json** scripts

```bash
Migrating: package.json

Script to migrate: 12
Script to update: 2

✔ Are you sure ... yes

Updating: package.json
Creating: launcher-menu.json
Creating: launcher-config.json
```

### Launcher Command: script

Start one or more script directly from the command line sequentially or concurrently

**Run**: `npx launch build:css build:js` to start one or more script in sequence

```bash
Building: .css files
Building: .js files
```

**Run**: `npx launch build:css build:js --concurrent` to start one ore more script in parallel

```bash
Building: .css files
Building: .js files
```

### Launcher Command: list

Use the **list** command to display the available scripts. This can be used for [enabling tab completion](#enable-tab-completion).

**Run**: `npx launch list complete` for listing scripts that can be used for tab completion. This is the default value.

```bash
serve:hva:acc
serve:hva:dev
serve:hva:prd
serve:uva:acc
serve:uva:dev
serve:uva:prd
```

**Run**: `npx launch list script` for listing available scripts.

```bash
serve:$project:$config
serve:$project:dev
```

**Run**: `npx launch list menu` for listing available menu scripts.

```bash
serve:hva:acc
serve:hva:dev
serve:hva:prd
serve:uva:acc
serve:uva:dev
serve:uva:prd
```

## Launcher settings

The launcher settings can be used to specify named values that can be used by the launcher scripts. Consult the [repeaters](#repeaters-string) implementation examples section for more information on repeaters.

**Create file**: launcher-config.json

```json
{
  "scripts": {
    "build:$config": [
      "settings=$launch_setting_${config}",
      "echo name: $launch_setting_name",
      "echo version: $settings_version",
      "echo ng build -c=$config --deploy-url $settings_url",
      "",
      {
        "repeater": "$launch_setting_${config}_server",
        "sequential": [
          "echo Deploying to: $_"
        ]
      }
    ]
  },
  "settings": {
    "name": "example",
    "dev": {
      "version": "2.0.0",
      "url": "$launch_setting_name.dev.com",
      "server": [
        "server1.dev.com",
        "server2.dev.com"
      ]
    },
    "acc": {
      "version": "1.9.0",
      "url": "$launch_setting_name.acc.com",
      "server": [
        "server1.acc.com",
        "server2.acc.com"
      ]
    },
    "production": {
      "version": "1.8.0",
      "url": "$launch_setting_name.prd.com",
      "server": [
        "server1.prd.com",
        "server2.prd.com"
      ]
    }
  }
}
```

**Run**: `npm start build:dev` , `npm start build:acc` or `npm start build:production`

<details>
  <summary><strong>Output:</strong></summary>

```text
name: example
version: 2.0.0
ng build -c=dev --deploy-url example.dev.com

Deploying to: server1.dev.com
Deploying to: server2.dev.com
```

```text
name: example
version: 1.9.0
ng build -c=acc --deploy-url example.acc.com

Deploying to: server1.acc.com
Deploying to: server2.acc.com
```

```text
name: example
version: 1.8.0
ng build -c=production --deploy-url example.prd.com

Deploying to: server1.prd.com
Deploying to: server2.prd.com
```

</details>
&nbsp;

## Launcher options

The launcher **options** can be used the customize the default behavior of Script Launcher.

### Launcher files

The **files** options can be used to configure the config files to load when starting launcher. When using multiple files they will be merged together in the loading order. Be aware the `launcher-config.json` is always the first file being loaded even when it is not present in the files list.

By using this option it's possible the split your configuration over multiple files. It's a good practice is to split your script and menu configurations to their own file. You could also include the `package.json` file in this list, then you can use the strength of Script Launcher in your `package.json` file.

The default value of this list is presented in the following example:

```text
{
  "scripts": {
    ...
  },
  "options": {
    "files": [
      "launcher-config.json",
      "launcher-scripts.json",
      "launcher-settings.json",
      "launcher-menu.json",
      "launcher-custom.json",
    ]
  }
}
```

### Script shell

The **script shell** options can be used to configure the spawn shell, this value is passed to the [options shell](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options) of the node **child_process.spawn** method. If you want to specify a shell for a specific platform, use one of the [platform names](https://nodejs.org/api/process.html#process_process_platform) as a nested object name. If there is no platform name match found the default will be used.

Example shell option for specific platform

```text
{
  "scripts": {
    ...
  },
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
}
```

The default value is presented in the following example:

```text
{
  "scripts": {
    ...
  },
  "options": {
    "script": {
      "shell": true
    }
  }
}
```

### Glob Options

[Official documentation of the `fast-glob` options](https://www.npmjs.com/package/fast-glob#options-3)
If the _nonull_ script-launcher option is set, and no match was found, then the match contains the original pattern.

```json
{
  "options": {
    "glob": {
      "nonull": false
    }
  }
}
```

### Menu options

- **defaultChoice:** Specify the default chosen entries of your menu, separated by a colon.
- **defaultSelect:** Specify the default selected entries of your menu, separated by a colon.
- **defaultScript:** Auto start a specific script, this will disable the interactive menu.
- **timeout:** Auto close/select a menu value after a specified time.
- **confirm:** Enable disable menu confirmation prompt.

The default value is presented in the following example:

```text
{
  "scripts": {
    ...
  },
  "options": {
    "menu": {
      "defaultChoice": "",
      "defaultSelect": "",
      "defaultScript": "",
      "timeout": 0,
      "confirm" :true
    }
  }
}
```

### Logging

The **logLevel** option is used for configuring the Script Launcher log level, available values are: 0=disabled 1=info 2=log 3=debug

The default value is presented in the following example:

```text
{
  "scripts": {
    ...
  },
  "options": {
    "logLevel": 0
  }
}
```

### Limit Concurrency

Use the **limit** option to limit the number of commands to execute in parallel. When using the value 0 the number of available cpus will be used.

The default value is presented in the following example:

```text
{
  "scripts": {
    ...
  },
  "options": {
    "limit": 0
  }
}
```

### Dry Run

Use the **dry** option to prevent the execution of the scripts.

The default value is presented in the following example:

```text
{
  "scripts": {
    ...
  },
  "options": {
    "dry": false
  }
}
```

### Enable tab completion

To enable tab completion for **script-launcher** in your current terminal, execute the following commands. This will test if you are using tab completion on `npm start` if so, it will execute `npx launch list completion` if not, it will execute the default npm completion function `_npm_completion`.

```bash
eval "$(npm completion)"

_launch_completion () {
  if [[ $COMP_LINE != "npm start"* ]] ; then
    _npm_completion
  else
    npx --quiet --no-install launch list
  fi
}
complete -o default -F _launch_completion npm
```
