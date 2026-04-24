export interface VerticalTemplate {
  vertical: 'HEALTHCARE' | 'CONSTRUCTION' | 'GENERIC';
  jobRequirements: string[];
  requiredCertifications: string[];
  preferredCertifications: string[];
  interviewFocus: string[];
  screeningCriteria: {
    minExperience: number;
    requiredSkills: string[];
    preferredSkills: string[];
    redFlags: string[];
  };
}

const HEALTHCARE_CRITERIA = {
  requiredSkills: [
    'patient care',
    'clinical documentation',
    'medication administration',
    'vital signs monitoring',
    'emergency response',
  ],
  preferredSkills: [
    'electronic health records (EHR)',
    'telehealth',
    'specialty care',
    'care coordination',
    'quality improvement',
  ],
  redFlags: [
    'license suspension',
    'malpractice claims',
    'patient complaints',
    'fraudulent documentation',
    'HIPAA violations',
  ],
};

const CONSTRUCTION_CRITERIA = {
  requiredSkills: [
    'blueprint reading',
    'safety protocols',
    'equipment operation',
    'site management',
    'material handling',
  ],
  preferredSkills: [
    'project management',
    'CAD software',
    'OSHA certifications',
    'supervision experience',
    'estimating',
  ],
  redFlags: [
    'workplace accidents',
    'safety violations',
    'license revocation',
    'unfinished projects',
    'contractor disputes',
  ],
};

export const VERTICAL_TEMPLATES: Record<string, VerticalTemplate> = {
  HEALTHCARE: {
    vertical: 'HEALTHCARE',
    jobRequirements: [
      'Valid healthcare license/certification',
      'Minimum 1 year clinical experience',
      'Background check clearance',
      'Immunization records',
      'BLS/ALS certification (role-dependent)',
    ],
    requiredCertifications: [
      'Basic Life Support (BLS)',
      'State nursing license or equivalent',
    ],
    preferredCertifications: [
      'Advanced Cardiac Life Support (ACLS)',
      'Pediatric Advanced Life Support (PALS)',
      'Certified Medical Assistant (CMA)',
      'Specialty certifications',
    ],
    interviewFocus: [
      'Patient care scenarios',
      'Clinical decision-making',
      'Emergency response protocols',
      'Communication with patients/families',
      'Documentation accuracy',
      'HIPAA compliance',
    ],
    screeningCriteria: {
      minExperience: 1,
      requiredSkills: HEALTHCARE_CRITERIA.requiredSkills,
      preferredSkills: HEALTHCARE_CRITERIA.preferredSkills,
      redFlags: HEALTHCARE_CRITERIA.redFlags,
    },
  },
  CONSTRUCTION: {
    vertical: 'CONSTRUCTION',
    jobRequirements: [
      'High school diploma or equivalent',
      'Relevant trade experience',
      'Valid driver license',
      'OSHA 10-hour certification',
      'Physical ability to perform job duties',
    ],
    requiredCertifications: [
      'OSHA 10-Hour Construction',
      'Trade-specific certification',
    ],
    preferredCertifications: [
      'OSHA 30-Hour Construction',
      'Project Management Professional (PMP)',
      'LEED Accreditation',
      'Safety Professional certification',
    ],
    interviewFocus: [
      'Safety procedures and protocols',
      'Blueprint and spec interpretation',
      'Tool and equipment proficiency',
      'Team coordination',
      'Problem-solving scenarios',
      'Time management',
    ],
    screeningCriteria: {
      minExperience: 2,
      requiredSkills: CONSTRUCTION_CRITERIA.requiredSkills,
      preferredSkills: CONSTRUCTION_CRITERIA.preferredSkills,
      redFlags: CONSTRUCTION_CRITERIA.redFlags,
    },
  },
  GENERIC: {
    vertical: 'GENERIC',
    jobRequirements: [
      'Relevant education',
      'Required technical skills',
      'Communication skills',
      'Problem-solving abilities',
    ],
    requiredCertifications: [],
    preferredCertifications: [],
    interviewFocus: [
      'Technical competencies',
      'Behavioral questions',
      'Problem-solving scenarios',
    ],
    screeningCriteria: {
      minExperience: 0,
      requiredSkills: [],
      preferredSkills: [],
      redFlags: [],
    },
  },
};

export function getVerticalTemplate(vertical: string): VerticalTemplate {
  return VERTICAL_TEMPLATES[vertical.toUpperCase()] || VERTICAL_TEMPLATES.GENERIC;
}

export function evaluateVerticalFit(
  cvText: string,
  vertical: string
): { score: number; matchedSkills: string[]; missingSkills: string[] } {
  const template = getVerticalTemplate(vertical);
  const normalizedCV = cvText.toLowerCase();

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  const allSkills = [
    ...template.screeningCriteria.requiredSkills,
    ...template.screeningCriteria.preferredSkills,
  ];

  for (const skill of allSkills) {
    if (normalizedCV.includes(skill.toLowerCase())) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  const score = Math.round((matchedSkills.length / allSkills.length) * 100);

  return { score, matchedSkills, missingSkills };
}