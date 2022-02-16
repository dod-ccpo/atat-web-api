The ATAT Web API repo contains a set of services which enable ATAT Provisioning into vendor environments by way of the [ATAT CSP Specification](https://github.com/dod-ccpo/atat-csp-orchestration/blob/main/provisioning/atat_provisioning.yaml). It is implemented in a stateless fashion, using SQS Queues to pass information back to integrators. Initially, this API is only meant to be accessed by the Service Now component of ATAT, but it may be opened up to other integrators in the future.

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
