#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SpecterStack } from '../lib/specter-stack';

const app = new cdk.App();

new SpecterStack(app, 'SpecterStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: app.node.tryGetContext('region') ?? 'ap-south-1',
    },
    description: 'Specter UX Testing — ECS Fargate + ALB + S3 (ap-south-1)',
});
