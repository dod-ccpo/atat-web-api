import { CloudServiceProvider } from "../models/CloudServiceProvider";
import { ProvisioningRequestType } from "../models/ProvisioningStatus";

/**
 * Create a provisioning job that will be placed on the provisioning submit
 * queue to then be processed by the state machine. The provisioning job is
 * generic to fit the format of different types being provisioned (e.g.,
 * applications, operators, etc.)
 *
 * @param body - The request body submitted to provision resources
 * @param type - The type of provisioning (e.g., full portfolio, applications, etc)
 * @param csp - The CSP to provision the resources
 */
export class ProvisioningJob<T> {
  readonly body: T;
  readonly type: ProvisioningRequestType;
  readonly csp: CloudServiceProvider | undefined;

  constructor(body: T, type: ProvisioningRequestType, csp: CloudServiceProvider) {
    this.body = body;
    this.type = type;
    this.csp = csp;
  }
}
