#!/usr/bin/env node
import "source-map-support/register";
import { createApp } from "./app";

// Externalized the logic to set up our App so that we can perform proper unit tests on it
createApp();
