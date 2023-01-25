#!/usr/bin/env bash

source_dir="$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)";
cd "$source_dir";

DENO_BIN="deno";

# Do not check for deno updates
export DENO_NO_UPDATE_CHECK="1";

export RUST_BACKTRACE="1";


FILES=$(find ./src/ -name "*.ts")

${DENO_BIN} vendor --force ${FILES}
