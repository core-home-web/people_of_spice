# Airtable Database Structure & Form Mapping Guide

This document outlines the recommended Airtable database structure and how form submissions from your website map to Airtable tables.

## 📊 Recommended Airtable Table Structure

### Table 1: **Contact Submissions**

**Purpose:** Store all contact form submissions from `/contact-us`

| Field Name | Field Type | Description | Example |
|------------|------------|-------------|---------|
| `Name` | Single line text | Contact's name | "John Doe" |
| `Email` | Email | Contact's email address | "john@example.com" |
| `Message` | Long text | Contact's message | "I love your spices!" |
| `FormType` | Single select | Type of form | "Contact" |
| `Source` | Single line text | Where form was submitted | "Contact Us Page" |
| `Timestamp` | Date & time | When form was submitted | Auto-generated |
| `Status` | Single select | Processing status | "New", "In Progress", "Resolved" |

**Form Mapping:**
- Contact form at `/contact-us` → `Contact Submissions` table
- Fields: `Name`, `email` → `Email`, `Message`

---

### Table 2: **Newsletter Subscriptions**

**Purpose:** Store newsletter subscriptions from recipe pages

| Field Name | Field Type | Description | Example |
|------------|------------|-------------|---------|
| `Email` | Email | Subscriber's email | "jane@example.com" |
| `Recipe` | Single line text | Recipe they subscribed from | "Spicy Beef Stir Fry" |
| `FormType` | Single select | Type of form | "Newsletter Subscription" |
| `Source` | Single line text | Where form was submitted | "Recipe Page" |
| `Timestamp` | Date & time | When subscribed | Auto-generated |
| `Status` | Single select | Subscription status | "Active", "Unsubscribed" |

**Form Mapping:**
- Recipe newsletter forms → `Newsletter Subscriptions` table
- Fields: `email` → `Email`, `Recipe` (hidden field) → `Recipe`

---

## 🔄 Form Submission Flow

### Current Setup (FormSubmit + Airtable)

```
User submits form
    ↓
1. JavaScript intercepts submission
    ↓
2. Data sent to Airtable (via /api/airtable)
    ↓
3. Data sent to FormSubmit (for email notification)
    ↓
4. User redirected to thank-you page
```

### Benefits:
- ✅ **Email notifications** via FormSubmit (existing setup)
- ✅ **Database storage** in Airtable (new)
- ✅ **No breaking changes** - forms still work if Airtable fails
- ✅ **Dual storage** - data in both email and database

---

## 📝 Form Field Mapping

### Contact Form (`/contact-us`)

**HTML Form Fields:**
```html
<input name="Name" />
<input name="email" />
<textarea name="Message"></textarea>
```

**Airtable Mapping:**
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

**Airtable Table:** `Contact Submissions`

---

### Recipe Newsletter Forms (e.g., `/recipes/spicy-beef-stir-fry`)

**HTML Form Fields:**
```html
<input name="email" />
<input type="hidden" name="Recipe" value="Spicy Beef Stir Fry" />
```

**Airtable Mapping:**
```javascript
{
  Email: formData.get('email'),
  Recipe: formData.get('Recipe') || 'Unknown Recipe',
  FormType: 'Newsletter Subscription',
  Source: 'Recipe Page',
  Timestamp: new Date().toISOString()
}
```

**Airtable Table:** `Newsletter Subscriptions`

---

## 🛠️ Implementation

### Step 1: Create Tables in Airtable

1. Go to your Airtable base: https://airtable.com/appOLeQs1TFrsSbe2
2. Create table **"Contact Submissions"** with fields:
   - Name (Single line text)
   - Email (Email)
   - Message (Long text)
   - FormType (Single select: "Contact")
   - Source (Single line text)
   - Timestamp (Date & time)
   - Status (Single select: "New", "In Progress", "Resolved")

3. Create table **"Newsletter Subscriptions"** with fields:
   - Email (Email)
   - Recipe (Single line text)
   - FormType (Single select: "Newsletter Subscription")
   - Source (Single line text)
   - Timestamp (Date & time)
   - Status (Single select: "Active", "Unsubscribed")

### Step 2: Add Form Handler Script

Add this script to your HTML pages:

```html
<!-- Add after airtable.js -->
<script src="js/form-handler.js"></script>
```

### Step 3: Update Forms

Forms will automatically work - no changes needed! The JavaScript intercepts submissions and sends to both FormSubmit and Airtable.

---

## 📋 Form Locations

### Contact Form
- **Page:** `/contact-us.html`
- **Form ID:** `wf-form-Contact-Us`
- **Action:** `https://formsubmit.co/corehomeweb2@gmail.com`
- **Table:** `Contact Submissions`

### Recipe Newsletter Forms
- **Pages:**
  - `/recipes/spicy-beef-stir-fry.html`
  - `/recipes/grilled-chicken-kebabs.html`
  - `/recipes/moroccan-lamb-tagine.html`
  - `/recipes/fiesta-guacamole.html`
  - `/recipes/thai-green-curry-with-chicken-and-vegetables.html`
- **Form Name:** `email-form`
- **Action:** `https://formsubmit.co/corehomeweb2@gmail.com`
- **Table:** `Newsletter Subscriptions`

---

## 🔍 Testing

### Test Contact Form:
1. Go to https://peopleofspice.com/contact-us
2. Fill out and submit the form
3. Check:
   - Email received at corehomeweb2@gmail.com ✅
   - Record created in Airtable `Contact Submissions` table ✅

### Test Recipe Newsletter:
1. Go to https://peopleofspice.com/recipes/spicy-beef-stir-fry
2. Enter email in newsletter form
3. Submit
4. Check:
   - Email received at corehomeweb2@gmail.com ✅
   - Record created in Airtable `Newsletter Subscriptions` table ✅

---

## 🎯 Data Flow Example

### Contact Form Submission:

**User Input:**
- Name: "Sarah Johnson"
- Email: "sarah@example.com"
- Message: "I'd like to order in bulk for my restaurant"

**Airtable Record Created:**
```
Table: Contact Submissions
├─ Name: "Sarah Johnson"
├─ Email: "sarah@example.com"
├─ Message: "I'd like to order in bulk for my restaurant"
├─ FormType: "Contact"
├─ Source: "Contact Us Page"
├─ Timestamp: "2025-11-06T19:30:00Z"
└─ Status: "New"
```

**Email Sent to:** corehomeweb2@gmail.com
**Subject:** "New Contact Form Submission from People of Spice"

---

### Recipe Newsletter Submission:

**User Input:**
- Email: "chef@example.com"
- Recipe: "Spicy Beef Stir Fry" (hidden field)

**Airtable Record Created:**
```
Table: Newsletter Subscriptions
├─ Email: "chef@example.com"
├─ Recipe: "Spicy Beef Stir Fry"
├─ FormType: "Newsletter Subscription"
├─ Source: "Recipe Page"
├─ Timestamp: "2025-11-06T19:30:00Z"
└─ Status: "Active"
```

**Email Sent to:** corehomeweb2@gmail.com
**Subject:** "New Recipe Newsletter Subscription - Spicy Beef Stir Fry"

**Auto-Response Sent to:** chef@example.com
**Message:** "Welcome to People of Spice! Thank you for subscribing..."

---

## 🔐 Security Notes

- ✅ Form submissions are validated before sending to Airtable
- ✅ Airtable token is stored server-side (never exposed)
- ✅ Forms continue to work even if Airtable API fails
- ✅ Email notifications still work via FormSubmit

---

## 📊 Airtable Views (Recommended)

### Contact Submissions Views:
1. **All Contacts** - Grid view of all submissions
2. **New** - Filter: Status = "New"
3. **By Date** - Grouped by Timestamp
4. **Unresolved** - Filter: Status ≠ "Resolved"

### Newsletter Subscriptions Views:
1. **All Subscribers** - Grid view of all subscriptions
2. **Active** - Filter: Status = "Active"
3. **By Recipe** - Grouped by Recipe field
4. **Recent** - Sorted by Timestamp (newest first)

---

## 🚀 Next Steps

1. ✅ Create tables in Airtable (see Step 1 above)
2. ✅ Add `form-handler.js` script to pages
3. ✅ Test form submissions
4. ✅ Set up Airtable views for easy data management
5. ✅ Optional: Create Airtable automations for follow-ups

---

## 📞 Support

If you need to modify the field mappings or add new forms:
1. Update the `form-handler.js` file
2. Update this mapping document
3. Ensure Airtable table structure matches

