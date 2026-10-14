const mongoose = require('mongoose');
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
  ADMIN_ROLES,
  AUDIT_ACTIONS
} = require('./constants/enums');

const emailField = {
  type: String,
  lowercase: true,
  trim: true,
  default: ''
};

// 1.3 Address Sub-schema
const addressSchema = new mongoose.Schema(
  {
    addressType: { type: String, enum: [...ADDRESS_TYPES, ''], default: '' },
    sectorSocietyVillageName: { type: String, trim: true, default: '' },
    houseNo: { type: String, trim: true, default: '' },
    streetNo: { type: String, trim: true, default: '' },
    contactNumber: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: 'Islamabad' }
  },
  { _id: false }
);

// 1.5 Parent Sub-schema
const personSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    cnic: { type: String, trim: true, default: '' },
    isAlive: { type: String, enum: [...YES_NO, ''], default: 'Yes' },
    domicileProvince: { type: String, enum: [...DOMICILE_PROVINCES, ''], default: '' },
    domicileDistrict: { type: String, trim: true, default: '' },
    contactNumber: { type: String, trim: true, default: '' },
    landlineNumber: { type: String, trim: true, default: '' },
    email: emailField,
    qualification: { type: String, enum: [...QUALIFICATIONS, ''], default: '' },
    otherQualification: { type: String, trim: true, default: '' },
    profession: { type: String, enum: [...PROFESSIONS, ''], default: '' },
    otherProfession: { type: String, trim: true, default: '' },
    incomePerMonth: { type: String, enum: [...INCOME_RANGES, ''], default: '' },
    bps: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

// 1. Main StudentCensus Schema
const studentCensusSchema = new mongoose.Schema(
  {
    personalDetails: {
      studentName: { type: String, required: true, trim: true },
      cnicFormAvailable: { type: String, enum: [...YES_NO, ''], default: 'No' },
      cnicOrFormBNumber: { type: String, trim: true, default: '' },
      gender: { type: String, enum: [...GENDERS, ''], default: '' },
      dateOfBirth: { type: Date },
      provinceOfBirth: { type: String, enum: [...PROVINCES_OF_BIRTH, ''], default: '' },
      districtOfBirth: { type: String, trim: true, default: '' }
    },

    domicileInformation: {
      nationality: { type: String, enum: [...NATIONALITIES, ''], default: 'Pakistani' },
      otherNationality: { type: String, trim: true, default: '' },
      domicileProvince: { type: String, enum: [...DOMICILE_PROVINCES, ''], default: '' },
      domicileDistrict: { type: String, trim: true, default: '' }
    },

    address: {
      sameAsPresent: { type: Boolean, default: false },
      present: { type: addressSchema, default: () => ({}) },
      permanent: { type: addressSchema, default: () => ({}) }
    },

    religionLanguageDetails: {
      religion: { type: String, enum: [...RELIGIONS, ''], default: 'Muslim' },
      otherReligion: { type: String, trim: true, default: '' },
      motherLanguage: { type: String, enum: [...MOTHER_LANGUAGES, ''], default: 'Urdu' },
      otherMotherLanguage: { type: String, trim: true, default: '' },
      bloodGroup: { type: String, enum: [...BLOOD_GROUPS, ''], default: '' },
      isHafiz: { type: String, enum: [...YES_NO, ''], default: 'No' },
      email: emailField
    },

    parentGuardian: {
      father: { type: personSchema, default: () => ({}) },
      mother: { type: personSchema, default: () => ({}) },
      orphanGuardian: {
        isOrphan: { type: Boolean, default: false },
        orphanType: { type: String, enum: [...ORPHAN_TYPES, ''], default: '' },
        name: { type: String, trim: true, default: '' },
        relation: { type: String, trim: true, default: '' },
        cnic: { type: String, trim: true, default: '' },
        guardianCnic: { type: String, trim: true, default: '' },
        guardianContactNumber: { type: String, trim: true, default: '' },
        guardianEmail: emailField,
        guardianQualification: { type: String, trim: true, default: '' },
        guardianProfession: { type: String, trim: true, default: '' },
        guardianIncome: { type: String, trim: true, default: '' },
        guardianBps: { type: String, trim: true, default: '' }
      }
    },

    educationalDetails: {
      class: { type: String, trim: true, default: '' },
      section: { type: String, trim: true, default: '' },
      group: { type: String, trim: true, default: '' },
      resultPercentageLastClass: { type: mongoose.Schema.Types.Mixed, default: '' },
      dateOfAdmission: { type: Date },
      admissionNumber: { type: String, required: true, trim: true, index: true },
      classAdmittedIn: { type: String, trim: true, default: '' },
      shift: { type: String, enum: [...SHIFTS, ''], default: 'Morning' },
      mediumOfInstruction: { type: String, enum: [...MEDIUMS_OF_INSTRUCTION, ''], default: 'English' },
      modeOfStudy: { type: String, enum: [...MODES_OF_STUDY, ''], default: 'Regular' },
      lastInstitutionFDE: { type: String, trim: true, default: '' },
      lastInstitutionOther: { type: String, trim: true, default: '' },
      availingMealProgram: { type: String, enum: [...YES_NO, ''], default: 'No' },
      yearsToCompletePrimary: { type: Number, default: null }
    },

    siblingDetails: {
      totalSiblings: { type: Number, default: 0 },
      siblingsSameInstitution: { type: Number, default: 0 },
      siblingsOtherFDE: { type: Number, default: 0 },
      siblingsPrivateInstitutions: { type: Number, default: 0 }
    },

    transportScholarship: {
      transportFacility: { type: String, enum: [...TRANSPORT_FACILITIES, ''], default: 'None / Walking' },
      recipientOfScholarship: { type: String, enum: [...YES_NO, ''], default: 'No' },
      scholarshipDetails: { type: String, trim: true, default: '' },
      specialCoCurricularAchievement: { type: String, enum: [...YES_NO, ''], default: 'No' },
      achievementDetails: { type: String, trim: true, default: '' }
    },

    emergencyContact: {
      name: { type: String, trim: true, default: '' },
      contactNumber: { type: String, trim: true, default: '' },
      relation: { type: String, enum: [...EMERGENCY_RELATIONS, ''], default: 'Father' },
      specifyRelation: { type: String, trim: true, default: '' }
    },

    idpDetails: {
      isRefugeeOrIDP: { type: String, enum: [...YES_NO, ''], default: 'No' },
      idpStatus: { type: String, enum: [...IDP_STATUSES, ''], default: '' },
      isRegisteredAsRefugee: { type: Boolean, default: false },
      refugeeCardNumber: { type: String, trim: true, default: '' }
    },

    healthDetails: {
      majorDisability: {
        hasDisability: { type: String, enum: [...YES_NO, ''], default: 'No' },
        type: { type: String, enum: [...DISABILITY_TYPES, ''], default: '' },
        certificateAttached: { type: String, enum: [...CERTIFICATE_STATUSES, ''], default: 'Not available' },
        certificateFileUrl: { type: String, trim: true, default: '' }
      },
      mentalHealth: {
        hasMentalDisability: { type: String, enum: [...YES_NO, ''], default: 'No' },
        type: { type: String, enum: [...MENTAL_HEALTH_TYPES, ''], default: '' },
        otherSpecify: { type: String, trim: true, default: '' }
      },
      otherMedicalConditions: { type: String, trim: true, default: '' },
      visionDetails: {
        visuallyFit6x6: { type: String, enum: [...YES_NO, ''], default: 'Yes' },
        glassesPrescription: { type: String, trim: true, default: '' },
        wearsGlasses: { type: String, enum: [...YES_NO, ''], default: 'No' },
        boardReadingDifficulty: { type: String, enum: [...DIFFICULTY_LEVELS, ''], default: 'No Difficulty' }
      },
      hearingDetails: {
        hasHearingDifficulty: { type: String, enum: [...YES_NO, ''], default: 'No' },
        details: { type: String, trim: true, default: '' },
        usesHearingAid: { type: String, enum: [...YES_NO, ''], default: 'No' },
        difficultyListening: { type: String, enum: [...YES_NO, ''], default: 'No' }
      },
      mobilityDetails: {
        difficultyWalking: { type: String, enum: [...YES_NO, ''], default: 'No' },
        usesCrutchesWalker: { type: String, enum: [...YES_NO, ''], default: 'No' }
      },
      learningAbilities: {
        difficultyReadingWriting: { type: String, enum: [...DIFFICULTY_LEVELS, ''], default: 'No Difficulty' },
        difficultyRemembering: { type: String, enum: [...DIFFICULTY_LEVELS, ''], default: 'No Difficulty' },
        difficultyConcentrating: { type: String, enum: [...DIFFICULTY_LEVELS, ''], default: 'No Difficulty' }
      },
      vaccinationCompleted: { type: String, enum: [...YES_NO, ''], default: 'Yes' }
    },

    digitalAccess: {
      hasDigitalDeviceAtHome: { type: String, enum: [...YES_NO, ''], default: 'No' },
      deviceTypes: [{ type: String, enum: DEVICE_TYPES }],
      hasInternetAtHome: { type: String, enum: [...YES_NO, ''], default: 'No' }
    },

    parentGuardianSignatureUrl: { type: String, default: '' },
    principalSignature: { type: String, default: '' },
    attestation: {
      signatureDataUrl: { type: String, default: '' },
      signedName: { type: String, trim: true, default: '' },
      agreedToAccuracy: { type: Boolean, default: false }
    },
    submissionStatus: {
      type: String,
      enum: SUBMISSION_STATUSES,
      default: 'Submitted',
      index: true
    },
    submittedAt: { type: Date, default: Date.now, index: true },
    submittedByIp: { type: String, default: '' },
    formVersion: { type: String, default: () => process.env.FORM_VERSION || '2026-v1' },
    submissionReference: { type: String, required: true, unique: true, index: true },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    lastEditedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false, index: true }
  },
  {
    timestamps: true,
    minimize: false
  }
);

// Search and compound indices
studentCensusSchema.index({
  'personalDetails.studentName': 'text',
  'personalDetails.cnicOrFormBNumber': 'text',
  'educationalDetails.admissionNumber': 'text'
});
studentCensusSchema.index({ isDeleted: 1, submissionStatus: 1, submittedAt: -1 });
studentCensusSchema.index({ isDeleted: 1, 'educationalDetails.class': 1, 'educationalDetails.section': 1 });

// 2. Admin Schema
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ADMIN_ROLES, default: 'Viewer', index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// 3. AuditLog Schema
const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
    targetStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentCensus', default: null, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    details: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { minimize: false }
);

const StudentCensus = mongoose.models.StudentCensus || mongoose.model('StudentCensus', studentCensusSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

module.exports = {
  StudentCensus,
  Admin,
  AuditLog
};
