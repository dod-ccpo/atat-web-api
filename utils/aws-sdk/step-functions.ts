import { SFN } from "@aws-sdk/client-sfn";
import { logger } from "../logging";

export const sfnClient = new SFN({ useFipsEndpoint: true, logger });
