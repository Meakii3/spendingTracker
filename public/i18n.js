'use strict';

const I18N = {
  en: {
    app_name: 'Spending Tracker',
    tagline: 'Daily expenses & project payments',
    // nav
    nav_dashboard: 'Home', nav_expenses: 'Expenses', nav_projects: 'Projects',
    nav_payees: 'People', nav_settings: 'Settings',
    // auth
    sign_in: 'Sign in', email: 'Email', password: 'Password', name: 'Name',
    first_run_title: 'Welcome! Create the admin account',
    first_run_hint: 'This is the first run. The account you create here will be the administrator.',
    create_account: 'Create account', bad_credentials: 'Wrong email or password',
    logout: 'Log out',
    // dashboard
    this_month: 'This month', my_spending: 'My spending', active_projects: 'Active projects',
    total_budget: 'Total budget', total_spent: 'Total spent', by_category: 'By category',
    budget_used: 'of budget used', over_budget: 'Over budget', remaining: 'Remaining',
    no_data_yet: 'Nothing here yet — add your first record.',
    // expenses
    add_expense: 'Add expense', amount: 'Amount', category: 'Category', date: 'Date',
    note: 'Note', receipt: 'Receipt photo', save: 'Save', cancel: 'Cancel', delete: 'Delete',
    month_total: 'Month total', no_expenses: 'No expenses this month.',
    view_receipt: 'Receipt', optional: 'optional',
    // expense categories
    cat_food: 'Food & dining', cat_groceries: 'Groceries', cat_transport: 'Transport',
    cat_bills: 'Bills & utilities', cat_health: 'Health', cat_shopping: 'Shopping',
    cat_entertainment: 'Entertainment', cat_education: 'Education', cat_family: 'Family',
    cat_other: 'Other',
    // projects
    add_project: 'Add project', project_name: 'Project name', client: 'Client',
    project_type: 'Type', type_fitout: 'Interior fitout', type_construction: 'Construction',
    type_other: 'Other', budget: 'Budget', status: 'Status', status_active: 'Active',
    status_on_hold: 'On hold', status_completed: 'Completed', start_date: 'Start date',
    spent: 'Spent', payments: 'Payments', add_payment: 'Add payment', payee: 'Payee',
    no_projects: 'No projects yet.', no_payments: 'No payments recorded yet.',
    edit_project: 'Edit project', cost_breakdown: 'Cost breakdown', back: 'Back',
    contract_value: 'Contract value', client_payments: 'Received from owner',
    add_client_payment: 'Add received payment', received: 'Received',
    remaining_contract: 'Remaining from contract', of_contract: 'of contract received',
    no_client_payments: 'No payments received yet.', received_payment: 'Payment received',
    // payment categories
    pcat_materials: 'Materials', pcat_labor: 'Workers / labor', pcat_subcontractor: 'Subcontractor',
    pcat_transport: 'Transport', pcat_permits: 'Permits & fees', pcat_equipment: 'Equipment',
    pcat_other: 'Other',
    // payees
    add_payee: 'Add supplier / worker', payee_type: 'Type', ptype_supplier: 'Supplier',
    ptype_worker: 'Worker', ptype_subcontractor: 'Subcontractor', ptype_other: 'Other',
    phone: 'Phone', total_paid: 'Total paid', no_payees: 'No suppliers or workers yet.',
    // settings
    language: 'Language', currency: 'Currency', users: 'Team members', add_user: 'Add member',
    role: 'Role', role_admin: 'Admin', role_member: 'Member',
    currency_hint: '3-letter code, e.g. AED, USD, IQD, SAR',
    // misc
    confirm_delete: 'Delete this record?', error_generic: 'Something went wrong. Try again.',
    invalid_input: 'Please fill the required fields correctly.', email_taken: 'Email already in use.',
    added_by: 'Added by', all: 'All', none: '—',
  },
  ar: {
    app_name: 'متتبع المصاريف',
    tagline: 'المصاريف اليومية ودفعات المشاريع',
    nav_dashboard: 'الرئيسية', nav_expenses: 'مصاريفي', nav_projects: 'المشاريع',
    nav_payees: 'الموردون', nav_settings: 'الإعدادات',
    sign_in: 'تسجيل الدخول', email: 'البريد الإلكتروني', password: 'كلمة المرور', name: 'الاسم',
    first_run_title: 'أهلاً! أنشئ حساب المدير',
    first_run_hint: 'هذا هو التشغيل الأول. الحساب الذي تنشئه هنا سيكون حساب المدير.',
    create_account: 'إنشاء الحساب', bad_credentials: 'البريد أو كلمة المرور غير صحيحة',
    logout: 'تسجيل الخروج',
    this_month: 'هذا الشهر', my_spending: 'مصاريفي', active_projects: 'مشاريع نشطة',
    total_budget: 'إجمالي الميزانية', total_spent: 'إجمالي المصروف', by_category: 'حسب الفئة',
    budget_used: 'من الميزانية', over_budget: 'تجاوز الميزانية', remaining: 'المتبقي',
    no_data_yet: 'لا توجد بيانات بعد — أضف أول سجل.',
    add_expense: 'إضافة مصروف', amount: 'المبلغ', category: 'الفئة', date: 'التاريخ',
    note: 'ملاحظة', receipt: 'صورة الإيصال', save: 'حفظ', cancel: 'إلغاء', delete: 'حذف',
    month_total: 'إجمالي الشهر', no_expenses: 'لا توجد مصاريف هذا الشهر.',
    view_receipt: 'الإيصال', optional: 'اختياري',
    cat_food: 'طعام ومطاعم', cat_groceries: 'بقالة', cat_transport: 'مواصلات',
    cat_bills: 'فواتير وخدمات', cat_health: 'صحة', cat_shopping: 'تسوق',
    cat_entertainment: 'ترفيه', cat_education: 'تعليم', cat_family: 'عائلة',
    cat_other: 'أخرى',
    add_project: 'إضافة مشروع', project_name: 'اسم المشروع', client: 'العميل',
    project_type: 'النوع', type_fitout: 'تشطيب داخلي', type_construction: 'بناء',
    type_other: 'أخرى', budget: 'الميزانية', status: 'الحالة', status_active: 'نشط',
    status_on_hold: 'متوقف مؤقتاً', status_completed: 'مكتمل', start_date: 'تاريخ البدء',
    spent: 'المصروف', payments: 'الدفعات', add_payment: 'إضافة دفعة', payee: 'المستفيد',
    no_projects: 'لا توجد مشاريع بعد.', no_payments: 'لا توجد دفعات مسجلة بعد.',
    edit_project: 'تعديل المشروع', cost_breakdown: 'توزيع التكاليف', back: 'رجوع',
    contract_value: 'قيمة العقد', client_payments: 'الدفعات المستلمة من المالك',
    add_client_payment: 'إضافة دفعة مستلمة', received: 'المستلم',
    remaining_contract: 'المتبقي من العقد', of_contract: 'من قيمة العقد',
    no_client_payments: 'لا توجد دفعات مستلمة بعد.', received_payment: 'دفعة مستلمة',
    pcat_materials: 'مواد', pcat_labor: 'عمال / أجور', pcat_subcontractor: 'مقاول باطن',
    pcat_transport: 'نقل', pcat_permits: 'تصاريح ورسوم', pcat_equipment: 'معدات',
    pcat_other: 'أخرى',
    add_payee: 'إضافة مورد / عامل', payee_type: 'النوع', ptype_supplier: 'مورد',
    ptype_worker: 'عامل', ptype_subcontractor: 'مقاول باطن', ptype_other: 'أخرى',
    phone: 'الهاتف', total_paid: 'إجمالي المدفوع', no_payees: 'لا يوجد موردون أو عمال بعد.',
    language: 'اللغة', currency: 'العملة', users: 'أعضاء الفريق', add_user: 'إضافة عضو',
    role: 'الصلاحية', role_admin: 'مدير', role_member: 'عضو',
    currency_hint: 'رمز من ٣ أحرف، مثل AED أو USD أو IQD أو SAR',
    confirm_delete: 'هل تريد حذف هذا السجل؟', error_generic: 'حدث خطأ ما. حاول مرة أخرى.',
    invalid_input: 'يرجى تعبئة الحقول المطلوبة بشكل صحيح.', email_taken: 'البريد مستخدم مسبقاً.',
    added_by: 'أضافها', all: 'الكل', none: '—',
  },
};

let currentLang = localStorage.getItem('lang') || 'en';

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || key;
}

function setLang(lang) {
  currentLang = I18N[lang] ? lang : 'en';
  localStorage.setItem('lang', currentLang);
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
}

setLang(currentLang);
