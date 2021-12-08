#!/usr/bin/env bash

##
# This is expected to be invoked during the bundling of the database support Lambda layer.
# The CDK supports only a single bundling command and so it is easier to execute all of the
# necessary commands in a script rather than a series of `&&`-joined commands in a TypeScript
# file.
##

export ASSET_INPUT_DIR="/asset-input"
export ASSET_OUTPUT_DIR="/asset-output"

## Transpile entities and migrations for TypeORM 
prepare-orm-files() (
    npm ci \
        && npm run lerna bootstrap -- --ci \
        && npm run build \
        && mkdir -p "$ASSET_OUTPUT_DIR/nodejs" \
        && cp -rL "$ASSET_INPUT_DIR/packages/orm/node_modules" "$ASSET_OUTPUT_DIR/nodejs/node_modules" \
        && cd "$ASSET_INPUT_DIR/build/packages/" \
        && cp --parents -aur orm/* "$ASSET_OUTPUT_DIR/nodejs" \
        && cd "$ASSET_INPUT_DIR/packages/" \
        && cp --parents -aur orm/migration/**.sql "$ASSET_OUTPUT_DIR/nodejs" \
)

## Download the RDS CA Bundle
download-ca-bundle() (
    curl -sL -o "${ASSET_OUTPUT_DIR}/rds-gov-ca-bundle-2017.pem" https://truststore.pki.us-gov-west-1.rds.amazonaws.com/global/global-bundle.pem
)

prepare-orm-files && download-ca-bundle
