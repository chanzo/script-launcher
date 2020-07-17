### Install latest `package.json` packages
``` bash
npm list --parseable --depth=0 | sed -r 's/.*node_modules\/(.*)/npm install \1@latest/g'
```
