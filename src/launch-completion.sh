#!/bin/bash

echo "COMP_CWORD: $COMP_CWORD"  > coml.log
echo "COMP_LINE: $COMP_LINE"   >> coml.log
echo "COMP_POINT: $COMP_POINT" >> coml.log

eval "$(npm completion)"
# _npm_completion
