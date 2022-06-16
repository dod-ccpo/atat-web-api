import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { HttpMethod } from "../http";
import { Method } from "aws-cdk-lib/aws-apigateway";

export interface ApiRouteProps {
  readonly environmentName: string;
  readonly vpc?: ec2.IVpc;
  readonly apiParent: apigw.IResource;
}

export interface IApiRoute {
  readonly path: apigw.IResource;
  readonly methods: Record<HttpMethod, Method>;
}
