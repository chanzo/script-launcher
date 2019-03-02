# Script Launcher

Script Launcher provides a more flexible way to manage your 'package.json' scripts. The following list, is a summary of some of these extra features:

* Start scripts sequentially specified in an array.
* Start scripts in parallel specified in an array.
* Use the environment values on Linux, Mac and Windows in a consistent manner.
* Use an interactive landing menu, so a new developer get can start on your project more easily.


## Installation

Install `script-launcher` as a development dependency in your project.
``` bash
npm install script-launcher --save-dev
```

Use launcher init to create the `script-launcher.json`
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
