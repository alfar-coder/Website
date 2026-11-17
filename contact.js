const emailButton = document.querySelector('.email-copy');
const address = document.querySelector('#email-address').textContent;
const status = document.querySelector('.email-status');
let reset;
let copying = false;

emailButton.addEventListener('click', async () => {
  if (copying) return;
  copying = true;
  clearTimeout(reset);
  emailButton.classList.remove('copy-unavailable');
  status.textContent = '';

  try {
    await navigator.clipboard.writeText(address);
    emailButton.classList.add('is-copied');
    status.textContent = 'Email address copied.';
    reset = setTimeout(() => {
      emailButton.classList.remove('is-copied');
      status.textContent = '';
    }, 1800);
  } catch {
    emailButton.classList.remove('is-copied');
    emailButton.classList.add('copy-unavailable');
    status.textContent = 'Copy unavailable. You can select the email address to copy it.';
  } finally {
    copying = false;
  }
});
