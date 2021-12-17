import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as AtatWebApi from "../lib/atat-web-api-stack";
import * as AtatNetStack from "../lib/atat-net-stack";
import path from "path";
import { AuthenticationProtocol } from "../lib/constructs/authentication";

test("DynamoDB Resource is present, and Partition Key is set.", () => {
  // This is a workaround for some issues that result comes up during
  // running the tests if the current working directory is the `infrastructure`
  // directory instead of the base of the git repo. The happens because
  // lerna/jest executes the tests in the package's directory. For some reason,
  // it seems that there's an issue with Docker bundling in the CDK if the
  // directories don't match correctly.
  // We work around this by checking if the current working directory is the
  // parent directory of the test/ folder (where __dirname should be test/) and
  // calling path.dirname() should return <paths>/infrastructure/.
  // A `chdir` to the parent directory of `infrastructure/` puts us at the root
  // of the repository.
  if (process.cwd() === path.dirname(__dirname)) {
    process.chdir("..");
  }

  const app = new cdk.App();
  const vpcStack = new AtatNetStack.AtatNetStack(app, "TestNetStack", {});
  // WHEN
  const stack = new AtatWebApi.AtatWebApiStack(app, "MyTestStack", {
    environmentId: "testrunner",
    idpProps: [
      {
        secretName: "/test/secret",
        providerName: "TestIdp",
        providerType: AuthenticationProtocol.OIDC,
      },
    ],
    smtpProps: {
      secretName: "/test/smtp",
    },
    vpc: vpcStack.vpc,
  });
  // THEN
  expectCDK(stack).to(
    haveResource("AWS::DynamoDB::Table", {
      KeySchema: [
        {
          AttributeName: "id",
          KeyType: "HASH",
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: "id",
          AttributeType: "S",
        },
      ],
    })
  );
});
