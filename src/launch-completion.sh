#!/bin/bash
date -Iseconds > coml.log

echo "COMP_CWORD: $COMP_CWORD" >> coml.log
echo "COMP_LINE: $COMP_LINE"   >> coml.log
echo "COMP_POINT: $COMP_POINT" >> coml.log
echo "$@"                      >> coml.log

BACKUP_COMP_CWORD=COMP_CWORD
BACKUP_COMP_LINE=COMP_LINE
BACKUP_COMP_POINT=COMP_POINT

unset COMP_CWORD
unset COMP_LINE
unset COMP_POINT

eval "$(npm completion)"
_npm_completion "$@"

export COMP_CWORD=$BACKUP_COMP_CWORD
export COMP_LINE=$BACKUP_COMP_LINE
export COMP_POINT=$BACKUP_COMP_POINT

_npm_completion