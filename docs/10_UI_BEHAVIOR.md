# UI Interactive Behavior & Client Architecture: LAV_SMS

## 1. Client-Side Framework & Libraries
- **CSS Framework**: Bootstrap 4 with Limitless Admin responsive dashboard theme.
- **JavaScript Core**: jQuery 3.x + native browser DOM APIs.
- **Data Tables**: jQuery DataTables with responsive plugin, column sorting, pagination, and instant client-side search.
- **Notification Engines**:
  - `SweetAlert` (`swal`): Modal alerts, destructive action confirmations (delete, reset).
  - `PNotify`: Toast notifications for temporary flash alerts (success, danger, warning, info).
- **Date Picking**: Bootstrap Datepicker (`$('.date-pick').datepicker()`).
- **Select Enhancements**: Select2 plugin for searchable dropdown selects.

## 2. Dynamic AJAX Interceptors
The application implements client-side form interception via `resources/views/partials/js/custom_js.blade.php`:

### 1. Form Submission Interceptor (`ajax-store` / `ajax-update`)
- Submits HTML forms via asynchronous jQuery AJAX (`POST`/`PUT`).
- Reads `data-reload` attribute to reload specific DOM container blocks without a full page refresh.
- Displays PNotify toast on success or renders server validation error alerts.

### 2. Cashier Fee Payment Interceptor (`form.ajax-pay`)
- Intercepts cashier inline payment submissions in the payment ledger table.
- Dynamically updates client table cells without reloading:
  - Fetches original amount, cumulative paid amount, and user input.
  - Computes `new_paid = amt_paid + input_val`.
  - Computes `new_bal = total_amt - new_paid`.
  - Updates table cell text (`td#amt_paid-{id}`, `td#bal-{id}`).
  - Sets input field `max` attribute to new balance.
  - If `new_bal < 1`, smoothly fades out and removes payment form row (`$('#'+form_id).fadeOut('slow').remove()`).

### 3. Cascading Dropdown Handlers
- **`getLGA(state_id)`**: Triggers on State change; clears `#lga_id` select; queries `/ajax/get_lga/{state_id}`; appends new `<option>` elements.
- **`getClassSections(class_id, destination)`**: Queries `/ajax/get_class_sections/{class_id}`; populates section dropdown.
- **`getClassSubjects(class_id)`**: Queries `/ajax/get_class_subjects/{class_id}`; populates both `#section_id` and `#subject_id` dropdowns simultaneously. Filters subjects to those assigned to the logged-in user if teacher.

## 3. Modal & Confirmation Flows
- **Delete Confirmation (`confirmDelete(id)`)**:
  - Renders SweetAlert modal: `"Are you sure? Once deleted, you will not be able to recover this item!"` with `dangerMode: true`.
  - On user confirmation, triggers submission of hidden form `$('form#item-delete-'+id).submit()`.
- **Reset Confirmation (`confirmReset(id)`)**:
  - Renders SweetAlert modal: `"Are you sure? This will reset this item to default state"`.
  - On confirmation, triggers `$('form#item-reset-'+id).submit()`.

## 4. Flash Message Session Protocol
Server-side redirects carry flash session keys handled on view render:
- `session('pop_error')` -> SweetAlert modal with error icon.
- `session('pop_success')` -> SweetAlert modal with success icon and title "GREAT!!".
- `session('flash_success')` -> PNotify success toast (auto-dismiss).
- `session('flash_danger')` / `session('flash_error')` -> PNotify danger toast (persists until closed).
