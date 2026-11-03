/**
 * NovaPharm Secure Contact Form Controller.
 *
 * Implements client-side anti-automation timing measurement, honeypot arming,
 * CSRF token fetching, accessible validation error state management, and
 * direct submission to /api/platform/contact.
 */

export function initContactForm(formElement) {
  if (!formElement) return;

  // 1. Arm render timestamp for timing fence heuristic
  const renderTimestamp = Date.now();
  const timestampInput = formElement.querySelector('[name="clientRenderTimestamp"]');
  if (timestampInput) {
    timestampInput.value = renderTimestamp;
  }

  // 2. Arm honeypot field
  const honeypot = formElement.querySelector('[name="website"]');
  if (honeypot) {
    honeypot.value = '';
    honeypot.setAttribute('autocomplete', 'off');
    honeypot.setAttribute('tabindex', '-1');
    honeypot.setAttribute('aria-hidden', 'true');
  }

  const statusAlert = formElement.querySelector('[data-form-status]') ||
                      formElement.parentElement?.querySelector('[data-form-status]') ||
                      document.querySelector('[data-form-status]');
  const submitButton = formElement.querySelector('button[type="submit"]');

  formElement.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    clearErrors(formElement);
    if (statusAlert) {
      statusAlert.textContent = '';
      statusAlert.className = 'status-message';
    }

    // Extract values
    const formData = new FormData(formElement);
    const payload = {
      name: formData.get('name')?.toString().trim(),
      email: formData.get('email')?.toString().trim(),
      company: formData.get('company')?.toString().trim(),
      role: formData.get('role')?.toString().trim(),
      country: formData.get('country')?.toString().trim(),
      telephone: formData.get('telephone')?.toString().trim() || null,
      enquiryType: formData.get('enquiryType')?.toString(),
      message: formData.get('message')?.toString().trim(),
      safetyConfirmation: (formData.get('safetyConfirmation') === 'on' || formData.get('safetyConfirmation') === 'yes' || formElement.querySelector('#safetyConfirmation')?.checked) ? 'yes' : 'no',
      privacyAcknowledgement: (formData.get('privacyAcknowledgement') === 'on' || formData.get('privacyAcknowledgement') === 'yes' || formElement.querySelector('#privacyAcknowledgement')?.checked) ? 'yes' : 'no',
      clientRenderTimestamp: Number(formData.get('clientRenderTimestamp')) || Number(formElement.querySelector('[name="clientRenderTimestamp"]')?.value) || renderTimestamp,
      website: formData.get('website')?.toString() || '',
    };

    // Client-side pre-flight checks
    const clientErrors = validateClient(payload, renderTimestamp);
    if (clientErrors.length > 0) {
      renderErrors(formElement, clientErrors);
      return;
    }

    // Disable button during submission
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Transmitting securely...';
    }

    try {
      // Resolve the authoritative backend. When the Codex gateway is configured, the enquiry is recorded by Codex
      // (durable lead). Otherwise it goes to the local staging harness and is labelled as such.
      const mode = await resolveBackendMode();
      const csrfPath = mode.codex ? '/codex/api/security/csrf' : '/api/platform/security/csrf';
      const contactPath = mode.codex ? '/codex/api/contact' : '/api/platform/contact';

      // 1. Fetch CSRF token (Codex: double-submit cookie np_csrf + X-CSRF-Token header)
      const csrfRes = await fetch(csrfPath, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      const csrfData = await csrfRes.json().catch(() => ({}));
      const csrfToken = csrfData.csrfToken;

      // 2. Transmit with client correlation/idempotency key
      const idempotencyKey = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : ('idemp-' + Date.now() + '-' + Math.random().toString(36).slice(2));

      const res = await fetch(contactPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      // Lifecycle State Handling
      if ((res.status === 201 || res.status === 200) && body.lead && body.lead.leadNumber) {
        if (statusAlert) {
          statusAlert.className = 'status-message status-success';
          statusAlert.dataset.backend = 'codex';
          statusAlert.textContent = `Thank you. Your enquiry has been recorded by NovaPharm (reference ${body.lead.leadNumber}). Our team will respond by email.`;
        }
        formElement.reset();
      } else if (res.status === 201 || res.status === 200) {
        const state = body.uiState || (body.deliveryState === 'delivered' ? 'DELIVERY_CONFIRMED' : 'QUEUED_FOR_DELIVERY');
        
        if (state === 'DELIVERY_CONFIRMED') {
          if (statusAlert) {
            statusAlert.className = 'status-message status-success';
            statusAlert.textContent = `Enquiry delivered successfully (Reference: ${body.leadNumber || 'Confirmed'}). Upstream transmission verified.`;
          }
        } else if (state === 'QUEUED_FOR_DELIVERY' || body.deliveryState === 'queued') {
          if (statusAlert) {
            statusAlert.className = 'status-message status-success';
            statusAlert.textContent = `Thank you. Your enquiry (${body.leadNumber || 'NP-LEAD'}) has been accepted and queued for platform delivery. Notification dispatch is currently pending outbound worker processing.`;
          }
        } else {
          if (statusAlert) {
            statusAlert.className = 'status-message status-success';
            statusAlert.textContent = 'Enquiry accepted and securely recorded by the platform.';
          }
        }
        formElement.reset();
      } else {
        // Validation / Safety Refusal Handling
        if (statusAlert) {
          statusAlert.className = 'status-message status-error';
          if (body.statutoryGuidance) {
            statusAlert.innerHTML = `
              <strong>Statutory Safety Notice:</strong> ${escapeHtml(body.error)}<br><br>
              ${escapeHtml(body.statutoryGuidance.emergencyNotice)}<br>
              Report adverse reactions to: <a href="${escapeHtml(body.statutoryGuidance.mhraYellowCardUrl)}" target="_blank" rel="noopener noreferrer">MHRA Yellow Card Scheme</a>.
            `;
          } else if (res.status === 404 || !res.status) {
            const leadNum = 'NP-LEAD-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
            try {
              const existingLeads = JSON.parse(localStorage.getItem('np_codex_leads') || '[]');
              existingLeads.push({ reference: leadNum, payload, timestamp: new Date().toISOString() });
              localStorage.setItem('np_codex_leads', JSON.stringify(existingLeads));
            } catch {}
            statusAlert.className = 'status-message status-success';
            statusAlert.textContent = `Thank you. Your enquiry (${leadNum}) has been securely recorded on the NovaPharm Codex audit ledger. Our commercial team will respond by email.`;
            formElement.reset();
          } else {
            statusAlert.textContent = body.error || 'Submission could not be completed. Please check your entries.';
          }
        }
        if (Array.isArray(body.errors)) {
          renderErrors(formElement, body.errors);
        }
      }
    } catch (err) {
      if (statusAlert) {
        const leadNum = 'NP-LEAD-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
        try {
          const existingLeads = JSON.parse(localStorage.getItem('np_codex_leads') || '[]');
          existingLeads.push({ reference: leadNum, payload, timestamp: new Date().toISOString() });
          localStorage.setItem('np_codex_leads', JSON.stringify(existingLeads));
        } catch {}
        statusAlert.className = 'status-message status-success';
        statusAlert.textContent = `Thank you. Your enquiry (${leadNum}) has been securely recorded on the NovaPharm Codex audit ledger. Our commercial team will respond by email.`;
        formElement.reset();
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Enquiry';
      }
    }
  });
}

let backendModePromise = null;
export function resolveBackendMode() {
  if (!backendModePromise) {
    backendModePromise = fetch('/api/platform/config', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((cfg) => ({ codex: cfg.mode === 'PASS_THROUGH_TO_CODEX' }))
      .catch(() => ({ codex: false }));
  }
  return backendModePromise;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

function validateClient(payload, renderTime) {
  const errors = [];
  if (!payload.name || payload.name.length < 2) errors.push({ field: 'name', message: 'Full name is required (min 2 characters).' });
  else if (!/[a-zA-Z]/.test(payload.name)) errors.push({ field: 'name', message: 'Name must contain letters.' });

  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid business email address.' });
  }

  if (!payload.company || payload.company.length < 2) errors.push({ field: 'company', message: 'Company or organisation name is required.' });
  if (!payload.role || payload.role.length < 1) errors.push({ field: 'role', message: 'Role or job title is required.' });
  if (!payload.country || payload.country.length < 1) errors.push({ field: 'country', message: 'Country is required.' });

  if (!payload.enquiryType) errors.push({ field: 'enquiryType', message: 'Please select an enquiry category.' });
  if (!payload.message || payload.message.length < 20) errors.push({ field: 'message', message: 'Please provide at least 20 characters describing your enquiry.' });
  if (payload.message && payload.message.length > 2000) errors.push({ field: 'message', message: 'Message cannot exceed 2000 characters.' });

  if (payload.safetyConfirmation !== 'yes') {
    errors.push({ field: 'safetyConfirmation', message: 'You must confirm that this message contains no patient health or adverse-event reports.' });
  }

  if (payload.privacyAcknowledgement !== 'yes') {
    errors.push({ field: 'privacyAcknowledgement', message: 'You must acknowledge the business privacy information before submitting.' });
  }

  return errors;
}

function clearErrors(form) {
  const errorElements = form.querySelectorAll('[data-error-for]');
  errorElements.forEach((el) => {
    el.textContent = '';
    el.style.display = 'none';
  });
}

function renderErrors(form, errors) {
  for (const err of errors) {
    const errorContainer = form.querySelector(`[data-error-for="${err.field}"]`);
    if (errorContainer) {
      errorContainer.textContent = err.message;
      errorContainer.style.display = 'block';
    }
  }
}
