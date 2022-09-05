# ATAT Web API

This repository contains two components that together act as a bridge between the internal front-end of the ATAT
application and vendor implementations of the
[ATAT CSP Orchestration API](https://github.com/dod-ccpo/atat-csp-orchestration). Any such implementors should
consider this repository to contain purely "private" implementation details; however, it does serve as a sample
client of the ATAT CSP Orchestration API and may be interesting to review for that purpose.

Generally, the application is implemented to operate in a stateless fashion (with some transient state) leveraging
SQS Queues, Step Functions State Machines, and a REST API. The private internal-facing API, the
Hyperscaler Orchestration and Tracking Helper (HOTH), serves as a helpful API for other internal implementation
details of the ATAT client application. Currently, HOTH is intended purely to be consumed the the
[ServiceNow component of ATAT](https://github.com/dod-ccpo/atat-snow); however, it may be opened up to other
integrators in the future.

## Deploying

`atat-web-api` is built as an [AWS CDK application](https://docs.aws.amazon.com/cdk/v2/guide/home.html). The
development and deployment process therefore heavily use the `aws-cdk` CLI.

There are two main deployment paths for `atat-web-api`. These are:
 - A minimal sandbox environment for developers to have a "live" environment in which to test changes
 - A full environment managed by a CI/CD pipeline

In general, the steps to deploy each are approximately the same, following the typical `cdk diff`/`cdk deploy`
workflow. Which path is chosen is determined based on the values of a CDK Context variable value.

### Deploying a Sandbox environment

An environment is a Sandbox environment if the `atat:Sandbox` context key has a value of `"yes"`, `"1"`,
or `"true"` after it has been converted to a string. All Sandbox environments must also have the
`atat:EnvironmentId` string set to a unique value. To deploy a sandbox environment, configure your AWS
credentials appropriately and deploy by first checking the changes that will be made within the AWS account.

```bash
cdk diff -c atat:EnvironmentId=<ENVIRONMENT_ID> -c atat:Sandbox=true
```

After validating that the changes look correct, deploy the sandbox environment by running:

```bash
cdk deploy -c atat:EnvironmentId=<ENVIRONMENT_ID> -c atat:Sandbox=true
```

In each of the above commands, replace `<ENVIRONMENT_ID>` with the unique name you'd like to use for the
sandbox environment.

### Deploying a "full" environment

Because a full environment deployment requires the usage of a full CI/CD pipeline, it also needs additional
configuration values to understand which `git` repository to watch and what credentials should be used to do
so. Like a Sandbox environment, the `atat:EnvironmentId` context value must also be set. Additionally, a
Secret must be created within Secrets Manager to store a GitHub Personal Access Token.

The required context values are:
 - `atat:EnvironmentId`, which should be the unique name used to identify the environment
 - `atat:GitHubPatName`, which should be the name of the Secret that contains the GitHub PAT
 - `atat:VersionControlRepo`, which should be name of the GitHub repository where the code is stored,
    including the organization name (for example, `dod-ccpo/atat-web-api`)
 - `atat:VersionControlBranch`, which should be the branch within the repository to watch for changes

These values can, of course, be set either through the CLI or via the `cdk.json` file. The last three have
reasonable defaults set within the `cdk.json` file. Therefore, once you have confirmed those values look
correct, deploying follows similar steps to the sandbox environment!

Start off by ensuring the changes to make look reasonable:

```bash
cdk diff -c atat:EnvironmentId=<ENVIRONMENT_ID> -c atat:Sandbox=true
```

And then once you've confirmed that they do, deploy:

```bash
cdk deploy -c atat:EnvironmentId=<ENVIRONMENT_ID> -c atat:Sandbox=true
```

The deployed pipeline will be self-mutating so futher manual deployments should be rarely needed.
The primary situations needing manual deployment are:
 - When the GitHub PAT is rotated (using the `atat:ForceGitHubTokenVersion` context)
 - When changes that require additional command line arguments to `cdk synth` in the self-mutate
   step are made
 - When it is necessary to change the branch being watched without a corresponding push to the
   current target branch (for example, to switch from watching `main` to watching `develop`)
