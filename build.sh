#!/bin/bash

# init submodules
git submodule update --init

# build
docker build -t p0t4t0sandwich/sfi-mc-camp-plugin:latest .
