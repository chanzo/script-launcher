# Change Log

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
