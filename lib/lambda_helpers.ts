import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { IdentityProviderLambdaClient, IIdentityProvider } from "./constructs/identity-provider";
import { TaskProps } from "./constructs/sfn-lambda-invoke-task";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";

export class LambdaHelper {
  readonly construct: Construct;
  readonly cspConfig: secrets.ISecret;
  readonly idp?: IIdentityProvider;
  baseFunctionProps: lambdaNodeJs.NodejsFunctionProps;

  constructor(
    scope: Construct,
    cspConfig: secrets.ISecret,
    baseFunctionProps: lambdaNodeJs.NodejsFunctionProps,
    idp?: IIdentityProvider
  ) {
    this.construct = scope;
    this.cspConfig = cspConfig;
    this.baseFunctionProps = baseFunctionProps;
    this.idp = idp;
  }

  createFunction(
    functionName: string,
    sourceFile: string,
    environment: { [key: string]: string }
  ): lambdaNodeJs.NodejsFunction {
    const props = { ...this.baseFunctionProps };
    props.environment = environment;
    props.entry = sourceFile;
    return new lambdaNodeJs.NodejsFunction(this.construct, functionName, props);
  }

  createFunctionEx(functionName: string, sourceFile: string, scopes: string[]): lambdaNodeJs.NodejsFunction {
    const returnFn = this.createFunction(`Csp${functionName}Fn`, sourceFile, {
      CSP_CONFIG_SECRET_NAME: this.cspConfig.secretArn,
    });
    this.idp?.addClient(new IdentityProviderLambdaClient(`Csp${functionName}Client`, returnFn), scopes);
    this.cspConfig.grantRead(returnFn);
    return returnFn;
  }

  createTasks(functions: lambdaNodeJs.NodejsFunction[]): TaskProps[] {
    const tasks: TaskProps[] = [];
    functions.forEach((f) => {
      tasks.push({
        id: `Invoke${f.functionName}`,
        props: {
          lambdaFunction: f,
          inputPath: "$.initialSnowRequest",
          resultSelector: {
            code: sfn.JsonPath.objectAt("$.Payload.code"),
            content: sfn.JsonPath.objectAt("$.Payload.content"),
          },
          resultPath: "$.cspResponse",
          outputPath: "$",
        },
      });
    });
    return tasks;
  }
}
