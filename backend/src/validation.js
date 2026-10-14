const { z } = require('zod');
const {
  YES_NO,
  GENDERS,
  PROVINCES_OF_BIRTH,
  DOMICILE_PROVINCES,
  NATIONALITIES,
  ADDRESS_TYPES,
  RELIGIONS,
  MOTHER_LANGUAGES,
  BLOOD_GROUPS,
  QUALIFICATIONS,
  PROFESSIONS,
  INCOME_RANGES,
  ORPHAN_TYPES,
  SHIFTS,
  MEDIUMS_OF_INSTRUCTION,
  MODES_OF_STUDY,
  TRANSPORT_FACILITIES,
  EMERGENCY_RELATIONS,
  IDP_STATUSES,
  DISABILITY_TYPES,
  CERTIFICATE_STATUSES,
  MENTAL_HEALTH_TYPES,
  DIFFICULTY_LEVELS,
  DEVICE_TYPES,
  SUBMISSION_STATUSES,
  ADMIN_ROLES
} = require('./constants/enums');

// Helpers for permissive and forgiving schemas
const optString = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((val) => (val === undefined || val === null ? '' : String(val).trim()));

const optEnum = (values, defaultVal = '') =>
  z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === undefined || val === null ? '' : String(val).trim()))
    .refine((val) => val === '' || values.includes(val), {
      message: `Must be one of: ${values.join(', ')}`
    });

const optEmail = z
  .string()
  .optional()
  .nullable()
  .transform((val) => (val === undefined || val === null ? '' : String(val).trim().toLowerCase()))
  .refine((val) => val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: 'Invalid email address'
  });

const optCnic = z
  .string()
  .optional()
  .nullable()
  .transform((val) => (val === undefined || val === null ? '' : String(val).trim()))
  .refine((val) => val === '' || /^\d{5}-\d{7}-\d$/.test(val), {
    message: 'CNIC / Form-B must follow format XXXXX-XXXXXXX-X'
  });

const optDate = z
  .union([z.date(), z.string()])
  .optional()
  .nullable()
  .transform((val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  });

const optNumber = (defaultVal = 0) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === undefined || val === null || val === '') return defaultVal;
      const num = Number(val);
      return isNaN(num) ? defaultVal : num;
    });

// 1.3 Address Schema
const addressSchema = z
  .object({
    addressType: optString,
    sectorSocietyVillageName: optString,
    houseNo: optString,
    streetNo: optString,
    contactNumber: optString,
    city: optString
  })
  .partial()
  .default({});

// 1.5 Parent Sub-schema
const personSchema = z
  .object({
    name: optString,
    cnic: optCnic,
    isAlive: optEnum(YES_NO),
    domicileProvince: optString,
    domicileDistrict: optString,
    contactNumber: optString,
    landlineNumber: optString,
    email: optEmail,
    qualification: optString,
    otherQualification: optString,
    profession: optString,
    otherProfession: optString,
    incomePerMonth: optString,
    bps: optString
  })
  .partial()
  .default({});

// Main Census Form Schema
const censusSchema = z
  .object({
    personalDetails: z.object({
      studentName: z.string().trim().min(1, 'Student name is required').max(200),
      cnicFormAvailable: optEnum(YES_NO),
      cnicOrFormBNumber: optCnic,
      gender: optEnum(GENDERS),
      dateOfBirth: optDate,
      provinceOfBirth: optString,
      districtOfBirth: optString
    }),

    domicileInformation: z
      .object({
        nationality: optString,
        otherNationality: optString,
        domicileProvince: optString,
        domicileDistrict: optString
      })
      .partial()
      .default({}),

    address: z
      .object({
        sameAsPresent: z.boolean().optional(),
        present: addressSchema,
        permanent: addressSchema
      })
      .partial()
      .default({}),

    religionLanguageDetails: z
      .object({
        religion: optString,
        otherReligion: optString,
        motherLanguage: optString,
        otherMotherLanguage: optString,
        bloodGroup: optString,
        isHafiz: optEnum(YES_NO),
        email: optEmail
      })
      .partial()
      .default({}),

    parentGuardian: z
      .object({
        isOrphan: z.union([z.boolean(), z.string()]).optional(),
        father: personSchema,
        mother: personSchema,
        orphanGuardian: z
          .object({
            isOrphan: z.union([z.boolean(), z.string()]).optional(),
            orphanType: optString,
            name: optString,
            relation: optString,
            cnic: optCnic,
            guardianCnic: optCnic,
            guardianContactNumber: optString,
            guardianEmail: optEmail,
            guardianQualification: optString,
            guardianProfession: optString,
            guardianIncome: optString,
            guardianBps: optString
          })
          .partial()
          .default({})
      })
      .partial()
      .default({}),

    educationalDetails: z.object({
      admissionNumber: z.string().trim().min(1, 'Admission number is required').max(100),
      class: optString,
      section: optString,
      group: optString,
      resultPercentageLastClass: optString,
      dateOfAdmission: optDate,
      classAdmittedIn: optString,
      shift: optString,
      mediumOfInstruction: optString,
      modeOfStudy: optString,
      lastInstitutionFDE: optString,
      lastInstitutionOther: optString,
      availingMealProgram: optEnum(YES_NO),
      yearsToCompletePrimary: optNumber(null)
    }),

    siblingDetails: z
      .object({
        totalSiblings: optNumber(0),
        siblingsSameInstitution: optNumber(0),
        siblingsOtherFDE: optNumber(0),
        siblingsPrivateInstitutions: optNumber(0)
      })
      .partial()
      .default({}),

    transportScholarship: z
      .object({
        transportFacility: optString,
        recipientOfScholarship: optEnum(YES_NO),
        scholarshipDetails: optString,
        specialCoCurricularAchievement: optEnum(YES_NO),
        achievementDetails: optString
      })
      .partial()
      .default({}),

    emergencyContact: z
      .object({
        name: optString,
        contactNumber: optString,
        relation: optString,
        specifyRelation: optString
      })
      .partial()
      .default({}),

    idpDetails: z
      .object({
        isRefugeeOrIDP: optEnum(YES_NO),
        idpStatus: optString,
        isRegisteredAsRefugee: z.boolean().optional().default(false),
        refugeeCardNumber: optString
      })
      .partial()
      .default({}),

    healthDetails: z
      .object({
        majorDisability: z
          .object({
            hasDisability: optEnum(YES_NO),
            type: optString,
            certificateAttached: optString,
            certificateFileUrl: optString
          })
          .partial()
          .default({}),
        mentalHealth: z
          .object({
            hasMentalDisability: optEnum(YES_NO),
            type: optString,
            otherSpecify: optString
          })
          .partial()
          .default({}),
        otherMedicalConditions: optString,
        visionDetails: z
          .object({
            visuallyFit6x6: optEnum(YES_NO),
            glassesPrescription: optString,
            wearsGlasses: optEnum(YES_NO),
            boardReadingDifficulty: optString
          })
          .partial()
          .default({}),
        hearingDetails: z
          .object({
            hasHearingDifficulty: optEnum(YES_NO),
            details: optString,
            usesHearingAid: optEnum(YES_NO),
            difficultyListening: optEnum(YES_NO)
          })
          .partial()
          .default({}),
        mobilityDetails: z
          .object({
            difficultyWalking: optEnum(YES_NO),
            usesCrutchesWalker: optEnum(YES_NO)
          })
          .partial()
          .default({}),
        learningAbilities: z
          .object({
            difficultyReadingWriting: optString,
            difficultyRemembering: optString,
            difficultyConcentrating: optString
          })
          .partial()
          .default({}),
        vaccinationCompleted: optEnum(YES_NO)
      })
      .partial()
      .default({}),

    digitalAccess: z
      .object({
        hasDigitalDeviceAtHome: optEnum(YES_NO),
        deviceTypes: z.array(z.string()).optional().default([]),
        hasInternetAtHome: optEnum(YES_NO)
      })
      .partial()
      .default({}),

    parentGuardianSignatureUrl: optString,
    principalSignature: optString,
    attestation: z
      .object({
        signatureDataUrl: optString,
        signedName: optString,
        agreedToAccuracy: z.boolean().optional().default(false)
      })
      .partial()
      .default({}),

    honeypot: optString
  })
  .strip();

// Admin Authentication Schemas
const loginSchema = z.object({
  email: z.string().trim().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const createAdminSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(ADMIN_ROLES).default('Viewer')
});

const updateAdminSchema = z.object({
  name: z.string().trim().min(2).optional(),
  role: z.enum(ADMIN_ROLES).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional()
});

const statusUpdateSchema = z.object({
  status: z.enum(SUBMISSION_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${SUBMISSION_STATUSES.join(', ')}` })
  })
});

const bulkStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'At least one student ID is required'),
  status: z.enum(SUBMISSION_STATUSES)
});

module.exports = {
  censusSchema,
  loginSchema,
  createAdminSchema,
  updateAdminSchema,
  statusUpdateSchema,
  bulkStatusSchema
};
