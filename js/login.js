let mode = 'login';
const title = document.querySelector('#auth-title');
const subtitle = document.querySelector('#auth-subtitle');
const submit = document.querySelector('#auth-submit');
const switchLine = document.querySelector('#auth-switch');
const message = document.querySelector('#auth-message');
const form = document.querySelector('#auth-form');
const emailInput = document.querySelector('#auth-email');
const passwordInput = document.querySelector('#auth-password');
const googleButton = document.querySelector('#google-button');
const linkedinButton = document.querySelector('#linkedin-button');

const configReady = Boolean(window.CREDIFY_SUPABASE_URL && window.CREDIFY_SUPABASE_ANON_KEY && window.supabase?.createClient);
const authClient = configReady
  ? window.supabase.createClient(window.CREDIFY_SUPABASE_URL, window.CREDIFY_SUPABASE_ANON_KEY)
  : null;

function setMessage(text = '', state = '') {
  message.textContent = text;
  message.className = `auth-message${state ? ` ${state}` : ''}`;
}

function renderMode() {
  const isLogin = mode === 'login';
  title.textContent = isLogin ? 'Welcome back.' : 'Create your account.';
  subtitle.textContent = isLogin ? 'Log in to pick up where you left off.' : 'Start building your next step with Credify.';
  submit.disabled = false;
  submit.removeAttribute('aria-busy');
  submit.innerHTML = `${isLogin ? 'Log in' : 'Create account'} <span>↗</span>`;
  switchLine.innerHTML = isLogin
    ? 'New to Credify? <button type="button" id="mode-toggle">Create a free account</button>'
    : 'Already have an account? <button type="button" id="mode-toggle">Log in</button>';
  switchLine.querySelector('#mode-toggle').addEventListener('click', () => {
    mode = isLogin ? 'signup' : 'login';
    setMessage();
    renderMode();
  });
}

function setBusy(isBusy, label = '') {
  submit.disabled = isBusy;
  submit.setAttribute('aria-busy', String(isBusy));
  googleButton.disabled = isBusy;
  linkedinButton.disabled = isBusy;
  const modeToggle = switchLine.querySelector('#mode-toggle');
  if (modeToggle) modeToggle.disabled = isBusy;
  if (isBusy) {
    submit.innerHTML = `<span class="auth-spinner" aria-hidden="true"></span><span>${label}</span>`;
    setMessage(`${label}…`, 'info');
  } else {
    submit.innerHTML = `${mode === 'login' ? 'Log in' : 'Create account'} <span>↗</span>`;
    submit.removeAttribute('aria-busy');
  }
}

function showSignedIn(session) {
  if (!session?.user) {
    form.hidden = false;
    return;
  }
  window.location.replace('dashboard.html');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (!authClient) {
    setMessage('Supabase is not configured. Check the project URL and publishable key in js/supabase-config.js.', 'error');
    return;
  }

  const isLogin = mode === 'login';
  const credentials = { email: emailInput.value.trim(), password: passwordInput.value };
  setBusy(true, isLogin ? 'Signing in' : 'Creating your account');
  try {
    const result = isLogin
      ? await authClient.auth.signInWithPassword(credentials)
      : await authClient.auth.signUp(credentials, { options: { emailRedirectTo: `${window.location.origin}/dashboard.html` } });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message, 'error');
    } else if (result.data.session) {
      setMessage(isLogin ? 'Signed in successfully. Opening your dashboard…' : 'Account created successfully. Opening your dashboard…', 'success');
      window.setTimeout(() => window.location.replace('dashboard.html'), 450);
    } else if (!isLogin) {
      setMessage('Account created. Check your email to confirm your address, then log in.', 'success');
    }
  } catch (error) {
    setBusy(false);
    setMessage(error?.message || 'We could not reach the sign-in service. Check your connection and try again.', 'error');
  }
});

googleButton.addEventListener('click', async () => {
  if (!authClient) {
    setMessage('Supabase is not configured. Check the project URL and publishable key in js/supabase-config.js.', 'error');
    return;
  }
  googleButton.disabled = true;
  setMessage('Connecting to Google…', 'info');
  try {
    const { error } = await authClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard.html` }
    });
    if (error) {
      googleButton.disabled = false;
      setMessage(error.message, 'error');
    }
  } catch (error) {
    googleButton.disabled = false;
    setMessage(error?.message || 'Google sign-in could not be started. Try again.', 'error');
  }
});

linkedinButton.addEventListener('click', () => {
  setMessage('LinkedIn sign-in needs to be enabled as a provider in Supabase Auth first.', 'info');
});
document.querySelector('#forgot-link').addEventListener('click', async (event) => {
  event.preventDefault();
  if (!authClient) {
    setMessage('Supabase is not configured. Check the project URL and publishable key in js/supabase-config.js.', 'error');
    return;
  }
  const email = emailInput.value.trim();
  if (!email) {
    setMessage('Enter your email address first, then choose Forgot password.', 'error');
    emailInput.focus();
    return;
  }
  setMessage('Sending password reset link…', 'info');
  try {
    const { error } = await authClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}`
    });
    setMessage(error ? error.message : 'If an account exists for that email, a password reset link is on its way.', error ? 'error' : 'success');
  } catch (error) {
    setMessage(error?.message || 'We could not send the reset link. Try again.', 'error');
  }
});

if (authClient) {
  authClient.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') showSignedIn(session);
  });
} else {
  setMessage('Supabase setup is pending. Add the project URL and publishable key to connect authentication.', 'error');
}
renderMode();
if (new URLSearchParams(window.location.search).has('apply')) {
  setMessage('Sign in or create an account and this scholarship will be added to your dashboard.', 'info');
} else if (new URLSearchParams(window.location.search).has('course')) {
  setMessage('Sign in or create an account and this course will be added to your dashboard.', 'info');
}
