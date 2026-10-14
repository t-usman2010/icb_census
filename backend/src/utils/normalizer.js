/**
 * Normalizes input census payloads to guarantee backward and cross-compatibility
 * between the React frontend structure and the ICB-Census-Backend-Prompt standard.
 */
function normalizeCensusPayload(input = {}) {
  const data = JSON.parse(JSON.stringify(input));

  // 1. Personal details
  if (data.personalDetails) {
    if (data.personalDetails.cnicOrFormBNumber) {
      data.personalDetails.cnicOrFormBNumber = String(data.personalDetails.cnicOrFormBNumber).trim();
    }
    if (data.personalDetails.studentName) {
      data.personalDetails.studentName = String(data.personalDetails.studentName).trim();
    }
  }

  // 2. Domicile
  if (data.domicileInformation) {
    if (data.domicileInformation.province && !data.domicileInformation.domicileProvince) {
      data.domicileInformation.domicileProvince = data.domicileInformation.province;
    }
    if (data.domicileInformation.district && !data.domicileInformation.domicileDistrict) {
      data.domicileInformation.domicileDistrict = data.domicileInformation.district;
    }
  }

  // 3. Address
  if (data.address) {
    if (data.address.sameAsPresent && data.address.present) {
      data.address.permanent = { ...data.address.present };
    }
  }

  // 4. Religion & Language
  if (data.religionLanguageDetails) {
    if (data.religionLanguageDetails.otherMotherLanguage && !data.religionLanguageDetails.motherLanguage) {
      data.religionLanguageDetails.motherLanguage = 'Other';
    }
  }

  // 5. Parent / Guardian
  if (data.parentGuardian) {
    // Normalization for isOrphan boolean or string
    if (data.parentGuardian.orphanGuardian) {
      if (typeof data.parentGuardian.isOrphan === 'string') {
        data.parentGuardian.orphanGuardian.isOrphan = data.parentGuardian.isOrphan.toLowerCase() === 'yes';
      } else if (typeof data.parentGuardian.isOrphan === 'boolean') {
        data.parentGuardian.orphanGuardian.isOrphan = data.parentGuardian.isOrphan;
      }

      // Normalize orphan guardian field names from frontend to backend
      const og = data.parentGuardian.orphanGuardian;
      if (og) {
        if (og.contactNumber && !og.guardianContactNumber) {
          og.guardianContactNumber = og.contactNumber;
        }
        if (og.email && !og.guardianEmail) {
          og.guardianEmail = og.email;
        }
        if (og.cnic && !og.guardianCnic) {
          og.guardianCnic = og.cnic;
        }
      }
    }

    // Normalize parent landline field names
    if (data.parentGuardian.father) {
      if (data.parentGuardian.father.landline && !data.parentGuardian.father.landlineNumber) {
        data.parentGuardian.father.landlineNumber = data.parentGuardian.father.landline;
      }
    }
    if (data.parentGuardian.mother) {
      if (data.parentGuardian.mother.landline && !data.parentGuardian.mother.landlineNumber) {
        data.parentGuardian.mother.landlineNumber = data.parentGuardian.mother.landline;
      }
    }
  }

  // 6. Educational Details
  if (data.educationalDetails) {
    if (data.educationalDetails.medium && !data.educationalDetails.mediumOfInstruction) {
      data.educationalDetails.mediumOfInstruction = data.educationalDetails.medium;
    }
    if (data.educationalDetails.mealProgram && !data.educationalDetails.availingMealProgram) {
      data.educationalDetails.availingMealProgram = data.educationalDetails.mealProgram;
    }
    if (data.educationalDetails.result && !data.educationalDetails.resultPercentageLastClass) {
      data.educationalDetails.resultPercentageLastClass = data.educationalDetails.result;
    }
    if (data.educationalDetails.lastInstitution) {
      const lastInstitution = data.educationalDetails.lastInstitution;
      if (lastInstitution === 'FDE' || lastInstitution === 'FDE Institution' || String(lastInstitution).includes('FDE')) {
        data.educationalDetails.lastInstitutionFDE = 'Yes';
      } else {
        data.educationalDetails.lastInstitutionFDE = 'No';
      }
    }
    if (data.educationalDetails.otherInstitution && !data.educationalDetails.lastInstitutionOther) {
      data.educationalDetails.lastInstitutionOther = data.educationalDetails.otherInstitution;
    }
  }

  // 7. Sibling Details
  if (data.siblingDetails) {
    if (data.siblingDetails.total !== undefined && data.siblingDetails.totalSiblings === undefined) {
      data.siblingDetails.totalSiblings = Number(data.siblingDetails.total) || 0;
    }
    if (data.siblingDetails.sameInstitution !== undefined && data.siblingDetails.siblingsSameInstitution === undefined) {
      data.siblingDetails.siblingsSameInstitution = Number(data.siblingDetails.sameInstitution) || 0;
    }
    if (data.siblingDetails.otherFde !== undefined && data.siblingDetails.siblingsOtherFDE === undefined) {
      data.siblingDetails.siblingsOtherFDE = Number(data.siblingDetails.otherFde) || 0;
    }
    if (data.siblingDetails.private !== undefined && data.siblingDetails.siblingsPrivateInstitutions === undefined) {
      data.siblingDetails.siblingsPrivateInstitutions = Number(data.siblingDetails.private) || 0;
    }
  }

  // 8. Transport & Scholarship
  if (data.transportScholarship) {
    if (data.transportScholarship.transport && !data.transportScholarship.transportFacility) {
      data.transportScholarship.transportFacility = data.transportScholarship.transport;
    }
    if (data.transportScholarship.scholarship && !data.transportScholarship.recipientOfScholarship) {
      data.transportScholarship.recipientOfScholarship = data.transportScholarship.scholarship;
    }
    if (data.transportScholarship.achievement && !data.transportScholarship.specialCoCurricularAchievement) {
      data.transportScholarship.specialCoCurricularAchievement = data.transportScholarship.achievement;
    }
  }

  // 9. Emergency Contact
  if (data.emergencyContact) {
    if (data.emergencyContact.number && !data.emergencyContact.contactNumber) {
      data.emergencyContact.contactNumber = data.emergencyContact.number;
    }
    if (data.emergencyContact.otherRelation && !data.emergencyContact.specifyRelation) {
      data.emergencyContact.specifyRelation = data.emergencyContact.otherRelation;
    }
  }

  // 10. IDP Details
  if (data.idpDetails) {
    if (data.idpDetails.isIdp && !data.idpDetails.isRefugeeOrIDP) {
      data.idpDetails.isRefugeeOrIDP = data.idpDetails.isIdp;
    }
    if (data.idpDetails.details && !data.idpDetails.refugeeCardNumber) {
      data.idpDetails.refugeeCardNumber = data.idpDetails.details;
    }
  }

  // 11. Health Details
  if (data.healthDetails) {
    if (data.healthDetails.disability && !data.healthDetails.majorDisability) {
      data.healthDetails.majorDisability = {
        hasDisability: data.healthDetails.disability,
        type: data.healthDetails.disabilityType || '',
        certificateAttached: data.healthDetails.certificateUrl ? 'Attached' : 'Not available',
        certificateFileUrl: data.healthDetails.certificateUrl || ''
      };
    }
    if (data.healthDetails.mentalHealth && typeof data.healthDetails.mentalHealth === 'string') {
      data.healthDetails.mentalHealth = {
        hasMentalDisability: data.healthDetails.mentalHealth,
        type: data.healthDetails.mentalHealthType || '',
        otherSpecify: ''
      };
    }
    if (data.healthDetails.vaccination && !data.healthDetails.vaccinationCompleted) {
      data.healthDetails.vaccinationCompleted = data.healthDetails.vaccination;
    }

    // Convert flat vision/hearing/mobility/learning to nested structures
    if (typeof data.healthDetails.vision === 'string' && !data.healthDetails.visionDetails) {
      const val = data.healthDetails.vision;
      data.healthDetails.visionDetails = {
        visuallyFit6x6: val === 'No issue' ? 'Yes' : val === 'Prefer not to say' ? '' : 'No',
        boardReadingDifficulty: val === 'Needs support' ? 'Some Difficulty' : 'No Difficulty',
        glassesPrescription: '',
        wearsGlasses: 'No'
      };
    }
    if (typeof data.healthDetails.hearing === 'string' && !data.healthDetails.hearingDetails) {
      const val = data.healthDetails.hearing;
      data.healthDetails.hearingDetails = {
        hasHearingDifficulty: val === 'No issue' ? 'No' : 'Yes',
        details: val === 'No issue' ? '' : val,
        usesHearingAid: 'No',
        difficultyListening: val === 'No issue' ? 'No' : 'Yes'
      };
    }
    if (typeof data.healthDetails.mobility === 'string' && !data.healthDetails.mobilityDetails) {
      const val = data.healthDetails.mobility;
      data.healthDetails.mobilityDetails = {
        difficultyWalking: val === 'No issue' ? 'No' : 'Yes',
        usesCrutchesWalker: 'No'
      };
    }
    if (typeof data.healthDetails.learning === 'string' && !data.healthDetails.learningAbilities) {
      const val = data.healthDetails.learning;
      data.healthDetails.learningAbilities = {
        difficultyReadingWriting: val === 'No issue' ? 'No Difficulty' : 'Some Difficulty',
        difficultyRemembering: val === 'No issue' ? 'No Difficulty' : 'Some Difficulty',
        difficultyConcentrating: val === 'No issue' ? 'No Difficulty' : 'Some Difficulty'
      };
    }
  }

  // 12. Digital Access
  if (data.digitalAccess) {
    if (data.digitalAccess.device && !data.digitalAccess.hasDigitalDeviceAtHome) {
      data.digitalAccess.hasDigitalDeviceAtHome = data.digitalAccess.device;
    }
    if (data.digitalAccess.devices && !data.digitalAccess.deviceTypes) {
      data.digitalAccess.deviceTypes = Array.isArray(data.digitalAccess.devices) ? data.digitalAccess.devices : [];
    }
    if (data.digitalAccess.internet && !data.digitalAccess.hasInternetAtHome) {
      data.digitalAccess.hasInternetAtHome = data.digitalAccess.internet;
    }
  }

  // 13. Attestation & Signatures
  if (!data.parentGuardianSignatureUrl) {
    if (data.attestation?.signatureDataUrl) {
      data.parentGuardianSignatureUrl = data.attestation.signatureDataUrl;
    }
  }

  return data;
}

module.exports = { normalizeCensusPayload };
