(() => {
const page = document.querySelector('.detail-page[data-scholarship-name]');
const applyLink = document.querySelector('.official-apply');
const db = window.supabase?.createClient && window.CREDIFY_SUPABASE_URL && window.CREDIFY_SUPABASE_ANON_KEY
  ? window.supabase.createClient(window.CREDIFY_SUPABASE_URL, window.CREDIFY_SUPABASE_ANON_KEY)
  : null;

if (page && applyLink) {
  const officialUrl = applyLink.href;
  const feedback = document.createElement('p');
  feedback.className = 'apply-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  applyLink.insertAdjacentElement('afterend', feedback);

  const application = {
    scholarship_name: page.dataset.scholarshipName,
    institution: page.dataset.institution,
    deadline: page.dataset.deadline,
    official_url: officialUrl,
    status: 'applied'
  };
  let signedIn = false;

  function renderApplyLink() {
    applyLink.href = signedIn ? officialUrl : 'login.html?apply=1';
    applyLink.target = signedIn ? '_blank' : '_self';
    applyLink.innerHTML = 'Apply now <span>↗</span>';
    applyLink.setAttribute('aria-label', signedIn ? 'Apply on the official scholarship page' : 'Sign in before applying for this scholarship');
  }

  async function syncSession() {
    if (!db) {
      signedIn = false;
      renderApplyLink();
      feedback.className = 'apply-feedback error';
      feedback.textContent = 'Sign in is unavailable right now. Please try again later.';
      return;
    }
    try {
      const { data, error } = await db.auth.getSession();
      if (error) throw error;
      signedIn = Boolean(data.session?.user);
      renderApplyLink();
    } catch {
      signedIn = false;
      renderApplyLink();
    }
  }

  applyLink.addEventListener('click', async (event) => {
    event.preventDefault();
    if (!signedIn) {
      try {
        const { data, error } = await db.auth.getSession();
        if (error) throw error;
        signedIn = Boolean(data.session?.user);
      } catch {
        signedIn = false;
      }
      if (!signedIn) {
        window.location.assign('login.html?apply=1');
        return;
      }
    }

    // Open the provider page during the user gesture, then save the tracker entry.
    window.open(officialUrl, '_blank', 'noopener');
    feedback.className = 'apply-feedback info';
    feedback.textContent = 'Saving this scholarship to your dashboard…';
    applyLink.setAttribute('aria-disabled', 'true');

    try {
      const { data: sessionData, error: sessionError } = await db.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session?.user) {
        signedIn = false;
        renderApplyLink();
        feedback.className = 'apply-feedback info';
        feedback.textContent = 'Your session expired. Sign in to track this scholarship.';
        return;
      }

      const userId = sessionData.session.user.id;
      const { data: existing, error: lookupError } = await db
        .from('scholarship_applications')
        .select('id,status')
        .eq('user_id', userId)
        .eq('scholarship_name', application.scholarship_name)
        .limit(1)
        .maybeSingle();
      if (lookupError) throw lookupError;

      const fields = {
        institution: application.institution,
        deadline: application.deadline,
        status: existing?.status === 'saved' ? 'applied' : (existing?.status || 'applied')
      };
      let result = existing
        ? await db.from('scholarship_applications').update(fields).eq('id', existing.id).select('id').single()
        : await db.from('scholarship_applications').insert({
            scholarship_name: application.scholarship_name,
            institution: application.institution,
            deadline: application.deadline,
            status: 'applied',
            user_id: userId
          }).select('id').single();
      if (result.error) throw result.error;
      if (!result.data?.id) throw new Error('Supabase did not confirm that the scholarship was saved. Check the table access policy and try again.');

      feedback.className = 'apply-feedback success';
      feedback.textContent = 'Added to your dashboard as applied. Opening your scholarship tracker…';
      window.setTimeout(() => window.location.assign('dashboard.html?tab=scholarships'), 700);
    } catch (error) {
      feedback.className = 'apply-feedback error';
      feedback.textContent = `We couldn’t save this to your dashboard: ${error.message || 'Please try again.'}`;
    } finally {
      applyLink.removeAttribute('aria-disabled');
    }
  });

  if (db) db.auth.onAuthStateChange((_event, session) => {
    signedIn = Boolean(session?.user);
    renderApplyLink();
  });
  syncSession();
}
})();
