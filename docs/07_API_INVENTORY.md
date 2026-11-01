# API & Backend Endpoint Inventory: LAV_SMS

## 1. Authentication & System Endpoints

| Method | Route | Controller & Action | Auth Middleware | Request Validation / Params | Response & Side Effects |
|---|---|---|---|---|---|
| `GET` | `/login` | `Auth\LoginController@showLoginForm` | guest | None | Render login view |
| `POST` | `/login` | `Auth\LoginController@login` | guest | `identity` (email/username), `password` | Authenticate session; redirect `/dashboard` |
| `POST` | `/logout` | `Auth\LoginController@logout` | auth | None | Invalidate session; redirect `/login` |
| `GET` | `/dashboard` | `HomeController@dashboard` | auth | None | Render dashboard; loads user count if teamSAT |
| `GET` | `/privacy-policy` | `HomeController@privacy_policy` | None | None | Public policy page |
| `GET` | `/terms-of-use` | `HomeController@terms_of_use` | None | None | Public terms page |

## 2. My Account & Profile

| Method | Route | Controller & Action | Auth Middleware | Request Validation / Params | Response & Side Effects |
|---|---|---|---|---|---|
| `GET` | `/my_account` | `MyAccountController@edit_profile` | auth | None | Render profile view |
| `PUT` | `/my_account` | `MyAccountController@update_profile` | auth | `UserUpdate` (email, phone, address, photo) | Updates user profile; uploads photo; flash success |
| `PUT` | `/my_account/change_password` | `MyAccountController@change_pass` | auth | `UserChangePass` (current_password, password) | Verifies password; hashes new password |

## 3. Student Record Operations

| Method | Route | Controller & Action | Auth Middleware | Request Validation / Params | Response & Side Effects |
|---|---|---|---|---|---|
| `GET` | `/students` | `StudentRecordController@index` | auth, teamSA | None | View class selection for students |
| `GET` | `/students/create` | `StudentRecordController@create` | auth, teamSA | None | Render admission form |
| `POST` | `/students` | `StudentRecordController@store` | auth, teamSA | `StudentRecordCreate` | Creates User + StudentRecord; uploads photo; JSON ok |
| `GET` | `/students/list/{class_id}` | `StudentRecordController@listByClass` | auth, teamSAT | `class_id` | View all students enrolled in class |
| `GET` | `/students/{id}` | `StudentRecordController@show` | auth | `id` (hash) | Profile card; verified against student/parent ownership |
| `GET` | `/students/{id}/edit` | `StudentRecordController@edit` | auth, teamSA | `id` (hash) | Edit student form |
| `PUT` | `/students/{id}` | `StudentRecordController@update` | auth, teamSA | `StudentRecordUpdate` | Updates user & student record; prunes old class marks |
| `DELETE` | `/students/{id}` | `StudentRecordController@destroy` | auth, super_admin | `id` (hash) | Deletes user, student record, photo directory |
| `GET` | `/students/reset_pass/{id}` | `StudentRecordController@reset_pass` | auth, teamSA | `id` (hash) | Resets password to 'student' |
| `GET` | `/students/graduated` | `StudentRecordController@graduated` | auth, teamSA | None | List all graduated alumni |
| `PUT` | `/students/not_graduated/{id}` | `StudentRecordController@not_graduated`| auth, teamSA | `id` | Resets grad=0 and sets session to current |

## 4. Promotion Management

| Method | Route | Controller & Action | Auth Middleware | Request Validation / Params | Response & Side Effects |
|---|---|---|---|---|---|
| `GET` | `/students/promotion/{fc?}/{fs?}/{tc?}/{ts?}` | `PromotionController@promotion` | auth, teamSA | Route params for source & destination class/section | Render promotion selector matrix |
| `POST` | `/students/promote_selector` | `PromotionController@selector` | auth, teamSA | `fc`, `fs`, `tc`, `ts` | Redirect to promotion route with params |
| `POST` | `/students/promote/{fc}/{fs}/{tc}/{ts}` | `PromotionController@promote` | auth, teamSA | `p-{id}` ('P', 'D', 'G') per student | Batch updates student class/section/grad; logs `promotions` |
| `GET` | `/students/promotion/manage` | `PromotionController@manage` | auth, teamSA | None | List promotion history for current/next sessions |
| `DELETE` | `/students/promotion/reset/{pid}` | `PromotionController@reset` | auth, teamSA | `pid` | Reverts single student promotion to origin class |
| `DELETE` | `/students/promotion/reset_all` | `PromotionController@reset_all` | auth, teamSA | None | Rollbacks all promotions for session; prunes new marks |

## 5. Marks, Examinations & Report Cards

| Method | Route | Controller & Action | Auth Middleware | Request Validation / Params | Response & Side Effects |
|---|---|---|---|---|---|
| `GET` | `/marks` | `MarkController@index` | auth, teamSAT | None | Class, exam, and subject selection screen |
| `POST` | `/marks/selector` | `MarkController@selector` | auth, teamSAT | `exam`, `class`, `section`, `subject` | Validates selector; redirects to manage route |
| `GET` | `/marks/manage/{exam}/{class}/{sec}/{sub}` | `MarkController@manage` | auth, teamSAT | Route IDs | Renders score sheet for subject |
| `PUT` | `/marks/update/{exam}/{class}/{sec}/{sub}` | `MarkController@update` | auth, teamSAT | `t1`, `t2`, `t3`, `t4`, `tca`, `exm` per student | Recomputes totals, tex, cumulative; updates marks |
| `PUT` | `/marks/comment_update/{exr_id}` | `MarkController@comment_update` | auth, teamSAT | `t_comment`, `p_comment` | Updates teacher/principal remarks |
| `PUT` | `/marks/skills_update/{skill}/{exr_id}` | `MarkController@skills_update` | auth, teamSAT | Skill ratings (1-5) | Updates `af` or `ps` values in exam record |
| `GET` | `/marks/batch_fix` | `MarkController@batch_fix` | auth, teamSA | None | Diagnostic selector for cohort recalculation |
| `PUT` | `/marks/batch_update` | `MarkController@batch_update` | auth, teamSA | `exam_id`, `class_id`, `section_id` | Recalculates student totals, class averages, rank positions |
| `GET` | `/marks/tabulation/{exam?}/{class?}/{sec?}` | `MarkController@tabulation` | auth, teamSA | Exam, class, section | Master broadsheet table view |
| `GET` | `/marks/tabulation/print/{exam}/{class}/{sec}` | `MarkController@print_tabulation` | auth, teamSA | IDs | Printable broadsheet tabulation sheet |
| `GET` | `/marks/show/{id}/{year}` | `MarkController@show` | auth | `id` (hash), `year` | Displays student term report card (checks PIN if locked) |
| `GET` | `/marks/print/{id}/{exam_id}/{year}` | `MarkController@print_view` | auth | `id` (hash), `exam_id`, `year` | Printable student marksheet view |

## 6. Scratch PIN Verification

| Method | Route | Controller & Action | Auth Middleware | Request Validation / Params | Response & Side Effects |
|---|---|---|---|---|---|
| `GET` | `/pins` | `PinController@index` | auth, teamSA | None | View valid and used scratch PINs |
| `GET` | `/pins/create` | `PinController@create` | auth, teamSA | None | Form to generate PIN batch |
| `POST` | `/pins` | `PinController@store` | auth, teamSA | `PinCreate` (pin_count) | Generates batch of tokens (e.g. 50); saves to `pins` |
| `GET` | `/pins/enter/{id}` | `PinController@enter_pin` | auth | `id` (hash) | Voucher redemption entry screen for marksheet |
| `POST` | `/pins/verify/{id}` | `PinController@verify` | auth | `PinVerify` (pin_code), `student_id` | Validates PIN; increments usage; binds student; sets session |
| `DELETE` | `/pins` | `PinController@destroy` | auth, teamSA | None | Purges exhausted / used scratch cards |

## 7. Payments, Fees & Receipts

| Method | Route | Controller & Action | Auth Middleware | Request Validation / Params | Response & Side Effects |
|---|---|---|---|---|---|
| `GET` | `/payments` | `PaymentController@index` | auth, teamAccount | None | Master fee definition table |
| `POST` | `/payments` | `PaymentController@store` | auth, teamAccount | `PaymentCreate` | Creates master fee; auto-creates payment records for class |
| `GET` | `/payments/manage/{class_id?}` | `PaymentController@manage` | auth, teamAccount | `class_id` | Cashier payment intake screen per student |
| `GET` | `/payments/invoice/{id}/{year?}` | `PaymentController@invoice` | auth, teamAccount | `id` (student_id) | Student ledger of cleared & uncleared invoices |
| `POST` | `/payments/pay_now/{id}` | `PaymentController@pay_now` | auth, teamAccount | `amt_paid` | Decrements balance, logs `receipts`, marks `paid` if 0 |
| `GET` | `/payments/receipts/{id}` | `PaymentController@receipts` | auth, teamAccount | `id` (pr_id) | Printable HTML payment receipt |
| `GET` | `/payments/pdf_receipts/{id}` | `PaymentController@pdf_receipts` | auth, teamAccount | `id` (pr_id) | Downloads compiled PDF receipt via DomPDF |
| `DELETE` | `/payments/reset_record/{id}` | `PaymentController@reset_record` | auth, teamAccount | `id` (pr_id) | Resets payment record balance and deletes receipts |

## 8. Timetables & Schedules

| Method | Route | Controller & Action | Auth Middleware | Request Validation / Params | Response & Side Effects |
|---|---|---|---|---|---|
| `GET` | `/timetables` | `TimeTableController@index` | auth | None | Lists routine and exam timetables |
| `POST` | `/timetables` | `TimeTableController@store` | auth, teamSA | `TTRequest` | Creates schedule entry |
| `GET` | `/timetables/records/manage/{ttr}` | `TimeTableController@manage` | auth, teamSA | `ttr` | Schedule grid editor (assign subjects to slots) |
| `POST` | `/timetables/time_slots` | `TimeTableController@store_time_slot` | auth, teamSA | `TSRequest` | Adds time window to timetable |
| `POST` | `/timetables/time_slots/use/{ttr}` | `TimeTableController@use_time_slot` | auth, teamSA | `ttr_id` | Clones time slots from another timetable record |
| `GET` | `/timetables/records/show/{ttr}` | `TimeTableController@show_record` | auth | `ttr` | View rendered weekly/exam schedule grid |
| `GET` | `/timetables/records/print/{ttr}` | `TimeTableController@print_record` | auth | `ttr` | Printable timetable view |

## 9. Dynamic AJAX Utilities

| Method | Route | Controller & Action | Auth Middleware | Request Validation / Params | Response & Side Effects |
|---|---|---|---|---|---|
| `GET` | `/ajax/get_lga/{state_id}` | `AjaxController@get_lga` | auth | `state_id` | JSON array of `{id, name}` LGAs |
| `GET` | `/ajax/get_class_sections/{class_id}` | `AjaxController@get_class_sections` | auth | `class_id` | JSON array of `{id, name}` sections |
| `GET` | `/ajax/get_class_subjects/{class_id}` | `AjaxController@get_class_subjects` | auth | `class_id` | JSON object `{sections, subjects}` (filtered by teacher) |
