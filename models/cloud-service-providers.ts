export interface CloudServiceProvider {
  readonly name: string;
  /**
   * @deprecated this property is in the CSP config
   */
  readonly uri?: string;
  /**
   * @deprecated this property is in the CSP config
   */
  readonly networks?: string[];
}
