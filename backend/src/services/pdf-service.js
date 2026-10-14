const PDFDocument = require('pdfkit');

/**
 * Draws a section header bar
 */
function drawSectionHeader(doc, title, y) {
  doc.save();
  doc.rect(36, y, 523, 16).fill('#1e3a8a');
  doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text(title.toUpperCase(), 42, y + 3.5);
  doc.restore();
  return y + 18;
}

/**
 * Draws a key-value row with border
 */
function drawFieldRow(doc, fields, y, rowHeight = 16) {
  const totalWidth = 523;
  const colWidth = totalWidth / fields.length;

  doc.save();
  doc.rect(36, y, totalWidth, rowHeight).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

  fields.forEach((field, index) => {
    const x = 36 + index * colWidth;
    if (index > 0) {
      doc.moveTo(x, y).lineTo(x, y + rowHeight).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
    }

    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold')
      .text(`${field.label}: `, x + 4, y + 4, { continued: true, width: colWidth - 8 });
    
    doc.fillColor('#0f172a').font('Helvetica')
      .text(field.value || 'N/A');
  });

  doc.restore();
  return y + rowHeight;
}

/**
 * Renders a full official ICB Student Census Form for a single student
 */
function renderStudentCensusPage(doc, student) {
  const personal = student.personalDetails || {};
  const domicile = student.domicileInformation || {};
  const address = student.address || {};
  const presentAddr = address.present || {};
  const permAddr = address.permanent || {};
  const religion = student.religionLanguageDetails || {};
  const parent = student.parentGuardian || {};
  const father = parent.father || {};
  const mother = parent.mother || {};
  const orphan = parent.orphanGuardian || {};
  const edu = student.educationalDetails || {};
  const siblings = student.siblingDetails || {};
  const transport = student.transportScholarship || {};
  const emergency = student.emergencyContact || {};
  const idp = student.idpDetails || {};
  const health = student.healthDetails || {};
  const majorDis = health.majorDisability || {};
  const mental = health.mentalHealth || {};
  const vision = health.visionDetails || {};
  const digital = student.digitalAccess || {};

  let y = 32;

  // Title Header
  doc.save();
  doc.rect(36, y, 523, 48).fill('#f8fafc');
  doc.rect(36, y, 523, 48).strokeColor('#0f172a').lineWidth(1).stroke();

  doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold')
    .text('ISLAMABAD COLLEGE FOR BOYS, G-6/3, ISLAMABAD', 36, y + 6, { align: 'center', width: 523 });
  
  doc.fillColor('#1e40af').fontSize(10).font('Helvetica-Bold')
    .text('OFFICIAL STUDENT CENSUS & BIO-DATA SHEET', 36, y + 21, { align: 'center', width: 523 });

  doc.fillColor('#64748b').fontSize(7.5).font('Helvetica')
    .text(`Reference: ${student.submissionReference || 'N/A'}  |  Version: ${student.formVersion || '2026-v1'}  |  Status: ${student.submissionStatus || 'Submitted'}`, 36, y + 34, { align: 'center', width: 523 });
  doc.restore();

  y += 54;

  // SECTION 1: Personal Identification
  y = drawSectionHeader(doc, '1. Personal Details', y);
  y = drawFieldRow(doc, [
    { label: 'Student Name', value: personal.studentName },
    { label: 'CNIC / Form-B', value: personal.cnicOrFormBNumber || (personal.cnicFormAvailable === 'No' ? 'Not Available' : 'N/A') },
    { label: 'Gender', value: personal.gender }
  ], y);
  y = drawFieldRow(doc, [
    { label: 'Date of Birth', value: personal.dateOfBirth ? new Date(personal.dateOfBirth).toISOString().split('T')[0] : 'N/A' },
    { label: 'Province of Birth', value: personal.provinceOfBirth },
    { label: 'District of Birth', value: personal.districtOfBirth }
  ], y);

  y += 4;

  // SECTION 2: Domicile & Address
  y = drawSectionHeader(doc, '2. Domicile & Residential Addresses', y);
  y = drawFieldRow(doc, [
    { label: 'Nationality', value: domicile.nationality === 'Others' ? domicile.otherNationality : domicile.nationality },
    { label: 'Domicile Province', value: domicile.domicileProvince },
    { label: 'Domicile District', value: domicile.domicileDistrict }
  ], y);

  const presentText = [
    presentAddr.houseNo ? `H# ${presentAddr.houseNo}` : '',
    presentAddr.streetNo ? `St# ${presentAddr.streetNo}` : '',
    presentAddr.sectorSocietyVillageName || '',
    presentAddr.city || ''
  ].filter(Boolean).join(', ');

  const permText = [
    permAddr.houseNo ? `H# ${permAddr.houseNo}` : '',
    permAddr.streetNo ? `St# ${permAddr.streetNo}` : '',
    permAddr.sectorSocietyVillageName || '',
    permAddr.city || ''
  ].filter(Boolean).join(', ');

  y = drawFieldRow(doc, [
    { label: 'Present Address', value: presentText },
    { label: 'Present Phone', value: presentAddr.contactNumber }
  ], y, 18);
  y = drawFieldRow(doc, [
    { label: 'Permanent Address', value: permText },
    { label: 'Permanent Phone', value: permAddr.contactNumber }
  ], y, 18);

  y += 4;

  // SECTION 3: Religion, Language & Blood Group
  y = drawSectionHeader(doc, '3. Religion, Language & Identity', y);
  y = drawFieldRow(doc, [
    { label: 'Religion', value: religion.religion === 'Non-Muslim' && religion.otherReligion ? religion.otherReligion : religion.religion },
    { label: 'Mother Language', value: religion.motherLanguage },
    { label: 'Blood Group', value: religion.bloodGroup || 'Not Tested' },
    { label: 'Hafiz-e-Quran', value: religion.isHafiz || 'No' }
  ], y);

  y += 4;

  // SECTION 4: Parent & Guardian Information
  y = drawSectionHeader(doc, '4. Parent / Guardian Information', y);
  y = drawFieldRow(doc, [
    { label: "Father's Name", value: father.name },
    { label: 'Father CNIC', value: father.cnic },
    { label: 'Father Status', value: father.isAlive === 'No' ? 'Deceased' : 'Alive' }
  ], y);
  y = drawFieldRow(doc, [
    { label: 'Profession', value: father.profession === 'Govt Employee' ? `Govt (BPS-${father.bps || 'N/A'})` : father.profession },
    { label: 'Monthly Income', value: father.incomePerMonth },
    { label: 'Qualification', value: father.qualification },
    { label: 'Contact', value: father.contactNumber }
  ], y);

  y = drawFieldRow(doc, [
    { label: "Mother's Name", value: mother.name },
    { label: 'Mother CNIC', value: mother.cnic },
    { label: 'Mother Profession', value: mother.profession },
    { label: 'Mother Contact', value: mother.contactNumber }
  ], y);

  if (orphan.isOrphan) {
    y = drawFieldRow(doc, [
      { label: 'Orphan Status', value: `${orphan.orphanType || 'Yes'}` },
      { label: 'Guardian Name', value: orphan.name || 'N/A' },
      { label: 'Guardian Relation', value: orphan.relation || 'N/A' },
      { label: 'Guardian Phone', value: orphan.guardianContactNumber || 'N/A' }
    ], y);
  }

  y += 4;

  // SECTION 5: Educational Details
  y = drawSectionHeader(doc, '5. Academic & Admission Details', y);
  y = drawFieldRow(doc, [
    { label: 'Admission Number', value: edu.admissionNumber },
    { label: 'Current Class', value: edu.class },
    { label: 'Section', value: edu.section },
    { label: 'Group', value: edu.group || 'General' }
  ], y);
  y = drawFieldRow(doc, [
    { label: 'Shift', value: edu.shift },
    { label: 'Medium', value: edu.mediumOfInstruction },
    { label: 'Mode of Study', value: edu.modeOfStudy },
    { label: 'Last Class %', value: edu.resultPercentageLastClass ? `${edu.resultPercentageLastClass}%` : 'N/A' }
  ], y);
  y = drawFieldRow(doc, [
    { label: 'Admitted In Class', value: edu.classAdmittedIn },
    { label: 'Last School FDE', value: edu.lastInstitutionFDE || 'No' },
    { label: 'Other School', value: edu.lastInstitutionOther || 'N/A' },
    { label: 'Meal Program', value: edu.availingMealProgram }
  ], y);

  y += 4;

  // SECTION 6: Siblings, Transport & Emergency
  y = drawSectionHeader(doc, '6. Siblings, Transport & Emergency Contact', y);
  y = drawFieldRow(doc, [
    { label: 'Total Siblings', value: String(siblings.totalSiblings || 0) },
    { label: 'In Same College', value: String(siblings.siblingsSameInstitution || 0) },
    { label: 'Transport', value: transport.transportFacility },
    { label: 'Scholarship', value: transport.recipientOfScholarship === 'Yes' ? `Yes (${transport.scholarshipDetails || 'Active'})` : 'No' }
  ], y);
  y = drawFieldRow(doc, [
    { label: 'Emergency Contact Person', value: emergency.name },
    { label: 'Relationship', value: emergency.relation === 'Other' ? emergency.specifyRelation : emergency.relation },
    { label: 'Emergency Phone', value: emergency.contactNumber }
  ], y);

  y += 4;

  // SECTION 7: Health & Special Needs
  y = drawSectionHeader(doc, '7. Health, Special Needs & IDP Status', y);
  y = drawFieldRow(doc, [
    { label: 'Major Disability', value: majorDis.hasDisability === 'Yes' ? `Yes - ${majorDis.type || 'Specified'}` : 'None' },
    { label: 'Disability Certificate', value: majorDis.certificateAttached || 'N/A' },
    { label: 'Vaccination Completed', value: health.vaccinationCompleted || 'Yes' },
    { label: 'IDP / Refugee', value: idp.isRefugeeOrIDP === 'Yes' ? `Yes (${idp.refugeeCardNumber || 'Registered'})` : 'No' }
  ], y);
  y = drawFieldRow(doc, [
    { label: 'Vision Board Reading', value: vision.boardReadingDifficulty || 'No Difficulty' },
    { label: 'Wears Glasses', value: vision.wearsGlasses || 'No' },
    { label: 'Digital Device at Home', value: digital.hasDigitalDeviceAtHome || 'No' },
    { label: 'Internet Access', value: digital.hasInternetAtHome || 'No' }
  ], y);

  y += 10;

  // SIGNATURE & ENDORSEMENT BLOCK
  doc.save();
  doc.rect(36, y, 523, 76).strokeColor('#0f172a').lineWidth(1).stroke();

  // Column 1: Parent Attestation
  doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold')
    .text('PARENT / GUARDIAN ATTESTATION', 44, y + 6);
  doc.fontSize(6.5).font('Helvetica').fillColor('#475569')
    .text('I solemnly affirm that the information provided is correct and complete to the best of my knowledge.', 44, y + 18, { width: 150 });
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a')
    .text('Signature / Confirmation: ________________', 44, y + 54);

  // Divider 1
  doc.moveTo(206, y).lineTo(206, y + 76).strokeColor('#cbd5e1').stroke();

  // Column 2: Registrar / In-Charge
  doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold')
    .text('CLASS IN-CHARGE / REGISTRAR', 214, y + 6);
  doc.fontSize(6.5).font('Helvetica').fillColor('#475569')
    .text('Verified biographical entries against original school records and birth certificate / CNIC.', 214, y + 18, { width: 145 });
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a')
    .text('Verified By: ____________________', 214, y + 44)
    .text('Date: ____________', 214, y + 58);

  // Divider 2
  doc.moveTo(372, y).lineTo(372, y + 76).strokeColor('#cbd5e1').stroke();

  // Column 3: Principal's Wet Signature & Seal
  doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold')
    .text("PRINCIPAL'S ENDORSEMENT", 380, y + 6);
  doc.fontSize(6.5).font('Helvetica').fillColor('#475569')
    .text('Approved for official college census archive and record digitization.', 380, y + 18, { width: 165 });
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a')
    .text('Signature & Official Stamp:', 380, y + 42);
  doc.moveTo(380, y + 66).lineTo(540, y + 66).strokeColor('#475569').stroke();

  doc.restore();

  // Footer note
  doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica')
    .text('ICB Student Census Record  •  Islamabad College for Boys, Sector G-6/3, Islamabad  •  Confidential Educational Record', 36, 786, { align: 'center', width: 523 });
}

/**
 * Streams a single student census PDF
 */
function streamSinglePdf(student, outputStream) {
  const doc = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: false });
  doc.pipe(outputStream);
  doc.addPage();
  renderStudentCensusPage(doc, student);
  doc.end();
}

/**
 * Streams a combined multi-page PDF with one census sheet per student
 */
function streamBulkPdf(students = [], outputStream) {
  const doc = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: false });
  doc.pipe(outputStream);

  if (students.length === 0) {
    doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold').text('No student records matched the export criteria.', 36, 100, { align: 'center' });
    doc.end();
    return;
  }

  students.forEach((student, index) => {
    doc.addPage();
    renderStudentCensusPage(doc, student);
  });

  doc.end();
}

module.exports = {
  streamSinglePdf,
  streamBulkPdf
};
