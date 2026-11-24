/**
 * Starter HACCP plan for a small food-service business, based on US FDA Food
 * Code limits. It is a starting point only: each business must review and
 * adapt it to its own menu, equipment and local health-department rules.
 */

type Hazard = {
  type: "biological" | "chemical" | "physical" | "allergen";
  description: string;
  severity: "low" | "medium" | "high";
  likelihood: "low" | "medium" | "high";
  isSignificant: boolean;
  justification: string;
  controlMeasure: string;
};

type Limit = {
  limitType: "min" | "max" | "range" | "boolean";
  minValue?: number;
  maxValue?: number;
  unit?: string;
};

type TemplateTask = Limit & {
  name: string;
  instructions: string;
  frequency:
    | "per_batch"
    | "hourly"
    | "every_2_hours"
    | "every_4_hours"
    | "per_shift"
    | "daily"
    | "weekly";
  correctiveActionHint: string;
};

type TemplateCcp = Limit & {
  code: string;
  name: string;
  criticalLimit: string;
  monitoringProcedure: string;
  correctiveActionProcedure: string;
  verificationProcedure: string;
  hazardIndex: number; // which hazard on this step the CCP controls
  tasks: TemplateTask[];
};

export type TemplateStep = {
  name: string;
  description: string;
  hazards: Hazard[];
  ccp?: TemplateCcp;
  /** Prerequisite-program checks at this step that are not CCPs. */
  tasks?: TemplateTask[];
};

export type PlanTemplate = {
  key: string;
  name: string;
  description: string;
  steps: TemplateStep[];
};

const pathogenGrowth: Hazard = {
  type: "biological",
  description: "Growth of pathogenic bacteria (Salmonella, Listeria, E. coli O157:H7)",
  severity: "high",
  likelihood: "medium",
  isSignificant: true,
  justification: "TCS foods held in the danger zone (41–135°F) allow rapid bacterial growth.",
  controlMeasure: "Time and temperature control",
};

export const smallRestaurantTemplate: PlanTemplate = {
  key: "small-restaurant-v1",
  name: "Food Service HACCP Plan",
  description:
    "Starter plan for a small restaurant or café (FDA Food Code limits). Review and adapt before approving.",
  steps: [
    {
      name: "Receiving",
      description: "Accept deliveries of refrigerated, frozen and dry goods.",
      hazards: [
        {
          ...pathogenGrowth,
          likelihood: "low",
          isSignificant: false,
          justification: "Controlled by approved suppliers and receiving temperature checks (prerequisite program).",
          controlMeasure: "Approved suppliers; reject cold TCS foods above 41°F",
        },
        {
          type: "physical",
          description: "Foreign objects from damaged packaging",
          severity: "medium",
          likelihood: "low",
          isSignificant: false,
          justification: "Visual inspection on receipt; reject damaged goods.",
          controlMeasure: "Inspect packaging on receipt",
        },
      ],
      tasks: [
        {
          name: "Receiving temperature – refrigerated delivery",
          instructions: "Probe one item from each refrigerated delivery. Record the warmest reading.",
          frequency: "per_batch",
          limitType: "max",
          maxValue: 41,
          unit: "°F",
          correctiveActionHint: "Reject the delivery and notify the supplier.",
        },
      ],
    },
    {
      name: "Cold storage",
      description: "Hold TCS foods in walk-in and reach-in refrigeration.",
      hazards: [pathogenGrowth],
      ccp: {
        code: "CCP-1",
        name: "Cold holding",
        limitType: "max",
        maxValue: 41,
        unit: "°F",
        criticalLimit: "TCS foods held at 41°F or below.",
        monitoringProcedure: "Check and record each cooler's air temperature every 4 hours during operation.",
        correctiveActionProcedure:
          "If above 41°F for less than 4 hours, move food to working cooler and chill to 41°F. If unknown or more than 4 hours, discard. Call for repair.",
        verificationProcedure: "Manager reviews and signs logs daily. Thermometers calibrated weekly.",
        hazardIndex: 0,
        tasks: [
          {
            name: "Walk-in cooler temperature",
            instructions: "Read the calibrated thermometer inside the walk-in.",
            frequency: "every_4_hours",
            limitType: "max",
            maxValue: 41,
            unit: "°F",
            correctiveActionHint: "Move food to a working cooler; discard if held above 41°F for 4+ hours.",
          },
          {
            name: "Prep line reach-in temperature",
            instructions: "Probe a product in the reach-in cooler on the prep line.",
            frequency: "every_4_hours",
            limitType: "max",
            maxValue: 41,
            unit: "°F",
            correctiveActionHint: "Move food to a working cooler; discard if held above 41°F for 4+ hours.",
          },
        ],
      },
    },
    {
      name: "Preparation",
      description: "Thaw, cut, portion and assemble ingredients.",
      hazards: [
        {
          type: "biological",
          description: "Cross-contamination from raw animal products or hands",
          severity: "high",
          likelihood: "medium",
          isSignificant: false,
          justification: "Controlled by handwashing, sanitizing and separation SOPs (prerequisite programs).",
          controlMeasure: "Handwashing, sanitized surfaces, separate raw/RTE prep",
        },
        {
          type: "allergen",
          description: "Undeclared allergen cross-contact",
          severity: "high",
          likelihood: "low",
          isSignificant: false,
          justification: "Controlled by allergen SOP and labeled storage.",
          controlMeasure: "Allergen SOP; dedicated utensils",
        },
      ],
      tasks: [
        {
          name: "Sanitizer concentration",
          instructions: "Test the sanitizer bucket or 3-compartment sink with a test strip. Range per manufacturer label.",
          frequency: "every_4_hours",
          limitType: "range",
          minValue: 200,
          maxValue: 400,
          unit: "ppm",
          correctiveActionHint: "Remake the sanitizer solution and retest.",
        },
        {
          name: "Handwashing sinks stocked",
          instructions: "Soap, paper towels and warm water available at every handwashing sink.",
          frequency: "per_shift",
          limitType: "boolean",
          correctiveActionHint: "Restock immediately.",
        },
      ],
    },
    {
      name: "Cooking",
      description: "Cook raw animal foods to required internal temperatures.",
      hazards: [
        {
          type: "biological",
          description: "Survival of pathogens (Salmonella, Campylobacter) in poultry",
          severity: "high",
          likelihood: "high",
          isSignificant: true,
          justification: "Raw poultry is commonly contaminated; cooking is the kill step.",
          controlMeasure: "Cook to 165°F internal temperature",
        },
      ],
      ccp: {
        code: "CCP-2",
        name: "Cooking – poultry",
        limitType: "min",
        minValue: 165,
        unit: "°F",
        criticalLimit: "Internal temperature of 165°F or above (instantaneous).",
        monitoringProcedure: "Probe the thickest part of each batch with a calibrated thermometer.",
        correctiveActionProcedure: "Continue cooking until 165°F is reached. Retrain staff if repeated.",
        verificationProcedure: "Manager reviews logs daily; thermometers calibrated weekly.",
        hazardIndex: 0,
        tasks: [
          {
            name: "Cook temperature – poultry",
            instructions: "Probe the thickest part of each batch.",
            frequency: "per_batch",
            limitType: "min",
            minValue: 165,
            unit: "°F",
            correctiveActionHint: "Keep cooking until it reaches 165°F, then re-check.",
          },
        ],
      },
    },
    {
      name: "Hot holding",
      description: "Hold cooked foods hot for service.",
      hazards: [pathogenGrowth],
      ccp: {
        code: "CCP-3",
        name: "Hot holding",
        limitType: "min",
        minValue: 135,
        unit: "°F",
        criticalLimit: "Hot-held TCS foods at 135°F or above.",
        monitoringProcedure: "Probe each item in the hot-holding unit every 2 hours.",
        correctiveActionProcedure:
          "If below 135°F for less than 2 hours, reheat to 165°F. If unknown or more than 2 hours, discard.",
        verificationProcedure: "Manager reviews logs daily.",
        hazardIndex: 0,
        tasks: [
          {
            name: "Hot holding temperature",
            instructions: "Probe each item in the steam table or hot-holding cabinet.",
            frequency: "every_2_hours",
            limitType: "min",
            minValue: 135,
            unit: "°F",
            correctiveActionHint: "Reheat to 165°F if below 135°F for under 2 hours; otherwise discard.",
          },
        ],
      },
    },
    {
      name: "Cooling",
      description: "Cool cooked foods for later use.",
      hazards: [
        {
          ...pathogenGrowth,
          description: "Growth of spore-forming bacteria (C. perfringens, B. cereus) during slow cooling",
          likelihood: "high",
          justification: "Spores survive cooking and germinate if food cools slowly.",
          controlMeasure: "Two-stage cooling",
        },
      ],
      ccp: {
        code: "CCP-4",
        name: "Cooling",
        limitType: "max",
        maxValue: 70,
        unit: "°F",
        criticalLimit: "135°F to 70°F within 2 hours, then 70°F to 41°F within 4 more hours.",
        monitoringProcedure: "Record temperature at the 2-hour and 6-hour marks for each batch.",
        correctiveActionProcedure:
          "If not 70°F at 2 hours, reheat to 165°F and restart cooling, or discard. If not 41°F at 6 hours, discard.",
        verificationProcedure: "Manager reviews cooling logs daily.",
        hazardIndex: 0,
        tasks: [
          {
            name: "Cooling – 2-hour check",
            instructions: "Two hours after cooling began, probe the center of the batch.",
            frequency: "per_batch",
            limitType: "max",
            maxValue: 70,
            unit: "°F",
            correctiveActionHint: "Reheat to 165°F and restart cooling, or discard.",
          },
          {
            name: "Cooling – 6-hour check",
            instructions: "Six hours after cooling began, probe the center of the batch.",
            frequency: "per_batch",
            limitType: "max",
            maxValue: 41,
            unit: "°F",
            correctiveActionHint: "Discard the batch.",
          },
        ],
      },
    },
    {
      name: "Reheating",
      description: "Reheat previously cooked and cooled foods for hot holding.",
      hazards: [pathogenGrowth],
      ccp: {
        code: "CCP-5",
        name: "Reheating for hot holding",
        limitType: "min",
        minValue: 165,
        unit: "°F",
        criticalLimit: "Reheated to 165°F within 2 hours.",
        monitoringProcedure: "Probe each batch at the end of reheating.",
        correctiveActionProcedure: "Continue reheating; discard if 165°F not reached within 2 hours.",
        verificationProcedure: "Manager reviews logs daily.",
        hazardIndex: 0,
        tasks: [
          {
            name: "Reheat temperature",
            instructions: "Probe the center of each reheated batch.",
            frequency: "per_batch",
            limitType: "min",
            minValue: 165,
            unit: "°F",
            correctiveActionHint: "Keep reheating; discard if not 165°F within 2 hours.",
          },
        ],
      },
    },
  ],
};
