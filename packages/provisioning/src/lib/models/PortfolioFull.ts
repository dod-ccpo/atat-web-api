import { PortfolioSummary } from './PortfolioSummary'
import { PortfolioStep } from './PortfolioStep'

export interface PortfolioFull extends PortfolioSummary {
    portfolio: PortfolioStep
}
