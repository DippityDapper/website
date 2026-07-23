/*
 * contact-form.js – Submits the contact form in the background via
 * Web3Forms (https://web3forms.com/) instead of opening an email client.
 */

const WEB3FORMS_ACCESS_KEY = '41a7109c-78f0-4830-b665-f7343e0e1115';
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

function setFormStatus(statusEl, message, isError) {
  statusEl.textContent = message;
  statusEl.hidden = false;
  statusEl.classList.toggle('form-status--error', Boolean(isError));
  statusEl.classList.toggle('form-status--success', !isError);
}

function initContactForm() {
  const form = document.querySelector('form[data-site-form="contact"]');
  if (!form) return;

  const statusEl = document.createElement('p');
  statusEl.className = 'form-status';
  statusEl.hidden = true;
  form.insertAdjacentElement('afterend', statusEl);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (form.botcheck && form.botcheck.checked) return;

    const submitButton = form.querySelector('button[type="submit"]');
    const originalLabel = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Sending…';

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.access_key = WEB3FORMS_ACCESS_KEY;

      const res = await fetch(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (result.success) {
        form.reset();
        setFormStatus(statusEl, "Thanks! Your message has been sent — we'll get back to you soon.", false);
      } else {
        setFormStatus(statusEl, 'Something went wrong sending your message. Please try again or email us directly.', true);
      }
    } catch (err) {
      setFormStatus(statusEl, 'Something went wrong sending your message. Please try again or email us directly.', true);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContactForm);
} else {
  initContactForm();
}
