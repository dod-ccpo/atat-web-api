#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AtatWebApiStack } from '../lib/atat-web-api-stack';

const app = new cdk.App();
new AtatWebApiStack(app, 'AtatWebApiStack', {});
