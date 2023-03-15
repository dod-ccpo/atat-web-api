import { IConstruct } from "constructs";

/**
 * Defined context values that configure or alter the behavior of the HOTH API.
 *
 * These values are set as CDK Context values, either using the `cdk.json` or
 * `cdk.context.json` files or using the `-c/--context` CLI argument. Names are
 * generally prefixed with `atat:` and may have a reasonable default value specified.
 */
export class AtatContextValue {
  /**
   * Use a specific version of the Secrets Manager Secret that stores the GitHub PAT.
   *
   * When specified, the given version will be used. When not specified, the default behavior
   * of the CDK/CloudFormation will be used (which is to resolve the latest version).
   */
  public static readonly FORCE_GITHUB_TOKEN_VERSION = new AtatContextValue("atat:ForceGitHubTokenVersion", undefined);

  /**
   * The name of the AWS Secrets Manager Secret where the GitHub PAT for CodePipeline is
   * stored.
   *
   * This is used for CodePipeline to access the GitHub repository. The PAT must be stored
   * in AWS Secrets Manager for safety and it must hav the `repo` and `admin:repo_hooks`
   * permissions associated with it.
   */
  public static readonly GITHUB_PAT_NAME = new AtatContextValue("atat:GitHubPatName", "auth/github/pat");

  /**
   * The GitHub repository that stores the ATAT/HOTH API infrastructure and application code.
   */
  public static readonly VERSION_CONTROL_REPO = new AtatContextValue(
    "atat:VersionControlRepo",
    "dod-ccpo/atat-web-api"
  );

  /**
   * The branch of the GitHub repository to track for changes.
   *
   * This value can, theoretically, be anything under `refs/heads/`
   */
  public static readonly VERSION_CONTROL_BRANCH = new AtatContextValue("atat:VersionControlBranch", "develop");

  /**
   * The name/ID of this environment of ATAT.
   *
   * This is used as part of the environment's name in the CloudFormation stack as well as
   * in descriptions and names of various resources.
   *
   * Note that "Sandbox" is a special name; it indicates the "container" environment where
   * developer sandbox environments are created (and is not, itself, a developer sandbox
   * environment).
   */
  public static readonly ENVIRONMENT_ID = new AtatContextValue("atat:EnvironmentId", undefined);

  /**
   * The CIDR to use for the environment's VPC.
   *
   * This should be one of the supported values by the AWS VPC service, generally the
   * RFC 1918 addresses. It must be large enough to store all necesary interfaces and
   * must be unique across all environments.
   */
  public static readonly VPC_CIDR = new AtatContextValue("atat:VpcCidr", undefined);

  /**
   * The custom domain name to use for the created API Gateway API.
   *
   * This must be a valid Subject or SAN on the provided ACM certificate.
   */
  public static readonly API_DOMAIN_NAME = new AtatContextValue("atat:ApiDomainName", undefined);

  /**
   * The s3 bucket to be used to centralize VPC Flow Logs.
   *
   * This must be valid variable due to the buckets differing between the Prod and Dev enviroments
   */
  public static readonly VPC_FLOW_LOG_BUCKET = new AtatContextValue("atat:VpcFlowLogBucket", undefined);

  /**
   * The ARN of the certificate in ACM to use for the created API.
   *
   * The certificate must be stored in ACM, not IAM. Additionally, the certificate must have
   * the domain name specified in `atat:ApiDomainName` as a valid name for the certificate.
   */
  public static readonly API_CERTIFICATE_ARN = new AtatContextValue("atat:ApiCertificateArn", undefined);

  /**
   * Whether this is a developer's sandbox environment.
   *
   * The ATAT infrastructure deployment has a concept of Developer Sandbox environments, which
   * are not attached to a VPC and allow direct internet access for testing and development
   * activities.
   *
   * ONLY PROVIDE THIS VALUE IF SETTING IT TO `"true"`. For safety, allow this value to remain
   * `undefined` when the intended behavior is for it to be false (as undefined is inherently
   * falsey).
   */
  public static readonly SANDBOX_ENVIRONMENT = new AtatContextValue("atat:Sandbox", undefined);

  /**
   * The email address to send monitoring notifications to.
   *
   * When initially specifed or updated, this email address will receive an SNS subscription
   * confirmation email which must be acknowledged. This email address must be the address
   * specified/approved by the ISSO to receive operational notifications for the system.
   *
   * This value is ignored when `atat:EnvironmentId` is set to `"Sandbox"`.
   */
  public static readonly NOTIFICATION_EMAIL = new AtatContextValue("atat:NotificationEmail", undefined);

  /**
   * The name of the Secrets Manager Secret that holds the configuration for integrating with
   * Cloud Service Providers ATAT API implementations.
   */
  public static readonly CSP_CONFIGURATION_NAME = new AtatContextValue(
    "atat:CspConfigurationName",
    "config/csp/integration"
  );

  /**
   * The region where the stack will be deployed to.
   *
   * The resulting stack will only work in this region. Orginally, this was added to support
   * ELB log delivery; however, once added other parts of the code base may adapt to this no
   * longer being an unresolved value.
   */
  public static readonly DEPLOY_REGION = new AtatContextValue("atat:DeployRegion", "us-gov-west-1");

  // This eslint-disable is required as it picks up on the constructor shorthand as a
  // "useless" constructor which is not a correct determination.
  // eslint-disable-next-line no-useless-constructor
  private constructor(public readonly name: string, public readonly defaultValue: any | undefined) {}

  /**
   * Resolve the value of the context within a given scope.
   *
   * This delegates to the CDK's builtin context resolution mechanism and falls back to the
   * default value (if any).
   */
  resolve(scope: IConstruct): any | undefined {
    const value = scope.node.tryGetContext(this.name);
    return value ?? this.defaultValue;
  }

  /**
   * Create a CDK app CLI argument that passes the given value for this context value.
   *
   * @param value The value to pass on the CLI
   */
  toCliArgument(value: string | undefined): string {
    if (value === undefined) {
      return "";
    }
    return `-c ${this.name}='${value}'`;
  }

  toString() {
    return this.name;
  }
}
