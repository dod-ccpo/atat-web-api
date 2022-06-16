import { HttpMethod } from "../http";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export interface ApiRouteProps {
  readonly environmentName: string;
  readonly vpc?: ec2.IVpc;
  readonly apiParent: apigw.IResource;
  readonly name: string;
}

export interface IApiRoute {
  readonly path: apigw.IResource;
  // readonly methods: { [key in HttpMethod]: apigw.Method };
}
