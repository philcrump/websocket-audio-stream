#!/usr/bin/env bash

source_dir="$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)";
cd "$source_dir";

DENO_BIN="deno";
DENO_SRC="./src/main.ts";

export DENO_DIR="./deno_deps/";

#### Print Version
echo -e '\033[1mUsing deno version:\033[0m';
${DENO_BIN} --version;

#### Run Application

# Do not prompt for permissions, throw instead.
APPLICATION_PERMISSIONS=" --no-prompt";
APPLICATION_PERMISSIONS+=" --allow-read=config.json,./htdocs/";
#APPLICATION_PERMISSIONS+=" --allow-write=";
APPLICATION_PERMISSIONS+=" --allow-net=127.0.0.1,127.255.255.255";
APPLICATION_PERMISSIONS+=" --unstable";

# Only use cached packages
#PACKAGE_CACHE="--cached-only";

echo -e 'Starting Application..';
${DENO_BIN} run ${APPLICATION_PERMISSIONS} ${PACKAGE_CACHE} ${DENO_SRC};
