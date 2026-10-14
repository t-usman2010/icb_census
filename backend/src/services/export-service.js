const ExcelJS = require('exceljs');

/**
 * Builds and streams an Excel or CSV export for student census records,
 * strictly enforcing field-level role-based masking for the 'Viewer' role.
 */
async function streamStudentExport(students = [], { format = 'xlsx', userRole = 'Viewer' }, responseStream) {
  const isViewer = userRole === 'Viewer';
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ICB Census System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Student Census Records', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  const columns = [
    { header: 'Submission Ref', key: 'ref', width: 18 },
    { header: 'Admission #', key: 'admissionNumber', width: 14 },
    { header: 'Student Name', key: 'studentName', width: 24 },
    { header: 'Gender', key: 'gender', width: 10 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Class', key: 'class', width: 10 },
    { header: 'Section', key: 'section', width: 10 },
    { header: 'Group', key: 'group', width: 12 },
    { header: 'Shift', key: 'shift', width: 10 },
    { header: 'Medium', key: 'medium', width: 12 }
  ];

  if (!isViewer) {
    columns.push(
      { header: 'CNIC / Form-B', key: 'cnic', width: 18 },
      { header: 'Date of Birth', key: 'dob', width: 14 },
      { header: 'Birth Province', key: 'provinceOfBirth', width: 22 },
      { header: 'Birth District', key: 'districtOfBirth', width: 18 }
    );
  }

  columns.push(
    { header: 'Domicile Province', key: 'domicileProvince', width: 20 },
    { header: 'Domicile District', key: 'domicileDistrict', width: 18 },
    { header: 'Present City', key: 'presentCity', width: 16 },
    { header: 'Present Phone', key: 'presentContact', width: 16 },
    { header: 'Religion', key: 'religion', width: 12 },
    { header: 'Mother Language', key: 'motherLanguage', width: 14 },
    { header: 'Blood Group', key: 'bloodGroup', width: 12 },
    { header: "Father's Name", key: 'fatherName', width: 22 },
    { header: 'Father Profession', key: 'fatherProfession', width: 18 },
    { header: "Mother's Name", key: 'motherName', width: 20 }
  );

  if (!isViewer) {
    columns.push(
      { header: 'Father CNIC', key: 'fatherCnic', width: 18 },
      { header: 'Father Income', key: 'fatherIncome', width: 18 },
      { header: 'Mother CNIC', key: 'motherCnic', width: 18 },
      { header: 'Mother Income', key: 'motherIncome', width: 18 }
    );
  }

  columns.push(
    { header: 'Mode of Study', key: 'modeOfStudy', width: 14 },
    { header: 'Last Class %', key: 'lastResult', width: 12 },
    { header: 'Total Siblings', key: 'totalSiblings', width: 12 },
    { header: 'Transport', key: 'transport', width: 16 },
    { header: 'Scholarship', key: 'scholarship', width: 12 }
  );

  if (!isViewer) {
    columns.push(
      { header: 'Has Disability', key: 'hasDisability', width: 14 },
      { header: 'Disability Type', key: 'disabilityType', width: 16 },
      { header: 'Vaccinated', key: 'vaccinated', width: 12 },
      { header: 'Refugee / IDP', key: 'isIdp', width: 14 }
    );
  }

  columns.push(
    { header: 'Digital Device', key: 'digitalDevice', width: 14 },
    { header: 'Internet at Home', key: 'internet', width: 14 },
    { header: 'Submitted At', key: 'submittedAt', width: 18 }
  );

  sheet.columns = columns;

  // Format header row
  const headerRow = sheet.getRow(1);
  headerRow.height = 24;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };

  // Add data rows
  students.forEach((student) => {
    const p = student.personalDetails || {};
    const d = student.domicileInformation || {};
    const addr = student.address?.present || {};
    const rel = student.religionLanguageDetails || {};
    const par = student.parentGuardian || {};
    const f = par.father || {};
    const m = par.mother || {};
    const edu = student.educationalDetails || {};
    const sib = student.siblingDetails || {};
    const trans = student.transportScholarship || {};
    const health = student.healthDetails || {};
    const dis = health.majorDisability || {};
    const dig = student.digitalAccess || {};
    const idp = student.idpDetails || {};

    const rowData = {
      ref: student.submissionReference || '',
      admissionNumber: edu.admissionNumber || '',
      studentName: p.studentName || '',
      gender: p.gender || '',
      status: student.submissionStatus || '',
      class: edu.class || '',
      section: edu.section || '',
      group: edu.group || '',
      shift: edu.shift || '',
      medium: edu.mediumOfInstruction || '',
      domicileProvince: d.domicileProvince || '',
      domicileDistrict: d.domicileDistrict || '',
      presentCity: addr.city || '',
      presentContact: addr.contactNumber || '',
      religion: rel.religion || '',
      motherLanguage: rel.motherLanguage || '',
      bloodGroup: rel.bloodGroup || '',
      fatherName: f.name || '',
      fatherProfession: f.profession || '',
      motherName: m.name || '',
      modeOfStudy: edu.modeOfStudy || '',
      lastResult: edu.resultPercentageLastClass ? `${edu.resultPercentageLastClass}%` : '',
      totalSiblings: sib.totalSiblings || 0,
      transport: trans.transportFacility || '',
      scholarship: trans.recipientOfScholarship || '',
      digitalDevice: dig.hasDigitalDeviceAtHome || '',
      internet: dig.hasInternetAtHome || '',
      submittedAt: student.submittedAt ? new Date(student.submittedAt).toISOString().split('T')[0] : ''
    };

    if (!isViewer) {
      rowData.cnic = p.cnicOrFormBNumber || '';
      rowData.dob = p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : '';
      rowData.provinceOfBirth = p.provinceOfBirth || '';
      rowData.districtOfBirth = p.districtOfBirth || '';
      rowData.fatherCnic = f.cnic || '';
      rowData.fatherIncome = f.incomePerMonth || '';
      rowData.motherCnic = m.cnic || '';
      rowData.motherIncome = m.incomePerMonth || '';
      rowData.hasDisability = dis.hasDisability || 'No';
      rowData.disabilityType = dis.type || '';
      rowData.vaccinated = health.vaccinationCompleted || 'Yes';
      rowData.isIdp = idp.isRefugeeOrIDP || 'No';
    }

    sheet.addRow(rowData);
  });

  if (format.toLowerCase() === 'csv') {
    responseStream.setHeader('Content-Type', 'text/csv; charset=utf-8');
    responseStream.setHeader('Content-Disposition', 'attachment; filename="icb-student-census.csv"');
    await workbook.csv.write(responseStream);
  } else {
    responseStream.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    responseStream.setHeader('Content-Disposition', 'attachment; filename="icb-student-census.xlsx"');
    await workbook.xlsx.write(responseStream);
  }
}

module.exports = { streamStudentExport };
