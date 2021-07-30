import { AttributeValue } from "@aws-sdk/client-dynamodb";
export interface PortfolioStep {
  name: string;
  description: string;
  dod_components: Array<string>;
  portfolio_managers: Array<string>;
}
