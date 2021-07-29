# ATAT Web API
The ATAT Web API repo contains an implementation of the internal application programming interface that supports the [ATAT Web UI](https://github.com/dod-ccpo/atat-web-ui). This API will eventually invoke the [ATAT CSP Orchestration](https://github.com/dod-ccpo/atat-csp-orchestration) layer.

## Deploying to AWS
The document contains helpful information for installing and deploying the implementation of the _ATAT Portfolio Drafts API_ to AWS.

The `cdk.json` file tells the [AWS CDK Toolkit](https://docs.aws.amazon.com/cdk/latest/guide/cli.html) how to execute your app.

### Useful Commands

 * `npm run build`   transpile TypeScript to JavaScript
 * `npm run watch`   watch for changes and compile
 * `npm run test`    execute the Jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk destroy`     destroys the built application
