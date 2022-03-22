import { SFN } from "@aws-sdk/client-sfn";

export const sfnClient = new SFN({ useFipsEndpoint: true });
