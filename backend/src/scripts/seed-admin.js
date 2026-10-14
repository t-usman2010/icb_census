require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Admin, StudentCensus } = require('../models');

async function seed() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/icb_census';
  console.log(`Connecting to MongoDB at: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  const email = (process.env.ADMIN_EMAIL || 'admin@icb.edu.pk').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'AdminPass123!';
  const name = process.env.ADMIN_NAME || 'Chief System Administrator';

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await Admin.findOneAndUpdate(
    { email },
    {
      name,
      email,
      passwordHash,
      role: 'SuperAdmin',
      isActive: true,
      lastLoginAt: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('----------------------------------------------------');
  console.log(' SuperAdmin Account Configured Successfully');
  console.log(` Name:     ${admin.name}`);
  console.log(` Email:    ${admin.email}`);
  console.log(` Role:     ${admin.role}`);
  console.log(` Password: ${password}`);
  console.log('----------------------------------------------------');

  // Check if sample data flag was passed
  if (process.argv.includes('--sample-data') || process.env.SEED_SAMPLE_DATA === 'true') {
    console.log('Generating realistic sample student census submissions...');

    const sampleStudents = [
      {
        personalDetails: {
          studentName: 'Muhammad Hamza Khan',
          cnicFormAvailable: 'Yes',
          cnicOrFormBNumber: '61101-1234567-1',
          gender: 'Male',
          dateOfBirth: new Date('2010-04-15'),
          provinceOfBirth: 'Islamabad Capital Territory',
          districtOfBirth: 'Islamabad'
        },
        domicileInformation: {
          nationality: 'Pakistani',
          domicileProvince: 'Islamabad Capital Territory',
          domicileDistrict: 'Islamabad Urban'
        },
        address: {
          present: {
            addressType: 'Sector',
            houseNo: '45-B',
            streetNo: '12',
            sectorSocietyVillageName: 'G-7/2',
            contactNumber: '0300-1234567',
            city: 'Islamabad'
          },
          permanent: {
            addressType: 'Sector',
            houseNo: '45-B',
            streetNo: '12',
            sectorSocietyVillageName: 'G-7/2',
            contactNumber: '0300-1234567',
            city: 'Islamabad'
          }
        },
        religionLanguageDetails: {
          religion: 'Muslim',
          motherLanguage: 'Urdu',
          bloodGroup: 'B+',
          isHafiz: 'Yes',
          email: 'hamza.khan@example.com'
        },
        parentGuardian: {
          father: {
            name: 'Tariq Mehmood Khan',
            cnic: '61101-7654321-1',
            isAlive: 'Yes',
            domicileProvince: 'Islamabad Capital Territory',
            domicileDistrict: 'Islamabad',
            contactNumber: '0333-5551234',
            qualification: 'Graduate',
            profession: 'Govt Employee',
            bps: '17',
            incomePerMonth: '100,001–200,000'
          },
          mother: {
            name: 'Shaheen Akhtar',
            cnic: '61101-8888888-2',
            isAlive: 'Yes',
            qualification: 'Intermediate',
            profession: 'Other',
            incomePerMonth: 'Less than 50,000'
          },
          orphanGuardian: { isOrphan: false }
        },
        educationalDetails: {
          admissionNumber: 'ICB-2024-8841',
          class: '9',
          section: 'A',
          group: 'Computer Science',
          resultPercentageLastClass: '87.5',
          dateOfAdmission: new Date('2024-03-10'),
          classAdmittedIn: 'Prep',
          shift: 'Morning',
          mediumOfInstruction: 'English',
          modeOfStudy: 'Day Scholars',
          lastInstitutionFDE: 'Yes',
          availingMealProgram: 'No'
        },
        siblingDetails: {
          totalSiblings: 3,
          siblingsSameInstitution: 1,
          siblingsOtherFDE: 1,
          siblingsPrivateInstitutions: 0
        },
        transportScholarship: {
          transportFacility: 'Institution Bus',
          recipientOfScholarship: 'Yes',
          scholarshipDetails: 'Merit Scholarship Grade 8',
          specialCoCurricularAchievement: 'Yes',
          achievementDetails: 'First Position Inter-Collegiate Cricket Tournament'
        },
        emergencyContact: {
          name: 'Tariq Mehmood Khan',
          contactNumber: '0333-5551234',
          relation: 'Father'
        },
        idpDetails: { isRefugeeOrIDP: 'No' },
        healthDetails: {
          majorDisability: { hasDisability: 'No' },
          mentalHealth: { hasMentalDisability: 'No' },
          visionDetails: { visuallyFit6x6: 'Yes', boardReadingDifficulty: 'No Difficulty', wearsGlasses: 'No' },
          hearingDetails: { hasHearingDifficulty: 'No' },
          mobilityDetails: { difficultyWalking: 'No' },
          learningAbilities: { difficultyReadingWriting: 'No Difficulty' },
          vaccinationCompleted: 'Yes'
        },
        digitalAccess: {
          hasDigitalDeviceAtHome: 'Yes',
          deviceTypes: ['Laptop', 'Mobile Phone'],
          hasInternetAtHome: 'Yes'
        },
        submissionStatus: 'Verified',
        submissionReference: 'ICB-2026-A19F42'
      },
      {
        personalDetails: {
          studentName: 'Zainab Fatima',
          cnicFormAvailable: 'Yes',
          cnicOrFormBNumber: '37405-9876543-2',
          gender: 'Female',
          dateOfBirth: new Date('2011-09-20'),
          provinceOfBirth: 'Punjab',
          districtOfBirth: 'Rawalpindi'
        },
        domicileInformation: {
          nationality: 'Pakistani',
          domicileProvince: 'Punjab',
          domicileDistrict: 'Rawalpindi'
        },
        address: {
          present: {
            addressType: 'Housing Society',
            houseNo: '112',
            streetNo: '7',
            sectorSocietyVillageName: 'PWD Housing Society',
            contactNumber: '0312-9876543',
            city: 'Islamabad'
          }
        },
        religionLanguageDetails: {
          religion: 'Muslim',
          motherLanguage: 'Punjabi',
          bloodGroup: 'O+',
          isHafiz: 'No'
        },
        parentGuardian: {
          father: {
            name: 'Muhammad Tariq',
            isAlive: 'No'
          },
          mother: {
            name: 'Nasreen Akhtar',
            cnic: '37405-1112223-4',
            isAlive: 'Yes',
            profession: 'Private Employee',
            incomePerMonth: '50,001–100,000'
          },
          orphanGuardian: {
            isOrphan: true,
            orphanType: 'Single Orphan',
            name: 'Nasreen Akhtar',
            relation: 'Mother',
            guardianContactNumber: '0312-9876543'
          }
        },
        educationalDetails: {
          admissionNumber: 'ICB-2024-9120',
          class: '8',
          section: 'B',
          shift: 'Morning',
          mediumOfInstruction: 'English',
          modeOfStudy: 'Day Scholars',
          availingMealProgram: 'No'
        },
        siblingDetails: { totalSiblings: 2, siblingsSameInstitution: 0 },
        transportScholarship: {
          transportFacility: 'Private',
          recipientOfScholarship: 'No',
          specialCoCurricularAchievement: 'No'
        },
        emergencyContact: {
          name: 'Nasreen Akhtar',
          contactNumber: '0312-9876543',
          relation: 'Mother'
        },
        idpDetails: { isRefugeeOrIDP: 'No' },
        healthDetails: {
          majorDisability: { hasDisability: 'No' },
          mentalHealth: { hasMentalDisability: 'No' },
          vaccinationCompleted: 'Yes'
        },
        digitalAccess: {
          hasDigitalDeviceAtHome: 'Yes',
          deviceTypes: ['Mobile Phone'],
          hasInternetAtHome: 'Yes'
        },
        submissionStatus: 'Submitted',
        submissionReference: 'ICB-2026-B83C01'
      }
    ];

    for (const st of sampleStudents) {
      await StudentCensus.findOneAndUpdate(
        { 'educationalDetails.admissionNumber': st.educationalDetails.admissionNumber },
        st,
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded ${sampleStudents.length} sample student records for testing.`);
  }

  await mongoose.disconnect();
  console.log('Seeding procedure complete.');
}

seed().catch((error) => {
  console.error('Seeding failure:', error.message);
  process.exit(1);
});
