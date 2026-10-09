const client = window.supabase?.createClient && window.CREDIFY_SUPABASE_URL && window.CREDIFY_SUPABASE_ANON_KEY
  ? window.supabase.createClient(window.CREDIFY_SUPABASE_URL, window.CREDIFY_SUPABASE_ANON_KEY)
  : null;

function showFeedback(link, text, state) {
  let note = link.parentElement.querySelector('.course-track-feedback');
  if (!note) {
    note = document.createElement('small');
    note.className = 'course-track-feedback';
    link.insertAdjacentElement('afterend', note);
  }
  note.className = `course-track-feedback ${state}`;
  note.textContent = text;
}

async function trackCourse(link) {
  const card = link.closest('.course-card');
  const course = {
    course_name: card?.querySelector('.course-body h3')?.textContent.trim(),
    provider: card?.querySelector('.course-body p')?.textContent.trim() || null,
    course_url: link.href
  };
  if (!course.course_name) return;
  if (!client) {
    showFeedback(link, 'Course tracking is unavailable right now. You can still open the course.', 'error');
    return;
  }
  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session?.user) {
      localStorage.setItem('credify_pending_course', JSON.stringify(course));
      showFeedback(link, 'Sign in to add this course to your dashboard. The course is opening in another tab.', 'info');
      window.location.assign('login.html?course=1');
      return;
    }

    const userId = data.session.user.id;
    const { data: existing, error: lookupError } = await client
      .from('course_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('course_name', course.course_name)
      .limit(1)
      .maybeSingle();
    if (lookupError) throw lookupError;
    const result = existing
      ? await client.from('course_progress').update({ provider: course.provider, course_url: course.course_url }).eq('id', existing.id)
      : await client.from('course_progress').insert({ ...course, progress: 0, user_id: userId });
    if (result.error) throw result.error;
    showFeedback(link, 'Added to your dashboard. Course progress starts at 0%.', 'success');
  } catch (error) {
    showFeedback(link, `Could not save this course: ${error.message || 'Please try again.'}`, 'error');
  }
}

document.querySelectorAll('.course-link').forEach((link) => {
  link.addEventListener('click', () => { void trackCourse(link); });
});
