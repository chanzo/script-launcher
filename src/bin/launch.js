#!/usr/bin/env node
'use strict';

const launcher = require('..');

launcher.main(process.argv, process.env.npm_config_argv);
