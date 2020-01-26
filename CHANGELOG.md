# Change Log

## 1.25.3
### Changes
* Added extra command line unit tests
* Updated some error handling
* Updated def dependencies
* Added **--confirm** support for the migrate action

## 1.25.2
### Breaking
* Removed the '--script=' argument, script can now be started directly
#### Old command line syntax
``` bash
npx launch --script=myScript
```

#### New command line syntax
``` bash
npx launch myScript
```

### Changes
* Added support for starting multiple script from the command line, sequential or concurrent.
#### Start script sequential
``` bash
npx launch myScript1 myScript2 build:* -- myArg1 myArg2 myArg3
```

#### Start script concurrent
``` bash
npx launch --concurrent myScript1 myScript2 build:* -- myArg1 myArg2 myArg3
```

## 1.25.1
### Changes
* Added test when using wildcard and arguments

### Fixes
* Fix related to circular script detection
* Fix related to passing parameters when using wildcard

## 1.25.0
### Breaking
* Empty action will no longer result in a error

### Changes
* Added support for using wildcard characters when referring to script
* Updated circular script detection
* Updated def dependencies

## 1.24.1
* Bug fix for command split with quotes and spaced

## 1.24.0
* Switched form **[glob](https://www.npmjs.com/package/glob)** to **[fast-glob](https://www.npmjs.com/package/fast-glob)** in regards of [issue #63](https://github.com/chanzo/script-launcher/issues/63)
* Added extra globbing unit tests

## 1.23.1
* Implemented workaround for issue #63 by removing glob escaping for Windows example: './node_modules//*/*//*.md'
* Implemented workaround for issue #63 by adding `?()` to the pattern on windows: './node_modules/typescript/\\*.md'
* Updated unit tests for Windows

## 1.23.0
* Updated dev dependencies
* Added unit tests for testing created files
* Added unit tests for parameter migration
* Added parameter migration support 
* Added params argument

## 1.22.9
* Updated the error message when launcher script not found.
* Updated readme file.
* Fix integration tests on Windows

## 1.22.8
* Added message when no menu available.
* When using the migrate option example description `...` is generated for the first menu level

## 1.22.7
* Updated dependencies
* Migrate now supports semicolon.
* Migrate now supports the `cd` command.

### Before migrate: `package.json`
``` JSON
{
  "scripts": {
    "serve:dev:uva": "echo serve && cd node_modules && echo dev && echo uva",
    "serve:acc:uva": "echo serve ;  cd node_modules ;  echo acc ;  echo uva"
  }
}
```

### After migrate: `launcher-config.json`
``` JSON
{
  "scripts": {
    "serve:dev:uva": [
      "echo serve",
      "node_modules",
      "echo dev",
      "echo uva"
    ],
    "serve:acc:uva": [
      "echo serve || true",
      "node_modules",
      "echo acc || true",
      "echo uva"
    ]
  }
}
```

## 1.22.6
### Changes
* Updated starter templates

## 1.22.5
### Changes
* test fix for daylight saving
* Dependencies updated

## 1.22.4
### Changes
* Updated **REAME.md**

## 1.22.3
### Changes
* Added a **confirm** argument for auto confirming the confirm condition

## 1.22.2
### Breaking
* Changed menu help syntax
### Old syntax
``` JSON
{
  "menu": {
    "description": "action",
    "build:help": "Build node package.",
    "build": [
      "build"
    ],
    "test:help": "Test node package.",
    "test": {
      "run": "test",
      "watch": "test --watchAll"
    }
  }
}
```

### New syntax
``` JSON
{
  "menu": {
    "description": "action",
    "build:Build node package.": [
      "build"
    ],
    "test:Test node package.": {
      "run": "test",
      "watch": "test --watchAll"
    }
  }
}
```

## 1.22.1
### Changes
* Replaced the **confirm** argument for a **confirm** condition
``` JSON
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

### Breaking
* Removed the **confirm** argument

## 1.22.0
### Changes
* Added an argument for a Basic `Basic yes/no prompt.` 
``` bash
npx launch --confirm 'Are you sure'
```

## 1.21.0
### Changes
* Added support for help texts in [menus](#interactive-menu).

### Fixes
* Menu ui update bug fix

## 1.20.0
### Changes
* Switched form **[inquirer](https://www.npmjs.com/package/inquirer)** to **[prompts](https://www.npmjs.com/package/prompts)**
  * Removed **pageSize** options
  * Removed support for the **seperator** in a menu 
* Added support for using environment value aliases. More examples at [Environment and command line argument values](#environment-and-command-line-argument-values) and [Launcher settings](#launcher-settings)
``` JSON
{
  "scripts": {
    "build-stuff": [
      "node=$npm_config_node",
      "echo Node version: $node_version"
    ]
  }
}
```

## 1.19.3
### Fixes
* Fix for migrate menu name conflict

## 1.19.2
### Changes
* For compatibility reasons: when using a script name that is equal to the command being executed, all arguments are appended automatically.

## 1.19.1
### Fixes
* Fix for the "Circular script reference detected.' error

## 1.19.0
### Changes
* Added the [migrate argument](#migrate-packagejson-scripts) to migrate your **package.json** to **launcher-config.json**

## 1.18.0
### Changes
* `launch init` now updates the **package.json** file
* `launch init` now supports templates
* Added integration tests

## 1.17.3
### Changes
* Added integration tests
* Added **Escaping** example
* Add support for build the package on windows

### Fixes
* Fix for `Circular script reference detected.`

## 1.17.2
### Changes
* Added integration tests
* Removed lib entries from **tsconfig.json**
``` JSON
"lib": [
  "dom",
  "es2017",
  "esnext.asynciterable"
]
```
* Added a build in script **menu**, to force an interactive menu. This will ignoring the options value of defaultScript

### Breaking
* Replaced the **--interactive** argument for a build in script that can be overloaded.
* Removed the **--menu** launch argument.

### Fixes
* Save selection bug fix

## 1.17.1
### Changes
* Dev dependencies updated
* Added menu integration test
* Added init integration test
* Added menuTimeout argument
* Added menu timeout option
``` JSON
{
  "options": {
    "menu": {
      "timeout": 6
    }
  }
}
```

## 1.17.0
### Changes
* Added integration tests
* Added **directory** argument to specify the configuration files load location
* Added **script** argument to specify a script to start form the command line


### Fixes
* Argument bug fix when using `npm run script`

## 1.16.1
### Changes
* Dev dependencies updated

## 1.16.0
### Changes
* Added support for using default function parameter values
``` JSON
{
  "scripts": {
    "serve:$config=dev": [
      "ng serve -c=$config"
    ]
  }
}
```
### Usage:
``` bash
npm start serve
npm start serve:acc
```


* Added extra parameter debug logging
``` JSON
Script expanded : {
  "parameters": {
    "config": "acc"
  },
  "sequential": [
    "ng serve -c=acc"
  ]
}
```
* 

## 1.15.2
### Fixes
* **Windows only:** Bug fix related to change 1.15.1

## 1.15.1
### Changes
* **Windows only:** When using quoted lines on an echo commands, the quotes will be trimmed.

## 1.15.0
### Changes
* Dev dependencies updated
* Added the [pageSize](src/README.md#menu-options) menu option.

## 1.14.2
### Changes
* Updated dependencies
* **Bug fix for #65:** When parsing a config like this example, an error is returned.

### Breaking
**Windows only:** All arguments containing spaces are now surrounded by double quotes. Single quoted arguments containing spaces are convert to double quotes.

## 1.14.1
### Breaking
Added removal of environment and argument escaping. Now the first escape is for **script-launcher**, the second escape is for the shell.
example:
``` JSON
{
  "scripts": {
    "build-stuff": [
      "echo Exmaple 1: '\\$2'",
      "echo Exmaple 2: '\\$PATH'",
      "echo Exmaple 3: '\\${2}'",
      "echo Exmaple 4: '\\${PATH}'"
    ]
  }
}
```

#### New output:
``` bash
Exmaple 1: $2
Exmaple 2: $PATH
Exmaple 3: ${2}
Exmaple 4: ${PATH}
```

#### Old output:
``` bash
Exmaple 1: \$2
Exmaple 2: \$PATH
Exmaple 3: \${2}
Exmaple 4: \${PATH}
```

## 1.14.0
### Changes
* Added support for using separators in the launcher menu.
``` JSON
{
  "menu": {
    "description": "organization",
    "build": {
      "description": "environment",
      "development": "build:acc",
      "acceptance": "build:prd"
    },
    "separator": "",
    "serve": {
      "description": "environment",
      "development": "serve:acc",
      "acceptance": "serve:prd"
    }
  }
}
```

## 1.13.1
### Changes
* Added support for setting environment values to exclusion conditions as well.

## 1.13.0
### Changes
* Added support for setting environment values in conditions
``` JSON
{
  "scripts": {
    "build-stuff": [
      {
        "condition": [
          "myData=example",
          "'$myData'==='example'"
        ],
        "sequential-then": [
          "echo sequential-then"
        ],
        "sequential-else": [
          "echo sequential-else"
        ]
      }
    ]
  },
  "options": {
    "logLevel": 2
  }
}
```

## 1.12.1
### Changes
* Removed the throw exception when using a nested settings array

## 1.12.0
### Changes
* Updated the conditions parser
* Changed the **repeater** statements assessor variable name to **$_**
* Minor changes to the init examples
* Updated Script expanded log output

### Breaking
* The **sequential** and **concurrent** statements no longer work in conjunction with the **condition** and **exclusion** statements. Use the **sequential-then**, **sequential-else**, **concurrent-then** and **concurrent-else** when working with conditions and or exclusions. Open the [Condition and exclusion constraints](src/README.md#condition-and-exclusion-constraints) topic for examples.
* The **sequential-then** and **concurrent-then** statements will only be processed when there is a constraint specified that evaluates to a success value.
* When working with repeaters the repeated value in no longer accessible via the repeater variable name. The repeated values are now accessible by using the $_ prefix. Open the [Repeaters](src/README.md#repeaters) topic for examples.
``` JSON
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

## 1.11.1
### Changes
* Updated the Script expanded log output
* Added support for an else statements:
``` JSON
{
  "scripts": {
    "example": [
      {
        "condition": "exit 1",
        "sequential-then": [
          "echo Sequential then: condition action."
        ],
        "sequential-else": [
          "echo Sequential else: condition action."
        ]
      },
      {
        "exclusion": "exit 1",
        "sequential-then": [
          "echo Sequential then: exclusion action."
        ],
        "sequential-else": [
          "echo Sequential else: exclusion action."
        ]
      }
    ]
  }
}
```

### Fixes
* Script scoping fix so current directory and environment variables are no longer shared between script blocks.

## 1.11.0
### Changes
* Updated to deepmerge 3.3.0
* Updated to inquirer 6.4.1
* Moved setting value expansion to the preprocessing phase of script launcher.
* Added support for settings arrays in conjunction with the repeater statement
``` JSON
{
  "scripts": {
    "ping": [
      {
        "repeater": "$launch_setting_servers",
        "sequential": [
          "echo $launch_setting_servers_name",
          "--",
          "echo Action: $launch_setting_command $launch_setting_servers_host",
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



## 1.10.3
### Changes
* Update dependencies to ~ matches the most recent patch version, to fix issue with inquirer@6.4.0

## 1.10.2
### Changes
* Refactored environment value pre-processing.

### Breaking
* Environment value can no longer be used for function resolving. Environment values will only be resolved on the execution part of script launcher.

### Fixes
* Recently assigned environment values can now be used as a function parameters.
``` JSON
{
  "scripts": {
    "download:$env": [
      "echo Download:$env"
    ],
    "build": [
      "environment=$1",
      "echo Build:$environment",
      "download:$environment"
    ]
  }
}
```

## 1.10.1
* Refactoring related to the environment value processing.

### Fixes
* In some edge cases $launch_time_current or $launch_time_elapsed could have the wrong value.
* When using $launch_time_current or $launch_time_elapsed in the first script, they were empty.

## 1.10.0
### Changes
* Added the possibility to set [globing options](https://www.npmjs.com/package/glob#options)
``` JSON
{
  "options": {
    "glob": {
      "nonull": false
    }
  }
}
```

## 1.9.1
### Changes
* Added log output for settings environment values.
* Changed log output so all strings are now formatted using single quotes.

### Fixes
* When setting environment values that were using previous set values, it was failing to do so. Now environment variable expansion is done before setting environment values to fix the problem.
example of the problem:
``` JSON
{
  "scripts": {
    "environment": [
      "value1='My Data'",
      "value2=$value1",
      "echo Success value1='$value1'",
      "echo Was failing value2='$value2'"
    ]
  }
}
```

## 1.9.0
### Changes
* Added support for brace expansion on command line arguments.
example:
``` JSON
{
  "scripts": {
    "build-stuff": [
      "echo Argument 1: ${1}",
      "echo Argument 2: ${2}",
      "echo Argument 3: ${3}"
    ]
  }
}
```
* Added support for offset expansion on command line arguments.
example:
``` JSON
{
  "scripts": {
    "build-stuff": [
      "echo Argument 1: ${2*}",
      "echo Argument 2: $2*"
    ]
  }
}
```
* Added support for expansion character escaping
example:
``` JSON
{
  "scripts": {
    "build-stuff": [
      "echo Exmaple 1: \\$2",
      "echo Exmaple 2: \\$PATH",
      "echo Exmaple 3: \\${2}",
      "echo Exmaple 4: \\${PATH}"
    ]
  }
}
```

## 1.8.3
### Changes
* Added environment variable expansion for Grep pattern

## 1.8.2
### Fixes
* Bug fix for environment variable expansion on constraints

## 1.8.1
### Changes
* Updated README.md
* Updated dependencies

## 1.8.0
### Changes
* Updated README.md
* Updated dependencies
* Added support for a build in grep like functionality

## 1.7.1
### Changes
* Updated README.md

## 1.7.0
### Breaking
* Renamed LAUNCH_PLATFORM => launch_platform
* Renamed LAUNCH_START => launch_time_start
* Renamed LAUNCH_CURRENT => launch_time_current
* Renamed LAUNCH_ELAPSED => launch_time_elapsed
* Renamed LAUNCH_BLUE => launch_style_blue
* Renamed LAUNCH_BOLD => launch_style_bold
* Renamed LAUNCH_CYAN => launch_style_cyan
* Renamed LAUNCH_DIM => launch_style_dim
* Renamed LAUNCH_GREEN => launch_style_green
* Renamed LAUNCH_NORMAL => launch_style_normal
* Renamed LAUNCH_RED => launch_style_red
* Renamed LAUNCH_YELLOW => launch_style_yellow
* Renamed LAUNCH_VERSION => launch_version

### Changes
* Add support for using settings
* Updated `launch init` example
* Updated README.md example
* Implemented the `pretty-time` packages for better time formatting

### Fixes
* Bug fix so script parameters in an inline script block are now working.
example:
``` JSON
{
  "scripts": {
    "build:$config": [
      [
        "echo Config: $config"
      ],
      {
        "sequential": [
          "echo Config: $config"
        ]
      }
    ]
  }
}
``` 
* Bug fix so Condition and Exclusion on the first script level are now working.
example:
``` JSON
{
  "scripts": {
    "build-stuff": {
      "exclusion": "node_modules",
      "sequential": [
        "echo npm install"
      ]
    }
  }
}
```
