# Manual Steps Required For Deployment

The vast majority of the HOTH API and the ATAT API client contained in this
repository can be deployed automatically; however, there are some prerequisite
resources that need to be created externally (likely, that means manually
before the deployment can start). We are actively looking for ways to more
cohesively integrate these items into our deployment process.

This document, when possible tries to break down _where_ that configuration
needs to take place and (unless otherwise specified) the ordering of sections
in this guide is purely for convenience.

## CDK/CloudFormation

It is necessary to run a `cdk bootstrap` in order to start building the CDK
application.

## AWS VPC/Transit Gateway/RAM

There must be a Transit Gateway created within the account, to which the
account can automatically add Transit Gateway VPC Attachments. This is
necessary to deploy the base networking infrastructure ATAT.

## AWS Secrets Manager

There are currently two secrets that need to be created in AWS Secrets Manager
to support the ATAT deployment process. To start, a GitHub PAT is required
which will be used for the configuration of the CI/CD pipeline. Additionally,
a Secret storing the CSP integration configuration is necessary.

### GitHub PAT

A GitHub PAT with `repo` and `admin:repo_hook` is required in order to allow
CodePipeline to watch the GitHub repo. A CodeStar connection is not used
because the ATAT application must be deployed in AWS GovCloud (US) and other
partitions where CodeStar integration is not possible.

The Secret Name/Path/ARN is configured in the `atat:GitHubPatName` context
setting. The default Secret Name is `auth/github/pat`.

When the GitHub PAT is updated in AWS Secrets Manager, the Version ID must be
obtained (this can be done with the `ListSecretVersionIds` API). Then, a
manual deployment of the pipeline stack must be performed in _each_ environment,
passing the `atat:ForceGitHubTokenVersion` context value set to the version ID.
This will ensure that CloudFormation resolves the new version of the secret and
updates all necessary resources appropriately.

### Cloud Service Provider Integration Configuration

The configuration values for integrating with Cloud Service Providers is stored
in Secrets Manager. It may not necessarily need to be but doing so provides a
few specific tangible benefits:
 - Encryption-at-rest
 - Cross-region replication (if needed)
 - Native support for JSON structure
 - Other things are already stored in Secrets Manager
 - The values in the configuration are kept non-public

The format/structure of the configuration should meet the following TypeScript
interface:

```ts
interface CspConfigurationItems {
  uri: string;
  networks: string[];
}
type CspName = string;
type CspConfiguration = Record<CspName, CspConfigurationItems>;
```

for example:

```json
{
  "Mock": {
    "uri": "https://mockcsp.example.com/atat/",
    "networks": ["NETWORK_A", "NETWORK_B"]
  }
}
```

This structure does not necessarily match the format used for a CSP object
elsewhere in the code and that is intentional to ensure and allow for fast
lookups by CSP name.

The bounds of `CspName` are actually slightly tighter than `string`; the
permitted values are specifically the names that HOTH API clients will specify
in the `POST /provisioning-jobs` request to request a portfolio to be created
in that particular Cloud Service Provider.

The Secret Name/path/ARN is configured in the `atat:CspConfigurationName`
context value. The default name is `config/csp/configuration`.
