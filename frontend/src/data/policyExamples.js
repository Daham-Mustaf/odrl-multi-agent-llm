/**
 * Policy Examples Data
 * 
 * Sample policy descriptions for testing the ODRL Policy Generator.
 * Categorized into straightforward and contradictory policies.
 * 
 * @module data/policyExamples
 */

export const policyExamples = {
  straightforward: [
    { 
      title: "Academic Dataset",
      text: "Researchers can download and analyze the dataset for non-commercial research purposes. Attribution is required. Commercial use is prohibited.",
      hasContradiction: false,
      category: "research"
    },
    { 
      title: "Software License",
      text: "Users may use, copy, modify, and distribute the software for any purpose.However, users are strictly prohibited from copying, modifying, or distributing the software under any circumstances",
      hasContradiction: false,
      category: "software"
    },
    { 
      title: "Photo Rights",
      text: "The photographer grants rights to use the photo on social media with attribution. Print publication requires additional permission.",
      hasContradiction: false,
      category: "media"
    },
    {
      title: "Video Streaming License",
      text: "Users may stream the video content for personal viewing. The content must not be downloaded or recorded. Streaming is permitted on up to 3 devices simultaneously.",
      hasContradiction: false,
      category: "media"
    },
    {
      title: "Educational Resource",
      text: "Teachers may use this material in classroom settings. Digital copies may be made for enrolled students. Commercial tutoring services may not use this material.",
      hasContradiction: false,
      category: "education"
    },
    {
      title: "Cultural Heritage Object",
      text: "The digital reproduction of this cultural heritage object may be viewed online for research and education. High-resolution downloads require institutional affiliation. Commercial reproduction is prohibited without written consent.",
      hasContradiction: false,
      category: "cultural-heritage"
    }
  ],

  contradictory: [
    {
      title: "Conflicting Distribution Rights",
      text: "Users may freely distribute the content to anyone. Distribution of this content is strictly prohibited under all circumstances.",
      hasContradiction: true,
      contradictionHint: "Permits and prohibits distribution simultaneously",
      contradictionType: "Direct Permission-Prohibition Conflict",
      severity: "high"
    },
    {
      title: "Temporal Contradiction",
      text: "This license is valid from January 1, 2025 to December 31, 2024. Users may access the resource during this period.",
      hasContradiction: true,
      contradictionHint: "End date precedes start date",
      contradictionType: "Temporal Inconsistency",
      severity: "high"
    },
    {
      title: "Purpose Conflict",
      text: "The dataset may only be used for commercial purposes. Non-commercial research use is required for all applications of this dataset.",
      hasContradiction: true,
      contradictionHint: "Requires both commercial-only and non-commercial use",
      contradictionType: "Mutually Exclusive Purposes",
      severity: "high"
    },
    {
      title: "Modification Paradox",
      text: "Users are permitted to modify the work in any way. Any modification of the original work is expressly forbidden.",
      hasContradiction: true,
      contradictionHint: "Allows and forbids modifications",
      contradictionType: "Action Permission-Prohibition Conflict",
      severity: "high"
    },
    {
      title: "Attribution Conflict",
      text: "Attribution to the original author must be provided. Users must not attribute this work to anyone, including the original creator.",
      hasContradiction: true,
      contradictionHint: "Requires and prohibits attribution",
      contradictionType: "Duty-Prohibition Conflict",
      severity: "high"
    },
    {
      title: "Access Contradiction",
      text: "This resource is publicly available to all users. Access is restricted to registered members only.",
      hasContradiction: true,
      contradictionHint: "Public access vs. restricted access",
      contradictionType: "Assignee Scope Conflict",
      severity: "medium"
    },
    {
      title: "Derivative Works Paradox",
      text: "Users may create derivative works based on this content. Creating any works derived from this content is not permitted.",
      hasContradiction: true,
      contradictionHint: "Permits and prohibits derivative creation",
      contradictionType: "Direct Permission-Prohibition Conflict",
      severity: "high"
    },
    {
      title: "Geographic Contradiction",
      text: "This license is valid worldwide without geographic restrictions. Use is permitted only within the European Union.",
      hasContradiction: true,
      contradictionHint: "Worldwide vs. EU-only restriction",
      contradictionType: "Spatial Constraint Conflict",
      severity: "medium"
    },
    {
      title: "Multiple Temporal Conflicts",
      text: "Access is granted permanently with no expiration. This license expires on June 1, 2025. After July 1, 2024, all rights are revoked.",
      hasContradiction: true,
      contradictionHint: "Permanent, expiring, and already-revoked access",
      contradictionType: "Multiple Temporal Contradictions",
      severity: "high"
    },
    {
      title: "Compensation Conflict",
      text: "Users must pay a licensing fee of 100 EUR to use this resource. This resource is provided free of charge with no fees required.",
      hasContradiction: true,
      contradictionHint: "Requires payment and prohibits payment",
      contradictionType: "Compensation Contradiction",
      severity: "high"
    },
    {
      title: "Complex Multi-Constraint Conflict",
      text: "Educational institutions may use this for teaching purposes only. Commercial use is required. The content must be used for non-commercial research. Teaching applications are prohibited.",
      hasContradiction: true,
      contradictionHint: "Multiple conflicting purpose and assignee constraints",
      contradictionType: "Complex Multi-Dimensional Conflict",
      severity: "critical"
    },
    {
      title: "Count-Based Contradiction",
      text: "Users may make up to 5 copies of this document. No copies of any kind are permitted. Users must make exactly 10 copies for archival purposes.",
      hasContradiction: true,
      contradictionHint: "Conflicting copy count requirements",
      contradictionType: "Cardinality Conflict",
      severity: "high"
    },
    {
      title: "Cultural Heritage Distribution Paradox",
      text: "This digitized artwork from our museum collection may be freely shared with the public for educational purposes. Sharing this artwork outside the institution is strictly forbidden. Distribution is mandatory for all partner institutions.",
      hasContradiction: true,
      contradictionHint: "Free sharing, forbidden sharing, and mandatory distribution",
      contradictionType: "Complex Multi-Dimensional Conflict",
      severity: "critical"
    },
    {
      title: "Subtle Modification Rights",
      text: "Users can read and print the document but cannot modify or distribute it. However, users are allowed to share modified versions with attribution. The policy expires on December 31, 2025.",
      hasContradiction: true,
      contradictionHint: "Cannot modify vs. can share modified versions",
      contradictionType: "Implicit Contradiction",
      severity: "medium"
    }
  ]
};

/**
 * Get examples by category
 * @param {string} category - 'straightforward' or 'contradictory'
 * @returns {Array} Array of policy examples
 */
export const getExamplesByCategory = (category) => {
  return policyExamples[category] || [];
};

/**
 * Get all contradictory examples
 * @returns {Array} Array of contradictory policy examples
 */
export const getContradictoryExamples = () => {
  return policyExamples.contradictory;
};

/**
 * Get all straightforward examples
 * @returns {Array} Array of straightforward policy examples
 */
export const getStraightforwardExamples = () => {
  return policyExamples.straightforward;
};

/**
 * Get contradiction types for filtering
 * @returns {Array<string>} Array of unique contradiction types
 */
export const getContradictionTypes = () => {
  const types = new Set();
  policyExamples.contradictory.forEach(example => {
    if (example.contradictionType) {
      types.add(example.contradictionType);
    }
  });
  return Array.from(types).sort();
};

/**
 * Get examples by severity level
 * @param {string} severity - 'low', 'medium', 'high', or 'critical'
 * @returns {Array} Filtered contradictory examples
 */
export const getExamplesBySeverity = (severity) => {
  return policyExamples.contradictory.filter(
    example => example.severity === severity
  );
};

/**
 * Get example by title
 * @param {string} title - Title of the example
 * @returns {Object|null} Example object or null if not found
 */
export const getExampleByTitle = (title) => {
  const allExamples = [
    ...policyExamples.straightforward,
    ...policyExamples.contradictory
  ];
  return allExamples.find(example => example.title === title) || null;
};