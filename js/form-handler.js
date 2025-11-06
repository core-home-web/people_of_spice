/**
 * Form submission handler that sends data to both FormSubmit (for email) and Airtable (for database)
 */

// Wait for Airtable client to load
function initFormHandlers() {
  // Check if airtable client is loaded
  if (typeof airtable === 'undefined') {
    // Load the Airtable client script
    const script = document.createElement('script');
    script.src = '/js/airtable.js';
    script.onload = () => {
      setupFormHandlers();
    };
    document.head.appendChild(script);
  } else {
    setupFormHandlers();
  }
}

function setupFormHandlers() {
  // Handle Contact Form submissions
  const contactForm = document.getElementById('wf-form-Contact-Us');
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = new FormData(contactForm);
      const data = {
        Name: formData.get('Name'),
        Email: formData.get('email'),
        Message: formData.get('Message'),
        FormType: 'Contact',
        Source: 'Contact Us Page',
        Timestamp: new Date().toISOString()
      };

      // Submit to Airtable
      try {
        await airtable.createRecord('Contact Submissions', data);
        console.log('Contact form submitted to Airtable');
      } catch (error) {
        console.error('Error submitting to Airtable:', error);
        // Continue with form submission even if Airtable fails
      }

      // Continue with original form submission to FormSubmit
      contactForm.submit();
    });
  }

  // Handle Recipe Newsletter Form submissions
  const recipeForms = document.querySelectorAll('form[action*="formsubmit.co"][name="email-form"]');
  recipeForms.forEach(form => {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = new FormData(form);
      const email = formData.get('email');
      const recipe = formData.get('Recipe') || getRecipeNameFromPage();
      
      const data = {
        Email: email,
        Recipe: recipe,
        FormType: 'Newsletter Subscription',
        Source: 'Recipe Page',
        Timestamp: new Date().toISOString()
      };

      // Submit to Airtable
      try {
        await airtable.createRecord('Newsletter Subscriptions', data);
        console.log('Newsletter subscription submitted to Airtable');
      } catch (error) {
        console.error('Error submitting to Airtable:', error);
        // Continue with form submission even if Airtable fails
      }

      // Continue with original form submission to FormSubmit
      form.submit();
    });
  });
}

function getRecipeNameFromPage() {
  // Try to extract recipe name from page title or heading
  const h1 = document.querySelector('h1.hero-header, h1');
  if (h1) {
    return h1.textContent.trim();
  }
  const title = document.title;
  if (title) {
    return title.replace(' Recipe | People of Spice', '').replace(' | People Of Spice', '');
  }
  return 'Unknown Recipe';
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFormHandlers);
} else {
  initFormHandlers();
}

