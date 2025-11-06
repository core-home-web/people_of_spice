# Complete Form Mapping - All Forms Connected to Airtable

This document lists ALL forms across your website and their Airtable table mappings.

## 📋 Complete Form Inventory

### ✅ Form 1: Contact Form
- **Page:** `/contact-us.html`
- **Form ID:** `wf-form-Contact-Us`
- **Action:** `https://formsubmit.co/corehomeweb2@gmail.com`
- **Fields:** Name, Email, Message
- **Airtable Table:** `Contact Submissions`
- **Status:** ✅ Connected

---

### ✅ Form 2-6: Recipe Newsletter Forms
- **Pages:**
  - `/recipes/spicy-beef-stir-fry.html`
  - `/recipes/grilled-chicken-kebabs.html`
  - `/recipes/moroccan-lamb-tagine.html`
  - `/recipes/fiesta-guacamole.html`
  - `/recipes/thai-green-curry-with-chicken-and-vegetables.html`
- **Form Name:** `email-form`
- **Action:** `https://formsubmit.co/corehomeweb2@gmail.com`
- **Fields:** Email, Recipe (hidden)
- **Airtable Table:** `Newsletter Subscriptions`
- **Status:** ✅ Connected

---

### ⚠️ Form 7: Gift Request Form (NOT CONNECTED)
- **Page:** `/index.html` (popup/modal form)
- **Form ID:** `email-form-3`
- **Action:** `https://formsubmit.co/corehomeweb2@gmail.com`
- **Fields:** First Name, Last Name, Email, Message, Requested Service
- **Airtable Table:** None (form still sends email via FormSubmit)
- **Status:** ⚠️ Not connected to Airtable (as requested)

---

### ✅ Form 8-10: General Newsletter Forms (Footer)
- **Pages:**
  - `/index.html` (footer)
  - `/shop.html` (footer)
  - `/recipes.html` (footer)
- **Form Name:** `email-form`
- **Method:** GET (no action URL)
- **Fields:** Email
- **Airtable Table:** `Newsletter Subscriptions`
- **Status:** ✅ Connected

---

## 🗄️ Required Airtable Tables

### Table 1: **Contact Submissions** ✅
| Field Name | Field Type | Description |
|------------|------------|-------------|
| `Name` | Single line text | Contact's name |
| `Email` | Email | Contact's email |
| `Message` | Long text | Contact's message |
| `FormType` | Single select | "Contact" |
| `Source` | Single line text | "Contact Us Page" |
| `Timestamp` | Date & time | Submission time |
| `Status` | Single select | "New", "In Progress", "Resolved" |

---

### Table 2: **Newsletter Subscriptions** ✅
| Field Name | Field Type | Description |
|------------|------------|-------------|
| `Email` | Email | Subscriber's email |
| `Recipe` | Single line text | Recipe name (if from recipe page) |
| `FormType` | Single select | "Newsletter Subscription" |
| `Source` | Single line text | Page source (e.g., "Home Page", "Shop Page", "Recipe Page") |
| `Timestamp` | Date & time | Subscription time |
| `Status` | Single select | "Active", "Unsubscribed" |

---

### Table 3: **Gift Requests** ⚠️ **CREATE THIS TABLE**
| Field Name | Field Type | Description |
|------------|------------|-------------|
| `First Name` | Single line text | First name |
| `Last Name` | Single line text | Last name |
| `Email` | Email | Email address |
| `Message` | Long text | Message |
| `Requested Service` | Single select | "Menu For 2", "Menu For 4", "Menu For 6" |
| `FormType` | Single select | "Gift Request" |
| `Source` | Single line text | "Home Page - Gift Form" |
| `Timestamp` | Date & time | Request time |
| `Status` | Single select | "New", "In Progress", "Completed" |

---

## 📊 Form Field Mappings

### Contact Form → Contact Submissions
```javascript
{
  Name: formData.get('Name'),
  Email: formData.get('email'),
  Message: formData.get('Message'),
  FormType: 'Contact',
  Source: 'Contact Us Page',
  Timestamp: new Date().toISOString()
}
```

### Recipe Newsletter → Newsletter Subscriptions
```javascript
{
  Email: formData.get('email'),
  Recipe: formData.get('Recipe') || 'Unknown Recipe',
  FormType: 'Newsletter Subscription',
  Source: 'Recipe Page',
  Timestamp: new Date().toISOString()
}
```

### General Newsletter (Footer) → Newsletter Subscriptions
```javascript
{
  Email: formData.get('email-2') || formData.get('email'),
  FormType: 'Newsletter Subscription',
  Source: 'Home Page' | 'Shop Page' | 'Recipes Page',
  Timestamp: new Date().toISOString()
}
```

---

## 🔧 Implementation Status

| Form | Page | Scripts Added | Handler Added | Table Created |
|------|------|---------------|---------------|---------------|
| Contact | contact-us.html | ✅ | ✅ | ✅ |
| Recipe Newsletter (5x) | recipes/*.html | ✅ | ✅ | ✅ |
| Gift Request | index.html | ⚠️ | ❌ | ❌ (Not connected) |
| Newsletter Footer | index.html | ✅ | ✅ | ✅ |
| Newsletter Footer | shop.html | ✅ | ✅ | ✅ |
| Newsletter Footer | recipes.html | ✅ | ✅ | ✅ |

---

## 🚀 Next Steps

1. ✅ **All scripts added** - Forms are ready to connect
2. ✅ **Create tables** in Airtable (Contact Submissions & Newsletter Subscriptions)
3. ✅ **Test all forms** to verify connections
4. ✅ **Deploy changes** to production

**Note:** Gift Request form is NOT connected to Airtable (as requested). It will continue to send emails via FormSubmit only.

---

## 📝 Notes

- All forms continue to send emails via FormSubmit
- Airtable integration is non-blocking (forms work even if Airtable fails)
- Field names in Airtable must match exactly (case-sensitive)
- Timestamp is automatically generated
- Source field helps track where submissions came from

