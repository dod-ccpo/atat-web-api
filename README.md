The ATAT Web API repo contains a set of services which enable ATAT Provisioning into vendor environments by way of the [ATAT CSP Specification](https://github.com/dod-ccpo/atat-csp-orchestration/blob/main/provisioning/atat_provisioning.yaml). It is implemented in a stateless fashion, using SQS Queues to pass information back to integrators. Initially, this API is only meant to be accessed by the Service Now component of ATAT, but it may be opened up to other integrators in the future.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

## Building an Application Environment

The default deployment configuration in `cdk.json` is built for deploying an application
environment, leveraging shared base infrastructure within an account. To deploy the
application, run:

```bash
cdk diff -c atat:EnvironmentId=<ENVIRONMENT_ID>
cdk deploy -c atat:EnvironmentId=<ENVIRONMENT_ID>
```

Replace `<ENVIRONMENT_ID>` with the name you want to use for your environment. This will
show a diff and then actually deploy the applicaiton.

## Building Base Infrastructure

This is a more rare deployment that only needs to be performed when initially setting
up a new AWS account or when changes have been made to one of the stacks deployed as
part of this configuration. The base infrastructure is executed as a separate "app" and
can be run by executing:

```bash
cdk diff -a 'npx ts-node --prefer-ts-exts bin/atat-base-infra.ts' -c atat:EnvironmentId=<ENVIRONMENT_ID>
cdk deploy -a 'npx ts-node --prefer-ts-exts bin/atat-base-infra.ts' -c atat:EnvironmentId=<ENVIRONMENT_ID>
```

Because the base infrastructure app and stacks use named IAM that does not take the
Environment ID into account, care must be taken to not deploy two instances of this
into a single account.