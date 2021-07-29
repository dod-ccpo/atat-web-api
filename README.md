# ATAT Web API
The ATAT Web API repo contains an implementation of the internal application programming interface that supports the [ATAT Web UI](https://github.com/dod-ccpo/atat-web-ui). This API will eventually invoke the [ATAT CSP Orchestration](https://github.com/dod-ccpo/atat-csp-orchestration) layer.

## Deploying to AWS
The document contains helpful information for installing and deploying the implementation of the _ATAT Portfolio Drafts API_ to AWS. [AWS Cloud Development Kit](https://aws.amazon.com/cdk/) (AWS CDK) framework is used for deployment. The `cdk.json` provides configuration to the AWS CDK Toolkit.

### Install Prerequisites
These software packages are required.

| Package | Command | Notes |
| ----------- | ----------- |----------- |
| Node Version Manager | `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh \| bash` | Then restart your shell. Details available in the [nvm README](https://github.com/nvm-sh/nvm#installing-and-updating). |
| Node.js | `nvm install` | Node.js version is specified in file `./.nvmrc` |
| TypeScript | `npm install -g typescript` | [Documentation](https://www.typescriptlang.org/docs/) |
| AWS CDK Toolkit | `npm install -g aws-cdk` | [Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide/cli.html) |

### Install JavaScript Dependencies 
```
npm ci
npm run bootstrap
```

### Useful Commands

 * `npm run build`   transpile TypeScript to JavaScript
 * `npm run watch`   watch for changes and compile
 * `npm run test`    execute the Jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk destroy`     destroys the built application
