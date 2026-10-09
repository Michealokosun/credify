const db = window.supabase?.createClient && window.CREDIFY_SUPABASE_URL && window.CREDIFY_SUPABASE_ANON_KEY
  ? window.supabase.createClient(window.CREDIFY_SUPABASE_URL, window.CREDIFY_SUPABASE_ANON_KEY)
  : null;
const alertBox = document.querySelector('#dash-alert');
let currentUser = null;
let certificates = [];
let scholarships = [];
let courses = [];

const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const niceDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date added';
const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
};
const daysLeft = (value) => Math.ceil((new Date(`${value}T23:59:59`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
const listPages = Object.create(null);
const listPageSize = 10;
function getVisiblePage(key, list, items, rerender) {
  const pageCount = Math.ceil(items.length / listPageSize);
  const page = Math.min(listPages[key] || 0, Math.max(0, pageCount - 1));
  listPages[key] = page;
  let controls = document.querySelector(`#${key}-pagination`);
  if (!controls) {
    controls = document.createElement('nav');
    controls.id = `${key}-pagination`;
    controls.className = 'list-pagination';
    controls.setAttribute('aria-label', `${key} pages`);
    list.insertAdjacentElement('afterend', controls);
  }
  controls.hidden = pageCount <= 1;
  if (pageCount <= 1) {
    controls.replaceChildren();
    return items;
  }
  controls.innerHTML = `<button type="button" data-page-direction="previous" ${page === 0 ? 'disabled' : ''}>← Previous</button><span aria-live="polite">Page ${page + 1} of ${pageCount}</span><button type="button" data-page-direction="next" ${page >= pageCount - 1 ? 'disabled' : ''}>Next →</button>`;
  controls.querySelector('[data-page-direction="previous"]').addEventListener('click', () => { listPages[key]--; rerender(); });
  controls.querySelector('[data-page-direction="next"]').addEventListener('click', () => { listPages[key]++; rerender(); });
  return items.slice(page * listPageSize, (page + 1) * listPageSize);
}
function alertUser(text, isError = true) {
  alertBox.textContent = text;
  alertBox.classList.toggle('visible', Boolean(text));
  alertBox.classList.toggle('success', !isError);
}
function initials(name, email) {
  const parts = (name || email || 'Credify').trim().split(/[\s@.]+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}
function setUser(user) {
  currentUser = user;
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
  const label = fullName || user.email || 'Your account';
  document.querySelector('#profile-name').textContent = label;
  document.querySelector('#profile-email').textContent = user.email || '';
  document.querySelector('#welcome-title').textContent = `Welcome back${fullName ? `, ${fullName.split(' ')[0]}` : ''}.`;
  const avatar = initials(fullName, user.email);
  document.querySelector('#profile-avatar').textContent = avatar;
  document.querySelector('#header-avatar').textContent = avatar;
  document.querySelector('#settings-name').value = fullName;
  document.querySelector('#settings-email').value = user.email || '';
}
function selectTab(name) {
  document.querySelectorAll('.dash-tab').forEach((button) => button.classList.toggle('active', button.dataset.tab === name));
  document.querySelectorAll('.dashboard-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `panel-${name}`));
  document.querySelector('#mobile-active-label').textContent = document.querySelector(`.dash-tab[data-tab="${name}"]`)?.textContent.trim() || 'Overview';
  document.querySelector('#dash-tabs').classList.remove('open');
  document.querySelector('#mobile-tab-toggle').setAttribute('aria-expanded', 'false');
  alertUser('');
}
document.querySelectorAll('.dash-tab').forEach((button) => button.addEventListener('click', () => selectTab(button.dataset.tab)));
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-go-tab]');
  if (button) selectTab(button.dataset.goTab);
});
document.querySelector('#mobile-tab-toggle').addEventListener('click', () => {
  const nav = document.querySelector('#dash-tabs');
  const isOpen = nav.classList.toggle('open');
  document.querySelector('#mobile-tab-toggle').setAttribute('aria-expanded', String(isOpen));
});
document.querySelectorAll('[data-form-toggle]').forEach((button) => button.addEventListener('click', () => {
  const form = document.getElementById(button.dataset.formToggle);
  form.classList.toggle('hidden');
  if (!form.classList.contains('hidden')) form.querySelector('input')?.focus();
}));

const deleteDialog = document.querySelector('#delete-confirm-dialog');
const deleteMessage = document.querySelector('#delete-confirm-message');
const confirmDeleteButton = document.querySelector('#confirm-delete-button');
let pendingDelete = null;
const deleteTables = {
  scholarship: { table: 'scholarship_applications', label: 'scholarship application' },
  course: { table: 'course_progress', label: 'course' },
  certificate: { table: 'certificates', label: 'certificate' }
};

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete-kind]');
  if (!button) return;
  const kind = button.dataset.deleteKind;
  if (!deleteTables[kind]) return;
  pendingDelete = { kind, id: button.dataset.deleteId, label: button.dataset.deleteLabel || deleteTables[kind].label };
  document.querySelector('#delete-confirm-title').textContent = `Delete ${deleteTables[kind].label}?`;
  document.querySelector('#delete-confirm-copy').textContent = `“${pendingDelete.label}” will be permanently removed from your dashboard.`;
  deleteMessage.textContent = '';
  confirmDeleteButton.disabled = false;
  confirmDeleteButton.textContent = 'Delete';
  deleteDialog.showModal();
});

document.querySelectorAll('[data-close-delete]').forEach((button) => button.addEventListener('click', () => deleteDialog.close()));
deleteDialog.addEventListener('click', (event) => {
  if (event.target === deleteDialog) deleteDialog.close();
});
confirmDeleteButton.addEventListener('click', async () => {
  if (!pendingDelete || !currentUser) return;
  const target = pendingDelete;
  confirmDeleteButton.disabled = true;
  confirmDeleteButton.textContent = 'Deleting…';
  deleteMessage.textContent = 'Removing this item from your dashboard…';
  deleteMessage.className = 'delete-confirm-message info';
  const { error } = await db.from(deleteTables[target.kind].table)
    .delete()
    .eq('id', target.id)
    .eq('user_id', currentUser.id);
  if (error) {
    deleteMessage.textContent = `Could not delete this item: ${error.message}`;
    deleteMessage.className = 'delete-confirm-message error';
    confirmDeleteButton.disabled = false;
    confirmDeleteButton.textContent = 'Delete';
    return;
  }

  if (target.kind === 'scholarship') scholarships = scholarships.filter((item) => item.id !== target.id);
  if (target.kind === 'course') courses = courses.filter((item) => item.id !== target.id);
  if (target.kind === 'certificate') {
    const removed = certificates.find((item) => item.id === target.id);
    certificates = certificates.filter((item) => item.id !== target.id);
    if (removed?.file_path) await db.storage.from('course-certificates').remove([removed.file_path]);
  }

  if (target.kind === 'scholarship') renderScholarships();
  if (target.kind === 'course') { renderCourses(); renderScholarships(); }
  if (target.kind === 'certificate') { renderCourses(); await renderCertificates(); }
  alertUser(`${deleteTables[target.kind].label[0].toUpperCase()}${deleteTables[target.kind].label.slice(1)} deleted.`, false);
  pendingDelete = null;
  deleteDialog.close();
});

function renderCounts() {
  document.querySelector('#metric-applications').textContent = scholarships.filter((item) => item.status !== 'saved').length;
  document.querySelector('#metric-courses').textContent = courses.filter((course) => Number(course.progress) < 100).length;
  document.querySelector('#metric-certificates').textContent = certificates.length;
}
function renderScholarships() {
  const list = document.querySelector('#scholarship-list');
  const appliedScholarships = scholarships.filter((item) => item.status !== 'saved');
  const visibleScholarships = getVisiblePage('scholarships', list, appliedScholarships, renderScholarships);
  if (!appliedScholarships.length) {
    list.innerHTML = '<div class="record-empty scholarship-empty"><span class="empty-scholarship-icon">✦</span><h3>No applications yet</h3><p>When you click Apply on a scholarship, it will appear here with its deadline and application link.</p><a class="button button-primary" href="scholarships.html">Browse scholarships <span>↗</span></a></div>';
  } else {
    list.innerHTML = visibleScholarships.map((item) => {
      const remaining = item.deadline ? daysLeft(item.deadline) : null;
      const deadlineText = remaining === null ? 'Deadline not set' : remaining < 0 ? 'Deadline passed' : remaining === 0 ? 'Due today' : `${remaining} days left`;
      const urgent = remaining !== null && remaining >= 0 && remaining <= 7;
      return `<article class="record-row"><div class="record-main"><h3>${esc(item.scholarship_name)}</h3><p>${esc(item.institution || 'Institution not added')}${safeUrl(item.official_url) ? ` · <a class="record-link" href="${esc(safeUrl(item.official_url))}" target="_blank" rel="noopener">Continue application ↗</a>` : ''}</p><div class="record-meta"><span class="status-pill ${esc(item.status)}">${esc((item.status || 'applied').replaceAll('_', ' '))}</span><span>${item.deadline ? `Deadline ${esc(niceDate(item.deadline))}` : 'Deadline not listed'}</span><b class="deadline-remaining ${urgent ? 'urgent' : ''}">${esc(deadlineText)}</b></div></div><button class="delete-record" type="button" data-delete-kind="scholarship" data-delete-id="${esc(item.id)}" data-delete-label="${esc(item.scholarship_name)}" aria-label="Delete ${esc(item.scholarship_name)}" title="Delete scholarship"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></article>`;
    }).join('');
  }
  const upcoming = appliedScholarships.filter((item) => item.deadline && daysLeft(item.deadline) >= 0).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 3);
  const deadlineList = document.querySelector('#overview-deadline-list');
  deadlineList.innerHTML = upcoming.length ? upcoming.map((item) => {
    const remaining = daysLeft(item.deadline);
    return `<div class="deadline-item"><span class="deadline-date"><b>${esc(new Date(`${item.deadline}T12:00:00`).getDate())}</b>${esc(new Date(`${item.deadline}T12:00:00`).toLocaleDateString(undefined, { month: 'short' }).toUpperCase())}</span><span class="deadline-copy"><b>${esc(item.scholarship_name)}</b><small>${esc(item.institution || 'Scholarship application')}</small></span><span class="deadline-remaining ${remaining <= 7 ? 'urgent' : ''}">${remaining === 0 ? 'Today' : `${remaining}d`}</span></div>`;
  }).join('') : '<p class="empty-hint">Track a scholarship to see its deadline here.</p>';
  renderCounts();
}
function renderCourses() {
  const list = document.querySelector('#course-list');
  const overview = document.querySelector('#overview-course-list');
  const visibleCourses = getVisiblePage('courses', list, courses, renderCourses);
  if (!courses.length) {
    list.innerHTML = '<div class="record-empty scholarship-empty"><span class="empty-scholarship-icon">▤</span><h3>No courses yet</h3><p>When you click Explore course, that course will appear here so you can find it again.</p><a class="button button-primary" href="courses.html">Browse courses <span>↗</span></a></div>';
    overview.innerHTML = '<p class="empty-hint">Courses you add will appear here.</p>';
  } else {
    list.innerHTML = visibleCourses.map((item) => {
      const completed = Number(item.progress) >= 100 && certificates.some((certificate) => certificate.course_id === item.id);
      return `<article class="record-row course-record ${completed ? 'completed' : ''}">${completed ? '<span class="course-completed-badge">✓ COMPLETED</span>' : ''}<div class="record-main"><h3>${esc(item.course_name)}</h3><p>${esc(item.provider || 'Provider not added')}${safeUrl(item.course_url) ? ` · <a class="record-link" href="${esc(safeUrl(item.course_url))}" target="_blank" rel="noopener">Continue course ↗</a>` : ''}</p><div class="course-progress-summary"><div class="progress-line"><i style="width:${Math.min(100, Math.max(0, Number(item.progress)))}%"></i></div><span>${Number(item.progress)}% complete</span></div></div><div class="record-actions">${completed ? '' : `<button class="button button-outline upload-certificate-button" type="button" data-upload-course="${esc(item.id)}">Upload certificate</button><button class="delete-record" type="button" data-delete-kind="course" data-delete-id="${esc(item.id)}" data-delete-label="${esc(item.course_name)}" aria-label="Delete ${esc(item.course_name)}" title="Delete course"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>`}</div></article>`;
    }).join('');
    overview.innerHTML = courses.slice(0, 3).map((item) => `<div class="overview-course"><span class="overview-course-icon">▤</span><span class="overview-course-copy"><b>${esc(item.course_name)}</b><small>${esc(item.provider || 'Course')} · ${Number(item.progress)}% complete</small></span><span>${Number(item.progress)}%</span></div>`).join('');
  }
  renderCounts();
}
async function renderCertificates() {
  const list = document.querySelector('#certificate-list');
  const visibleCertificates = getVisiblePage('certificates', list, certificates, renderCertificates);
  if (!certificates.length) {
    list.innerHTML = '<div class="record-empty scholarship-empty"><span class="empty-scholarship-icon">▧</span><h3>No certificates yet</h3><p>Upload a certificate from a course card and it will be saved here automatically.</p><button class="button button-primary" type="button" data-go-tab="courses">View courses <span>↗</span></button></div>';
  } else {
    const entries = await Promise.all(visibleCertificates.map(async (item) => {
      let viewUrl = safeUrl(item.credential_url);
      if (item.file_path) {
        const { data } = await db.storage.from('course-certificates').createSignedUrl(item.file_path, 600);
        if (data?.signedUrl) viewUrl = data.signedUrl;
      }
      const fileName = item.file_path || viewUrl;
      const extension = (fileName.match(/\.([a-z0-9]+)(?:[?#]|$)/i) || [])[1]?.toLowerCase() || '';
      const preview = viewUrl && ['jpg', 'jpeg', 'png'].includes(extension)
        ? `<img src="${esc(viewUrl)}" alt="${esc(item.title)} certificate" loading="lazy">`
        : viewUrl && extension === 'pdf'
          ? `<iframe src="${esc(viewUrl)}#toolbar=0&navpanes=0&scrollbar=0" title="Preview of ${esc(item.title)}" loading="lazy"></iframe>`
          : `<div class="certificate-preview-placeholder"><span>✦</span><b>${extension === 'pdf' ? 'PDF' : 'CERTIFICATE'}</b><small>${viewUrl ? 'Preview unavailable' : 'File unavailable'}</small></div>`;
      return `<article class="certificate-card"><div class="certificate-card-preview">${preview}</div><div class="certificate-card-copy"><h3>${esc(item.title)}</h3><p>${esc(item.provider || 'Issuer not added')}</p><div class="certificate-card-meta"><span>${esc(niceDate(item.issued_on))}</span>${viewUrl ? `<a class="record-link" href="${esc(viewUrl)}" target="_blank" rel="noopener">View full certificate ↗</a>` : ''}</div></div></article>`;
    }));
    list.innerHTML = entries.join('');
  }
  renderCounts();
}
async function loadRecords() {
  if (!db || !currentUser) return;
  const [certResult, scholarshipResult, courseResult] = await Promise.all([
    db.from('certificates').select('*').order('created_at', { ascending: false }),
    db.from('scholarship_applications').select('*').order('created_at', { ascending: false }),
    db.from('course_progress').select('*').order('updated_at', { ascending: false })
  ]);
  certificates = certResult.data || [];
  scholarships = scholarshipResult.data || [];
  courses = courseResult.data || [];
  renderScholarships(); renderCourses(); await renderCertificates();
  const failures = [certResult.error, scholarshipResult.error, courseResult.error].filter(Boolean);
  if (failures.length) {
    const scholarshipFailed = Boolean(scholarshipResult.error);
    alertUser(scholarshipFailed
      ? `Scholarship tracking could not load: ${scholarshipResult.error.message}. Check the scholarship_applications table and its access policy in Supabase.`
      : `Some dashboard data could not load: ${failures.map((error) => error.message).join(' · ')}`);
  } else alertUser('');
}
async function savePendingScholarship() {
  const raw = localStorage.getItem('credify_pending_scholarship');
  if (!raw) return false;
  let pending;
  try { pending = JSON.parse(raw); } catch { localStorage.removeItem('credify_pending_scholarship'); return false; }
  if (!pending.scholarship_name || !pending.institution || !safeUrl(pending.official_url)) {
    localStorage.removeItem('credify_pending_scholarship');
    return false;
  }
  const { data: existing, error: lookupError } = await db
    .from('scholarship_applications')
    .select('id,status')
    .eq('user_id', currentUser.id)
    .eq('scholarship_name', pending.scholarship_name)
    .limit(1)
    .maybeSingle();
  if (lookupError) { alertUser(lookupError.message); return false; }
  const result = existing
    ? await db.from('scholarship_applications').update({
        institution: pending.institution,
        deadline: pending.deadline || null,
        official_url: pending.official_url,
        status: existing.status === 'saved' ? 'applied' : existing.status
      }).eq('id', existing.id)
    : await db.from('scholarship_applications').insert({
        scholarship_name: pending.scholarship_name,
        institution: pending.institution,
        deadline: pending.deadline || null,
        official_url: pending.official_url,
        status: 'applied',
        user_id: currentUser.id
      });
  if (result.error) { alertUser(result.error.message); return false; }
  localStorage.removeItem('credify_pending_scholarship');
  return true;
}
async function savePendingCourse() {
  const raw = localStorage.getItem('credify_pending_course');
  if (!raw) return false;
  let pending;
  try { pending = JSON.parse(raw); } catch { localStorage.removeItem('credify_pending_course'); return false; }
  if (!pending.course_name || !safeUrl(pending.course_url)) {
    localStorage.removeItem('credify_pending_course');
    return false;
  }
  const { data: existing, error: lookupError } = await db
    .from('course_progress')
    .select('id')
    .eq('user_id', currentUser.id)
    .eq('course_name', pending.course_name)
    .limit(1)
    .maybeSingle();
  if (lookupError) { alertUser(lookupError.message); return false; }
  const result = existing
    ? await db.from('course_progress').update({ provider: pending.provider || null, course_url: pending.course_url }).eq('id', existing.id)
    : await db.from('course_progress').insert({
        course_name: pending.course_name,
        provider: pending.provider || null,
        course_url: pending.course_url,
        progress: 0,
        user_id: currentUser.id
      });
  if (result.error) { alertUser(result.error.message); return false; }
  localStorage.removeItem('credify_pending_course');
  return true;
}
const certificateDialog = document.querySelector('#course-certificate-dialog');
const certificateForm = document.querySelector('#certificate-upload-form');
const certificateFile = document.querySelector('#certificate-file');
const certificateMessage = document.querySelector('#certificate-upload-message');
  const certificateLoader = document.querySelector('#certificate-upload-loader');
const certificateSubmit = document.querySelector('#certificate-upload-submit');
let selectedCourse = null;

function setCertificateMessage(text = '', state = '') {
  certificateMessage.textContent = text;
  certificateMessage.className = `certificate-upload-message${state ? ` ${state}` : ''}`;
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-upload-course]');
  if (!button) return;
  selectedCourse = courses.find((course) => course.id === button.dataset.uploadCourse);
  if (!selectedCourse) return;
  if (certificates.some((certificate) => certificate.course_id === selectedCourse.id)) {
    alertUser('This course already has a certificate. Delete that certificate before uploading a replacement.');
    return;
  }
  certificateForm.reset();
  setCertificateMessage();
  document.querySelector('#certificate-course-name').textContent = selectedCourse.course_name;
  certificateDialog.showModal();
});

document.querySelector('#close-certificate-dialog').addEventListener('click', () => certificateDialog.close());
certificateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = certificateFile.files[0];
  if (!selectedCourse || !file) return;
  const extension = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'jpg', 'jpeg', 'png'].includes(extension)) {
    setCertificateMessage('Upload a PDF, JPG, or PNG file.', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    setCertificateMessage('The file must be 10 MB or smaller.', 'error');
    return;
  }
  if (!db || !currentUser) {
    setCertificateMessage('Your session expired. Sign in again and retry the upload.', 'error');
    return;
  }

  certificateSubmit.disabled = true;
  certificateLoader.hidden = false;
  certificateDialog.classList.add('is-uploading');
  certificateSubmit.innerHTML = '<span class="upload-spinner" aria-hidden="true"></span> Uploading certificate…';
  setCertificateMessage('Uploading your certificate securely…', 'info');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-100);
  const filePath = `${currentUser.id}/${selectedCourse.id}/${Date.now()}-${safeName}`;
  const storage = db.storage.from('course-certificates');
  let savedCertificateId = null;
  try {
    const { error: uploadError } = await storage.upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined
    });
    if (uploadError) throw uploadError;

    const { data: savedCertificate, error: insertError } = await db.from('certificates').insert({
      user_id: currentUser.id,
      course_id: selectedCourse.id,
      title: selectedCourse.course_name,
      provider: selectedCourse.provider,
      issued_on: new Date().toISOString().slice(0, 10),
      file_path: filePath
    }).select('id').single();
    if (insertError) throw insertError;
    savedCertificateId = savedCertificate.id;

    const { error: updateError } = await db.from('course_progress')
      .update({ progress: 100 })
      .eq('id', selectedCourse.id)
      .eq('user_id', currentUser.id);
    if (updateError) throw updateError;

    await loadRecords();
    setCertificateMessage('Certificate saved. This course is now marked completed and appears in your Certificates tab.', 'success');
    window.setTimeout(() => {
      if (certificateDialog.open) certificateDialog.close();
    }, 700);
  } catch (error) {
    if (savedCertificateId) await db.from('certificates').delete().eq('id', savedCertificateId);
    await storage.remove([filePath]);
    setCertificateMessage(error?.message || 'The certificate could not be uploaded. Please try again.', 'error');
  } finally {
    certificateSubmit.disabled = false;
    certificateLoader.hidden = true;
    certificateDialog.classList.remove('is-uploading');
    certificateSubmit.innerHTML = 'Upload and mark completed <span>↗</span>';
  }
});
document.querySelector('#settings-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.querySelector('#settings-name').value.trim();
  const { data, error } = await db.auth.updateUser({ data: { full_name: name } });
  const status = document.querySelector('#settings-message');
  status.textContent = error ? error.message : 'Your profile was updated.';
  if (data.user) setUser(data.user);
});
document.querySelector('#reset-password').addEventListener('click', async () => {
  const { error } = await db.auth.resetPasswordForEmail(currentUser.email, { redirectTo: `${window.location.origin}/login.html` });
  document.querySelector('#settings-message').textContent = error ? error.message : 'If password reset is enabled, a link has been sent to your email.';
});
document.querySelector('#header-signout').addEventListener('click', async () => {
  const { error } = await db.auth.signOut();
  if (error) alertUser(error.message);
  else window.location.replace('login.html');
});

if (!db) {
  alertUser('Supabase is not configured. Check js/supabase-config.js and reload this page.');
} else {
  db.auth.getSession().then(async ({ data, error }) => {
    if (error || !data.session?.user) { window.location.replace('login.html'); return; }
    setUser(data.session.user);
    const savedPending = await savePendingScholarship();
    const savedCourse = await savePendingCourse();
    await loadRecords();
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    if (requestedTab === 'scholarships') selectTab('scholarships');
    if (savedPending && savedCourse) alertUser('Scholarship and course added to your dashboard.', false);
    else if (savedPending) alertUser('Scholarship added to your application tracker.', false);
    else if (savedCourse) alertUser('Course added to your dashboard.', false);
  });
  db.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) window.location.replace('login.html');
  });
}
