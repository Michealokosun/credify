(() => {
  const actions = document.querySelector('.site-header .header-actions');
  const supabase = window.supabase;
  const db = supabase?.createClient && window.CREDIFY_SUPABASE_URL && window.CREDIFY_SUPABASE_ANON_KEY
    ? supabase.createClient(window.CREDIFY_SUPABASE_URL, window.CREDIFY_SUPABASE_ANON_KEY)
    : null;
  if (!actions || !db) return;

  function render(session) {
    actions.replaceChildren();
    if (session?.user) {
      const label = document.createElement('span');
      label.className = 'login-link';
      label.textContent = session.user.user_metadata?.full_name || session.user.email || 'Signed in';
      label.setAttribute('aria-label', 'Signed in account');
      const dashboard = document.createElement('a');
      dashboard.className = 'button button-small button-primary';
      dashboard.href = 'dashboard.html';
      dashboard.innerHTML = 'My dashboard <span>↗</span>';
      actions.append(label, dashboard);
      return;
    }
    const login = document.createElement('a');
    login.className = 'login-link';
    login.href = 'login.html';
    login.textContent = 'Log in';
    const create = document.createElement('a');
    create.className = 'button button-small button-primary';
    create.href = 'login.html';
    create.innerHTML = 'Create free account <span>↗</span>';
    actions.append(login, create);
  }

  db.auth.getSession().then(({ data, error }) => {
    if (!error) render(data.session);
  });
  db.auth.onAuthStateChange((_event, session) => render(session));
})();
