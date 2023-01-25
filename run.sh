#!/usr/bin/env bash

source_dir="$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)";
cd "$source_dir";

DENO_BIN="deno";
DENO_SRC="./src/main.ts";

# Do not check for deno updates
export DENO_NO_UPDATE_CHECK="1";

#### Print Version
echo -e '\033[1mUsing deno version:\033[0m';
${DENO_BIN} --version;

if [ -d "./vendor/" ] 
then
	VENDOR="--import-map=./vendor/import_map.json";
else
	echo "Warning: Local dependencies directory ('./vendor/') not found.";
fi

#### Run Application

READFILES="./config.json";
READFILES+=",./htdocs/"

WRITEFILES=""

# Do not prompt for permissions, throw instead.
APPLICATION_PERMISSIONS=" --no-prompt";
APPLICATION_PERMISSIONS+=" --allow-read=${READFILES}";
#APPLICATION_PERMISSIONS+=" --allow-write=${WRITEFILES}";
APPLICATION_PERMISSIONS+=" --allow-net=127.0.0.1,127.255.255.255";
APPLICATION_PERMISSIONS+=" --unstable";

echo -e '\033[1mStarting Application..\033[0m';
${DENO_BIN} run ${VENDOR} ${APPLICATION_PERMISSIONS} ${PACKAGE_CACHE} ${DENO_SRC};
