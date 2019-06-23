# Change Log

## 1.11.0
### Changes
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
