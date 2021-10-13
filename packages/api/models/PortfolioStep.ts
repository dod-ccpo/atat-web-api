import { CloudServiceProvider } from "./CloudServiceProvider";
export interface PortfolioStep {
  name: string;
  csp: CloudServiceProvider;
  description?: string;
  dod_components: Array<string>;
  portfolio_managers: Array<string>;
}
