export const sampleDowRequest = {
  documentType: "DESCRIPTION_OF_WORK",
  templatePayload: {
    award_history: [
      {
        contract_award_type: "INITIAL_AWARD",
        effective_date: "2022-05-20",
        modification_order: "",
      },
      {
        contract_award_type: "MODIFICATION",
        modification_order: 1,
        effective_date: "2022-09-01",
      },
      {
        contract_award_type: "MODIFICATION",
        modification_order: 3,
        effective_date: "2023-02-01",
      },
    ],
    contract_information: {
      contract_number: "1234567890",
      current_contract_exists: true,
      contract_expiration_date: "2022-09-30",
      incumbent_contractor_name: "Morgan Hall",
      previous_task_order_number: "0987654321",
    },
    to_title: "AT-7394 package",
    scope: "Package used for AT-7394 for testing purposes.",
    scope_surge: "34",
    current_environment: {
      current_environment_exists: true,
      environment_instances: [
        {
          instance_name: "Test AT-7394",
          classification_level: {
            classification: "U",
            impact_level: "IL4",
          },
          instance_location: "CSP",
          csp_region: "CSP_A",
          performance_tier: null,
          pricing_model: "PAY_AS_YOU_GO",
          pricing_model_expiration: "2022-11-30",
          operating_system_licensing: "Linux  MIT",
          number_of_vcpus: 4,
          storage_type: null,
          storage_amount: 30,
          storage_unit: "GB",
          memory_amount: 32,
          memory_unit: "GB",
          data_egress_monthly_amount: 2,
          data_egress_monthly_unit: "GB",
        },
        {
          instance_name: "Another Test instance",
          classification_level: {
            classification: "TS",
            impact_level: null,
          },
          instance_location: "HYBRID",
          csp_region: "CSP_A",
          performance_tier: null,
          pricing_model: "RESERVED",
          pricing_model_expiration: "2023-02-04",
          operating_system_licensing: "Arch Linux",
          number_of_vcpus: 12,
          storage_type: null,
          storage_amount: 20,
          storage_unit: "TB",
          memory_amount: 128,
          memory_unit: "GB",
          data_egress_monthly_amount: 40,
          data_egress_monthly_unit: "GB",
        },
      ],
      additional_info: "Currently NA at the moment",
    },
    selected_service_offerings: [
      {
        other_service_offering: "N/A",
        service_offering: {
          service_offering_group: "DEVELOPER_TOOLS",
          name: "Cloud Audit/Monitoring Tools",
        },
        classification_instances: [
          {
            need_for_entire_task_order_duration: true,
            usage_description: "Monitoring network data",
            classification_level: {
              impact_level: null,
              classification: "TS",
            },
            selected_periods: [],
          },
        ],
      },
      {
        other_service_offering: "Special custom built app - not SNOW",
        service_offering: {
          name: "Special custom built app - not SNOW",
          service_offering_group: null,
        },
        classification_instances: [
          {
            need_for_entire_task_order_duration: true,
            usage_description: "To handle special cases that can not be done in SNOW",
            classification_level: {
              impact_level: null,
              classification: "TS",
            },
            selected_periods: [],
          },
        ],
      },
      {
        other_service_offering: "N/A",
        service_offering: {
          service_offering_group: "APPLICATIONS",
          name: "Application",
        },
        classification_instances: [
          {
            need_for_entire_task_order_duration: false,
            usage_description: "Staging App",
            classification_level: {
              impact_level: "IL4",
              classification: "U",
            },
            selected_periods: [
              {
                period_type: "OPTION",
                period_unit_count: 30,
                period_unit: "DAY",
                option_order: 4,
              },
              {
                period_type: "BASE",
                period_unit_count: "1",
                period_unit: "YEAR",
                option_order: null,
              },
            ],
          },
          {
            need_for_entire_task_order_duration: null,
            usage_description: "Basic App ",
            classification_level: {
              impact_level: "IL4",
              classification: "U",
            },
            selected_periods: [
              {
                period_type: "OPTION",
                period_unit_count: 12,
                period_unit: "WEEK",
                option_order: 2,
              },
              {
                period_type: "BASE",
                period_unit_count: "1",
                period_unit: "YEAR",
                option_order: null,
              },
              {
                period_type: "OPTION",
                period_unit_count: 30,
                period_unit: "DAY",
                option_order: 4,
              },
              {
                period_type: "OPTION",
                period_unit_count: 3,
                period_unit: "MONTH",
                option_order: 1,
              },
            ],
          },
        ],
      },
    ],
    period_of_performance: {
      base_period: {
        period_unit: "YEAR",
        period_unit_count: "1",
        period_type: "BASE",
        option_order: null,
      },
      option_periods: [
        {
          period_type: "OPTION",
          period_unit_count: 12,
          period_unit: "WEEK",
          option_order: 2,
        },
        {
          period_type: "OPTION",
          period_unit_count: 3,
          period_unit: "MONTH",
          option_order: 1,
        },
        {
          period_type: "OPTION",
          period_unit_count: 30,
          period_unit: "DAY",
          option_order: 4,
        },
      ],
      pop_start_request: true,
      requested_pop_start_date: "2022-09-30",
      time_frame: "NO_SOONER_THAN",
      recurring_requirement: null,
    },
    gfe_overview: {
      gfe_or_gfp_furnished: true,
      property_accountable: true,
      dpas_unit_id: "888999",
      dpas_custodian_number: "909090",
      property_custodian_name: "Jane Smith",
    },
    contract_considerations: {
      packaging_shipping_none_apply: true,
      packaging_shipping_other: true,
      packaging_shipping_other_explanation: "N/A",
      potential_conflict_of_interest: false,
      conflict_of_interest_explanation: "None so far.",
      contractor_provided_transfer: true,
      contractor_required_training: true,
      required_training_services: ["basic training", "intermediate training", "advanced traning"],
    },
    section_508_accessibility_standards: {
      pii_present: true,
      work_to_be_performed: "Investigation of specific individuals",
      system_of_record_name: "Secret Name",
      FOIA_city_apo_fpo: "Crystal",
      FOIA_country: "United States of America",
      FOIA_street_address_1: "973 Inspector Rd",
      FOIA_street_address_2: "",
      FOIA_address_type: "US",
      FOIA_zip_postal_code: "22222",
      FOIA_state_province_code: "VA",
      FOIA_full_name: "Alice Wonder",
      FOIA_email: "alice@ccpo.mil",
      BAA_required: false,
      potential_to_be_harmful: false,
      section_508_sufficient: null,
      accessibility_reqs_508: "Some requirements for 508.",
    },
  },
};

export const sampleIgceRequest = {
  documentType: "INDEPENDENT_GOVERNMENT_COST_ESTIMATE",
  templatePayload: {
    funding_document: {
      funding_type: "FS_FORM",
      gtc_number: "1234",
      order_number: "1234",
      mipr_number: "1234",
    },
    surge_capabilities: 5,
    periods_estimate: [
      {
        period: {
          period_unit: "YEAR",
          period_unit_count: "1",
          period_type: "BASE",
          option_order: null,
        },
        period_line_items: [
          {
            clin: "0001",
            idiq_clin: "1000_CLOUD",
            dow_task_number: "4.2.1.1",
            service_offering: "Compute",
            item_description_or_config_summary: "description of item",
            monthly_price: "500",
            months_in_period: 12,
          },
          {
            clin: "0002",
            idiq_clin: "2000_CLOUD_SUPPORT",
            dow_task_number: "4.2.1.2",
            service_offering: "Applications",
            item_description_or_config_summary: "description of item",
            monthly_price: "500",
            months_in_period: 12,
          },
          {
            clin: "0003",
            idiq_clin: "3000_OTHER",
            dow_task_number: "4.2.1.3",
            service_offering: "Database",
            item_description_or_config_summary: "description of item",
            monthly_price: "500",
            months_in_period: 12,
          },
        ],
      },
    ],
  },
};
