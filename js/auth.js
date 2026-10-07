async function registerUser(event){
  event.preventDefault();
  const message = document.querySelector('#registerMessage');
  if(!window.csSupabase){
    message.textContent = 'Connect Supabase first in js/supabase-config.js.';
    return;
  }

  const name = document.querySelector('#rName')?.value.trim();
  const email = document.querySelector('#rEmail')?.value.trim();
  const role = document.querySelector('#rRole')?.value.toLowerCase();
  const password = document.querySelector('#rPass')?.value;
  const consent = document.querySelector('#rConsent')?.checked;

  if(!name || !email || !role || !password){
    message.textContent = 'Please complete all required fields.';
    return;
  }
  if(!consent){
    message.textContent = 'Please accept the POPIA consent before creating your account.';
    return;
  }
  if((role === 'student' || role === 'faculty') && !email.toLowerCase().endsWith('.ac.za')){
    message.textContent = 'Students and faculty must use a university email ending in .ac.za.';
    return;
  }

  message.textContent = 'Creating account...';
  const {data, error} = await window.csSupabase.auth.signUp({
    email,
    password,
    options:{ data:{ full_name:name, role } }
  });

  if(error){
    message.textContent = error.message;
    message.className = 'msg err';
    return;
  }

  message.className = 'msg ok';
  message.textContent = data.user && data.session
    ? 'Account created successfully. You can now log in.'
    : 'Account created. Check your email to confirm your account, then log in.';
  event.target.reset();
}

async function loginUser(event){
  event.preventDefault();
  const message = document.querySelector('#loginMessage');
  if(!window.csSupabase){
    message.textContent = 'Connect Supabase first in js/supabase-config.js.';
    return;
  }

  const email = document.querySelector('#lEmail')?.value.trim();
  const password = document.querySelector('#lPass')?.value;
  if(!email || !password){
    message.textContent = 'Please enter your email and password.';
    return;
  }

  message.textContent = 'Logging in...';
  const {error} = await window.csSupabase.auth.signInWithPassword({email,password});
  if(error){
    message.textContent = error.message;
    message.className = 'msg err';
    return;
  }

  message.className = 'msg ok';
  message.textContent = 'Login successful.';
  setTimeout(()=>location.href='index.html',500);
}

document.querySelector('#registerForm')?.addEventListener('submit', registerUser);
document.querySelector('#loginForm')?.addEventListener('submit', loginUser);
