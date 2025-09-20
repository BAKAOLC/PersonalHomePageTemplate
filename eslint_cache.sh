#!/bin/bash
cd "$(dirname "$0")"

echo "intput path $2"

# 如果提供了第二个参数，则在该目录下查找所有.ts, .vue, .js, .cjs文件
# 否则默认检查所有.ts, .vue, .js, .cjs文件
if [ -z "$2" ]
then
    LINT_PATH="**/*.{ts,vue,js,cjs}"
else
    LINT_PATH="$2/**/*.{ts,vue,js,cjs}"
fi

if [ -z "$1" ]
then
    echo "$(date) npx --no-install eslint --quiet --cache $LINT_PATH > eslint_output.log"
    npx --no-install eslint --quiet --cache "$LINT_PATH" > eslint_output.log
else
    echo "$(date) npx --no-install eslint --quiet --cache $LINT_PATH"
    npx --no-install eslint --quiet --cache "$LINT_PATH"
fi
if [ $? -ne 0 ]
then
    echo "$(date) npx command failed with error level $?"
fi
echo "$(date) eslint cache finished"