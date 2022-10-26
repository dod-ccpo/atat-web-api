import {
  CostResponseByPortfolio,
  Portfolio,
  GetCostsByPortfolioRequest,
  AddTaskOrderRequest,
  TaskOrder,
  ImpactLevel,
  ProvisioningStatus,
  ProvisioningStatusType,
  GetCostsByClinRequest,
  Clin,
  Operator,
  PatchPortfolioRequest,
} from "./types";

export const portfolioId = "test-portfolio-id";
export const provisioningJobId = "test-provisioningJob-id";
export const location = "https://localhost/atat/api/v1/provisioning-jobs/test-job-id";
export const administrators: Operator[] = [{ email: "admin@example.com", dodId: "3944.CTR", needsReset: false }];
const taskOrderNumber = "09876543214321";
const clins: Clin[] = [
  {
    clinNumber: "0001",
    popStartDate: "2021-09-01",
    popEndDate: "2022-09-01",
  },
  {
    clinNumber: "1001",
    popStartDate: "2023-09-01",
    popEndDate: "2023-09-01",
  },
];

export const mockTaskOrder: TaskOrder = {
  taskOrderNumber,
  clins,
  popStartDate: "2021-09-01",
  popEndDate: "2022-09-01",
};
export const mockPortfolio: Portfolio = {
  name: "Test Portfolio",
  taskOrders: [],
  administrators: [],
};

export const mockCostsByPortfolioRequest: GetCostsByPortfolioRequest = {
  portfolioId,
  startDate: "2021-12-01",
  endDate: "2022-03-31",
};

export const mockPatchPortfolioRequest: PatchPortfolioRequest = {
  portfolioId,
  patch: {
    administrators,
  },
};

export const mockAddTaskOrderRequest: AddTaskOrderRequest = {
  portfolioId,
  taskOrder: mockTaskOrder,
  targetImpactLevel: ImpactLevel.IL2,
  provisionDeadline: "",
};

export const mockGetCostsByClinRequest: GetCostsByClinRequest = {
  portfolioId,
  taskOrderNumber: mockTaskOrder.taskOrderNumber,
  clin: clins[0].clinNumber,
  startDate: "2022-01-01",
  endDate: "2022-12-31",
  targetImpactLevel: ImpactLevel.IL6,
};

export const mockProvisioningStatus: ProvisioningStatus = {
  portfolioId,
  provisioningJobId: "test-job-id",
  status: ProvisioningStatusType.IN_PROGRESS,
};

export const mockCostData: CostResponseByPortfolio = {
  taskOrders: [
    {
      taskOrderNumber: "1234567891234",
      clins: [
        {
          clinNumber: "0001",
          actual: [
            {
              total: "50.00",
              results: [
                {
                  month: "2021-12",
                  value: "20.00",
                },
                {
                  month: "2022-01",
                  value: "30.00",
                },
              ],
            },
          ],
          forecast: [
            {
              total: "100.00",
              results: [
                {
                  month: "2022-02",
                  value: "100.00",
                },
              ],
            },
          ],
        },
        {
          clinNumber: "0002",
          actual: [
            {
              total: "750.00",
              results: [
                {
                  month: "2021-12",
                  value: "50.00",
                },
                {
                  month: "2022-01",
                  value: "700.00",
                },
              ],
            },
          ],
          forecast: [
            {
              total: "1000.00",
              results: [
                {
                  month: "2022-02",
                  value: "100.00",
                },
                {
                  month: "2022-03",
                  value: "900.00",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
