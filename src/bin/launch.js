#!/usr/bin/env node
'use strict';

const launcher = require('..');

launcher.main(process.env.npm_lifecycle_event, process.argv, null);
