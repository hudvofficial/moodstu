-- =====================================================
-- MOOD STUDIO - DATABASE SCHEMA FOR SUPABASE
-- Hệ thống quản lý Studio chụp ảnh cưới
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. BẢNG THÔNG TIN STUDIO
-- =====================================================

CREATE TABLE studio_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    hotline VARCHAR(20),
    representative VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT,
    qr_code_url TEXT,
    location VARCHAR(255),
    bank_account_1 VARCHAR(100),
    bank_account_2 VARCHAR(100),
    email VARCHAR(255),
    fanpage VARCHAR(255),
    zalo VARCHAR(20),
    map_location VARCHAR(255), -- lat, long
    working_hours_start TIME,
    working_hours_end TIME,
    lunch_break_hours INTEGER DEFAULT 0,
    working_days_per_month INTEGER DEFAULT 28,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. BẢNG NHÂN VIÊN
-- =====================================================

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    employee_type VARCHAR(50), -- 'Nhân viên', 'Cộng tác viên'
    full_name VARCHAR(255) NOT NULL,
    gender VARCHAR(10),
    avatar_url TEXT,
    phone VARCHAR(20),
    department VARCHAR(100), -- 'Ban lãnh đạo', 'PHOTO', 'MAKEUP', 'FREELANCER'
    position VARCHAR(100),
    branch VARCHAR(100),
    role VARCHAR(50), -- 'Admin', 'User'
    status VARCHAR(50) DEFAULT 'Đang làm', -- 'Đang làm', 'Nghỉ làm'
    password_hash TEXT,
    base_salary DECIMAL(15,2) DEFAULT 0,
    email VARCHAR(255),
    start_date DATE,
    bank_account VARCHAR(100),
    bank_account_secondary VARCHAR(100),
    work_shift_id UUID,
    work_hours_start TIME,
    work_hours_end TIME,
    lunch_break_hours INTEGER DEFAULT 0,
    sales_commission_rate DECIMAL(5,2) DEFAULT 0,
    salary_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho tìm kiếm
CREATE INDEX idx_employees_code ON employees(employee_code);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_status ON employees(status);

-- =====================================================
-- 3. BẢNG CA LÀM VIỆC
-- =====================================================

CREATE TABLE work_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    lunch_break_hours INTEGER DEFAULT 0,
    total_hours INTEGER NOT NULL,
    standard_hours INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id)
);

-- =====================================================
-- 4. BẢNG KHÁCH HÀNG
-- =====================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    groom_name VARCHAR(255),
    groom_address TEXT,
    groom_phone VARCHAR(20),
    bride_name VARCHAR(255),
    bride_address TEXT,
    bride_phone VARCHAR(20),
    phone VARCHAR(20),
    event_type VARCHAR(50), -- 'Ngày cưới', 'Sinh nhật', etc.
    anniversary_date DATE,
    display_label VARCHAR(255),
    branch VARCHAR(100),
    email VARCHAR(255),
    province VARCHAR(100),
    district VARCHAR(100),
    ward VARCHAR(100),
    address TEXT,
    notes TEXT,
    label VARCHAR(255),
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_code ON customers(customer_code);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(customer_name);

-- =====================================================
-- 5. BẢNG DỊCH VỤ
-- =====================================================

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_code VARCHAR(50) UNIQUE NOT NULL,
    service_type VARCHAR(50), -- 'Dịch vụ', 'Trang phục', 'Sản phẩm'
    service_name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'CHỤP NGÀY CƯỚI', 'BABY', 'QUAY PHIM', etc.
    image_url TEXT,
    description TEXT,
    import_price DECIMAL(15,2) DEFAULT 0,
    variable_cost DECIMAL(15,2) DEFAULT 0,
    selling_price DECIMAL(15,2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'GÓI',
    quantity_in INTEGER DEFAULT 0,
    quantity_out INTEGER DEFAULT 0,
    quantity_stock INTEGER DEFAULT 0,
    label VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Nhập về', -- 'Nhập về', 'Xuất bán', 'Xuất thuê'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_code ON services(service_code);
CREATE INDEX idx_services_type ON services(service_type);
CREATE INDEX idx_services_category ON services(category);

-- =====================================================
-- 6. BẢNG CHI TIẾT DỊCH VỤ (Lương theo dịch vụ)
-- =====================================================

CREATE TABLE service_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    service_code VARCHAR(50),
    work_type VARCHAR(100), -- 'PHOTO', 'MAKEUP', 'LAB', etc.
    info TEXT,
    price DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id)
);

CREATE INDEX idx_service_details_service ON service_details(service_id);

-- =====================================================
-- 7. BẢNG HỢP ĐỒNG
-- =====================================================

CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_code VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(255),
    display_label VARCHAR(255),
    service_type VARCHAR(100),
    service_list TEXT, -- Danh sách dịch vụ
    contract_date DATE NOT NULL,
    dress_pickup_date DATE,
    dress_return_date DATE,
    work_date DATE,
    appointment_1 DATE,
    appointment_2 DATE,
    appointment_3 DATE,
    appointment_4 DATE,
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    remaining_amount DECIMAL(15,2) DEFAULT 0,
    cost DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    status VARCHAR(100), -- Trạng thái hợp đồng
    status_2 VARCHAR(100),
    completion_date DATE,
    created_by UUID REFERENCES employees(id),
    customer_rating INTEGER,
    rating_date DATE,
    address TEXT,
    original_photos_link TEXT,
    completed_photos_link TEXT,
    contract_file_url TEXT,
    print_file_url TEXT,
    work_history TEXT,
    customer_care_history TEXT,
    change_history TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    email_sent_date DATE,
    work_status VARCHAR(100),
    selected_services TEXT
);

CREATE INDEX idx_contracts_code ON contracts(contract_code);
CREATE INDEX idx_contracts_customer ON contracts(customer_id);
CREATE INDEX idx_contracts_date ON contracts(contract_date);
CREATE INDEX idx_contracts_status ON contracts(status);

-- =====================================================
-- 8. BẢNG CHI TIẾT HỢP ĐỒNG
-- =====================================================

CREATE TABLE contract_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    detail_code VARCHAR(100) UNIQUE NOT NULL,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    display_label VARCHAR(255),
    contract_date DATE,
    type VARCHAR(50), -- 'Dịch vụ', 'Trang phục', 'Sản phẩm'
    work_date TIMESTAMPTZ,
    service_id UUID REFERENCES services(id),
    service_code VARCHAR(50),
    service_name VARCHAR(255),
    export_type VARCHAR(50), -- 'Xuất bán', 'Xuất thuê'
    stock_quantity INTEGER DEFAULT 0,
    description TEXT,
    unit_price DECIMAL(15,2) DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    discount DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contract_details_contract ON contract_details(contract_id);
CREATE INDEX idx_contract_details_service ON contract_details(service_id);

-- =====================================================
-- 9. BẢNG TIẾN ĐỘ CÔNG VIỆC
-- =====================================================

CREATE TABLE work_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_detail_id UUID REFERENCES contract_details(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id),
    contract_code VARCHAR(50),
    service_type VARCHAR(100),
    work_type VARCHAR(100), -- 'PHOTO', 'MAKEUP', 'RETOUCH', etc.
    customer_rating INTEGER,
    rating_type VARCHAR(50),
    rating_update_date DATE,
    info TEXT,
    label VARCHAR(255),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    assigned_to UUID REFERENCES employees(id),
    deadline TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    completion_date TIMESTAMPTZ,
    updated_by UUID REFERENCES employees(id),
    status VARCHAR(100), -- 'Đang làm', 'Đã làm', 'Chưa làm'
    progress VARCHAR(100), -- 'Sớm hẹn', 'Trễ hẹn', 'Đúng hẹn'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    total_contract_value DECIMAL(15,2) DEFAULT 0,
    sales_amount DECIMAL(15,2) DEFAULT 0,
    work_group VARCHAR(100)
);

CREATE INDEX idx_work_progress_contract ON work_progress(contract_id);
CREATE INDEX idx_work_progress_assigned ON work_progress(assigned_to);
CREATE INDEX idx_work_progress_status ON work_progress(status);

-- =====================================================
-- 10. BẢNG LỊCH LÀM VIỆC
-- =====================================================

CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id),
    contract_code VARCHAR(50),
    schedule_date TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(100), -- 'Quay TT Full', 'Ngày cưới', 'BaBy', etc.
    notes TEXT,
    status VARCHAR(100), -- 'Hoàn thành', 'Đang làm', 'Chưa làm'
    display_label VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    image_1_url TEXT,
    image_2_url TEXT,
    image_3_url TEXT
);

CREATE INDEX idx_schedules_contract ON schedules(contract_id);
CREATE INDEX idx_schedules_date ON schedules(schedule_date);

-- =====================================================
-- 11. BẢNG CHẤM CÔNG
-- =====================================================

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_code VARCHAR(100) UNIQUE,
    attendance_date DATE NOT NULL,
    work_shift_id UUID REFERENCES work_shifts(id),
    employee_id UUID REFERENCES employees(id),
    employee_code VARCHAR(50),
    employee_name VARCHAR(255),
    department VARCHAR(100),
    check_in_image_url TEXT,
    check_in_location VARCHAR(255),
    check_in_time TIME,
    check_out_time TIME,
    check_out_location VARCHAR(255),
    check_out_image_url TEXT,
    total_hours DECIMAL(5,2) DEFAULT 0,
    work_days DECIMAL(5,2) DEFAULT 0,
    notes TEXT,
    salary_id UUID,
    status VARCHAR(50),
    is_absent BOOLEAN DEFAULT FALSE,
    work_status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);

-- =====================================================
-- 12. BẢNG LƯƠNG THÁNG
-- =====================================================

CREATE TABLE monthly_salaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salary_code VARCHAR(50) UNIQUE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_employees INTEGER DEFAULT 0,
    base_salary_total DECIMAL(15,2) DEFAULT 0,
    product_salary_total DECIMAL(15,2) DEFAULT 0,
    bonus_total DECIMAL(15,2) DEFAULT 0,
    penalty_total DECIMAL(15,2) DEFAULT 0,
    advance_total DECIMAL(15,2) DEFAULT 0,
    total_salary DECIMAL(15,2) DEFAULT 0,
    print_file_url TEXT,
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_monthly_salaries_period ON monthly_salaries(year, month);

-- =====================================================
-- 13. BẢNG LƯƠNG NHÂN VIÊN
-- =====================================================

CREATE TABLE employee_salaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    monthly_salary_id UUID REFERENCES monthly_salaries(id) ON DELETE CASCADE,
    salary_code VARCHAR(50),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    employee_id UUID REFERENCES employees(id),
    employee_code VARCHAR(50),
    employee_name VARCHAR(255),
    department VARCHAR(100),
    base_salary DECIMAL(15,2) DEFAULT 0,
    attendance_days INTEGER DEFAULT 0,
    additional_days INTEGER DEFAULT 0,
    total_work_days INTEGER DEFAULT 0,
    total_work_hours DECIMAL(10,2) DEFAULT 0,
    monthly_salary DECIMAL(15,2) DEFAULT 0,
    product_salary DECIMAL(15,2) DEFAULT 0,
    bonus DECIMAL(15,2) DEFAULT 0,
    penalty DECIMAL(15,2) DEFAULT 0,
    total_salary DECIMAL(15,2) DEFAULT 0,
    advance_payment DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    net_salary DECIMAL(15,2) DEFAULT 0,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    remaining_amount DECIMAL(15,2) DEFAULT 0,
    print_file_url TEXT,
    label VARCHAR(255),
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    kpi_target DECIMAL(15,2) DEFAULT 0,
    kpi_achieved DECIMAL(15,2) DEFAULT 0,
    kpi_percentage DECIMAL(5,2) DEFAULT 0,
    unpaid_product_salary DECIMAL(15,2) DEFAULT 0
);

CREATE INDEX idx_employee_salaries_monthly ON employee_salaries(monthly_salary_id);
CREATE INDEX idx_employee_salaries_employee ON employee_salaries(employee_id);
CREATE INDEX idx_employee_salaries_period ON employee_salaries(year, month);

-- =====================================================
-- 14. BẢNG THU CHI - DANH MỤC
-- =====================================================

CREATE TABLE transaction_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_code VARCHAR(50) UNIQUE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- 'Thu', 'Chi'
    category_name VARCHAR(255) NOT NULL,
    icon_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 15. BẢNG PHIẾU THU
-- =====================================================

CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_type VARCHAR(50), -- 'Tiền mặt', 'Chuyển khoản'
    bank_account VARCHAR(100),
    category_id UUID REFERENCES transaction_categories(id),
    category_name VARCHAR(255),
    payment_type VARCHAR(100), -- 'THANH TOÁN LẦN 1', 'THANH TOÁN HẾT', etc.
    contract_id UUID REFERENCES contracts(id),
    contract_code VARCHAR(50),
    receipt_date DATE NOT NULL,
    total_amount DECIMAL(15,2) DEFAULT 0,
    previous_paid DECIMAL(15,2) DEFAULT 0,
    receipt_amount DECIMAL(15,2) NOT NULL,
    remaining_amount DECIMAL(15,2) DEFAULT 0,
    image_url TEXT,
    notes TEXT,
    status VARCHAR(50), -- 'Đã thu tiền mặt', 'Đã thu chuyển khoản', 'Chờ duyệt'
    unconfirmed_amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    print_file_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by UUID REFERENCES employees(id)
);

CREATE INDEX idx_receipts_contract ON receipts(contract_id);
CREATE INDEX idx_receipts_date ON receipts(receipt_date);
CREATE INDEX idx_receipts_status ON receipts(status);

-- =====================================================
-- 16. BẢNG PHIẾU CHI
-- =====================================================

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_date DATE NOT NULL,
    expense_type VARCHAR(50), -- 'Tiền mặt', 'Chuyển khoản'
    bank_account VARCHAR(100),
    category_id UUID REFERENCES transaction_categories(id),
    category_name VARCHAR(255),
    employee_salary_id UUID REFERENCES employee_salaries(id),
    current_total_salary DECIMAL(15,2) DEFAULT 0,
    info TEXT,
    contract_id UUID REFERENCES contracts(id),
    contract_code VARCHAR(50),
    expense_amount DECIMAL(15,2) NOT NULL,
    notes TEXT,
    recipient VARCHAR(255),
    image_url TEXT,
    status VARCHAR(50), -- 'Đã chi tiền mặt', 'Đã chi chuyển khoản', 'Chờ duyệt'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    print_file_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by UUID REFERENCES employees(id)
);

CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_contract ON expenses(contract_id);
CREATE INDEX idx_expenses_status ON expenses(status);

-- =====================================================
-- 17. BẢNG CHI PHÍ CỐ ĐỊNH
-- =====================================================

CREATE TABLE fixed_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cost_code VARCHAR(50) UNIQUE NOT NULL,
    cost_name VARCHAR(255) NOT NULL,
    cost_type VARCHAR(100), -- 'Quảng cáo', 'Tiền thuê nhà', 'Bảo trì', etc.
    description TEXT,
    monthly_amount DECIMAL(15,2) DEFAULT 0,
    deposit_amount DECIMAL(15,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 18. BẢNG THIẾT BỊ
-- =====================================================

CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_code VARCHAR(50) UNIQUE NOT NULL,
    equipment_name VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(100),
    manufacturer VARCHAR(255),
    image_url TEXT,
    supplier VARCHAR(255),
    purchase_link TEXT,
    purchase_date DATE,
    quantity INTEGER DEFAULT 1,
    warranty_months INTEGER DEFAULT 0,
    purchase_price DECIMAL(15,2) DEFAULT 0,
    depreciation_rate_yearly DECIMAL(5,2) DEFAULT 0,
    months_used INTEGER DEFAULT 0,
    current_value DECIMAL(15,2) DEFAULT 0,
    monthly_depreciation DECIMAL(15,2) DEFAULT 0,
    condition VARCHAR(100), -- 'Tốt', 'Hỏng', etc.
    notes TEXT,
    current_holder UUID REFERENCES employees(id),
    location VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id)
);

CREATE INDEX idx_equipment_code ON equipment(equipment_code);

-- =====================================================
-- 19. BẢNG NỢ PHẢI TRẢ
-- =====================================================

CREATE TABLE debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debt_name VARCHAR(255) NOT NULL,
    debt_type VARCHAR(50), -- 'NỢ NGẮN HẠN', 'NỢ DÀI HẠN'
    debtor VARCHAR(255),
    creditor VARCHAR(255),
    debt_amount DECIMAL(15,2) NOT NULL,
    debt_date DATE NOT NULL,
    due_date DATE,
    payment_date DATE,
    progress VARCHAR(100),
    status VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 20. BẢNG CRM - KHÁCH HÀNG TIỀM NĂNG
-- =====================================================

CREATE TABLE crm_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_date DATE NOT NULL,
    phone VARCHAR(20),
    contact_name VARCHAR(255),
    source VARCHAR(100), -- 'Facebook', 'Zalo', 'Website', etc.
    needs VARCHAR(255), -- 'Chụp Ngày Cưới', 'Chụp Sinh Nhật', etc.
    address TEXT,
    email VARCHAR(255),
    assigned_to UUID REFERENCES employees(id),
    potential VARCHAR(50), -- 'Đã chốt', 'Tiềm năng', 'Không tiềm năng'
    status VARCHAR(100), -- 'Chốt deal', 'Tư vấn', 'Báo giá', etc.
    notes TEXT,
    work_history TEXT,
    social_link TEXT,
    care_type VARCHAR(50), -- 'Zalo', 'Facebook', 'Call', etc.
    care_history TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    label VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    next_contact_date DATE
);

CREATE INDEX idx_crm_leads_phone ON crm_leads(phone);
CREATE INDEX idx_crm_leads_status ON crm_leads(status);
CREATE INDEX idx_crm_leads_assigned ON crm_leads(assigned_to);

-- =====================================================
-- 21. BẢNG TÀI LIỆU
-- =====================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_code VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100),
    document_type VARCHAR(100),
    document_name VARCHAR(255) NOT NULL,
    version INTEGER DEFAULT 1,
    publish_date DATE,
    image_url TEXT,
    file_url TEXT,
    link TEXT,
    distribution VARCHAR(255), -- Phân phối cho ai
    notes TEXT,
    status VARCHAR(50), -- 'Hiện hành', 'Hết hiệu lực'
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id)
);

-- =====================================================
-- 22. BẢNG NỘI QUY
-- =====================================================

CREATE TABLE regulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    regulation_code VARCHAR(50) UNIQUE NOT NULL,
    regulation_name VARCHAR(255) NOT NULL,
    penalty_amount DECIMAL(15,2) DEFAULT 0,
    label VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 23. BẢNG TRẠNG THÁI HỢP ĐỒNG
-- =====================================================

CREATE TABLE contract_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    previous_status VARCHAR(100),
    current_status VARCHAR(100) NOT NULL,
    next_status VARCHAR(100),
    description TEXT,
    responsible_role VARCHAR(100) -- 'Sale', 'Photo', 'Makeup', etc.
);

-- =====================================================
-- 24. BẢNG YÊU CẦU (Đơn xin nghỉ, tạm ứng, etc.)
-- =====================================================

CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_date DATE NOT NULL,
    request_type VARCHAR(50), -- 'Nghỉ phép', 'Tạm ứng', etc.
    leave_type VARCHAR(50), -- 'Nghỉ có lương', 'Nghỉ không lương', etc.
    reason TEXT,
    amount DECIMAL(15,2) DEFAULT 0,
    image_url TEXT,
    notes TEXT,
    requester_id UUID REFERENCES employees(id),
    message TEXT,
    approver_id UUID REFERENCES employees(id),
    approval_date DATE,
    status VARCHAR(50), -- 'Chờ duyệt', 'Đã duyệt', 'Từ chối'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id)
);

CREATE INDEX idx_requests_requester ON requests(requester_id);
CREATE INDEX idx_requests_status ON requests(status);

-- =====================================================
-- 25. BẢNG ĐÁNH GIÁ (Thưởng/Phạt)
-- =====================================================

CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_salary_id UUID REFERENCES employee_salaries(id),
    monthly_salary_id UUID REFERENCES monthly_salaries(id),
    evaluation_date DATE NOT NULL,
    employee_id UUID REFERENCES employees(id),
    employee_code VARCHAR(50),
    employee_name VARCHAR(255),
    evaluation_type VARCHAR(50), -- 'Thưởng', 'Phạt'
    description TEXT,
    level VARCHAR(50),
    times INTEGER DEFAULT 1,
    amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id)
);

CREATE INDEX idx_evaluations_employee ON evaluations(employee_id);

-- =====================================================
-- 26. BẢNG NGÀY CHẤM CÔNG (Tổng hợp)
-- =====================================================

CREATE TABLE attendance_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_date DATE NOT NULL,
    year_month VARCHAR(7), -- Format: 'MM/YYYY'
    total_employees INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id)
);

-- =====================================================
-- 27. BẢNG TÍNH ĐIỂM HÒA VỐN
-- =====================================================

CREATE TABLE break_even_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    info VARCHAR(255),
    start_date DATE,
    end_date DATE,
    services TEXT, -- Danh sách dịch vụ
    fixed_cost DECIMAL(15,2) DEFAULT 0,
    fixed_cost_percentage DECIMAL(5,2) DEFAULT 0,
    variable_cost DECIMAL(15,2) DEFAULT 0,
    base_salary_from_info DECIMAL(15,2) DEFAULT 0,
    total_depreciation_cost DECIMAL(15,2) DEFAULT 0,
    total_fixed_cost DECIMAL(15,2) DEFAULT 0,
    total_variable_cost DECIMAL(15,2) DEFAULT 0,
    average_service_price DECIMAL(15,2) DEFAULT 0,
    gross_profit_margin_percentage DECIMAL(5,2) DEFAULT 0,
    actual_gross_profit_percentage DECIMAL(5,2) DEFAULT 0,
    break_even_point INTEGER DEFAULT 0,
    target_profit DECIMAL(15,2) DEFAULT 0,
    required_service_quantity INTEGER DEFAULT 0,
    signed_contracts INTEGER DEFAULT 0,
    break_even_revenue DECIMAL(15,2) DEFAULT 0,
    target_revenue DECIMAL(15,2) DEFAULT 0,
    current_revenue DECIMAL(15,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS - Tự động cập nhật updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Áp dụng trigger cho các bảng cần thiết
CREATE TRIGGER update_studio_info_updated_at BEFORE UPDATE ON studio_info FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contract_details_updated_at BEFORE UPDATE ON contract_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - Bảo mật dữ liệu
-- =====================================================

-- Enable RLS cho các bảng quan trọng
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salaries ENABLE ROW LEVEL SECURITY;

-- Policy mẫu: Nhân viên chỉ xem được lương của mình
CREATE POLICY "Employees can view own salary"
    ON employee_salaries
    FOR SELECT
    USING (auth.uid()::text = employee_id::text);

-- Policy: Admin có thể xem tất cả
CREATE POLICY "Admin can view all salaries"
    ON employee_salaries
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id::text = auth.uid()::text
            AND lower(role) = 'admin'
        )
    );

-- =====================================================
-- VIEWS - Các view hữu ích
-- =====================================================

-- View: Tổng quan doanh thu theo tháng
CREATE OR REPLACE VIEW monthly_revenue_summary AS
SELECT 
    DATE_TRUNC('month', contract_date) as month,
    COUNT(*) as total_contracts,
    SUM(total_amount) as total_revenue,
    SUM(paid_amount) as total_paid,
    SUM(remaining_amount) as total_remaining
FROM contracts
GROUP BY DATE_TRUNC('month', contract_date)
ORDER BY month DESC;

-- View: Công việc đang pending
CREATE OR REPLACE VIEW pending_work AS
SELECT 
    wp.*,
    c.contract_code,
    c.customer_name,
    e.full_name as assigned_employee
FROM work_progress wp
LEFT JOIN contracts c ON wp.contract_id = c.id
LEFT JOIN employees e ON wp.assigned_to = e.id
WHERE wp.status IN ('Đang làm', 'Chưa làm')
ORDER BY wp.deadline ASC;

-- View: Lương tháng hiện tại
CREATE OR REPLACE VIEW current_month_salaries AS
SELECT 
    es.*,
    e.full_name,
    e.department,
    e.phone
FROM employee_salaries es
LEFT JOIN employees e ON es.employee_id = e.id
WHERE es.year = EXTRACT(YEAR FROM CURRENT_DATE)
AND es.month = EXTRACT(MONTH FROM CURRENT_DATE);

-- =====================================================
-- 32. HÀM VÀ TRIGGER AUDIT LOGGING
-- =====================================================

CREATE OR REPLACE FUNCTION log_audit_action()
RETURNS TRIGGER AS $$
DECLARE
    emp_id UUID;
BEGIN
    -- Lấy employee_id từ session (Supabase auth.uid)
    emp_id := (SELECT id FROM employees WHERE id::text = auth.uid()::text LIMIT 1);
    
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (employee_id, action, table_name, record_id, old_data)
        VALUES (emp_id, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (employee_id, action, table_name, record_id, old_data, new_data)
        VALUES (emp_id, 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (employee_id, action, table_name, record_id, new_data)
        VALUES (emp_id, 'CREATE', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Áp dụng Audit Log cho các bảng tiền bạc nhạy cảm
CREATE TRIGGER audit_contracts AFTER INSERT OR UPDATE OR DELETE ON contracts FOR EACH ROW EXECUTE FUNCTION log_audit_action();
CREATE TRIGGER audit_receipts AFTER INSERT OR UPDATE OR DELETE ON receipts FOR EACH ROW EXECUTE FUNCTION log_audit_action();
CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON expenses FOR EACH ROW EXECUTE FUNCTION log_audit_action();
CREATE TRIGGER audit_inventory AFTER INSERT OR UPDATE OR DELETE ON inventory_items FOR EACH ROW EXECUTE FUNCTION log_audit_action();

-- =====================================================
-- INDEXES bổ sung cho performance
-- =====================================================

CREATE INDEX idx_contracts_created_at ON contracts(created_at);
CREATE INDEX idx_receipts_created_at ON receipts(created_at);
CREATE INDEX idx_expenses_created_at ON expenses(created_at);
CREATE INDEX idx_work_progress_deadline ON work_progress(deadline);
CREATE INDEX idx_schedules_created_at ON schedules(created_at);

-- =====================================================
-- COMMENTS - Ghi chú cho các bảng
-- =====================================================

COMMENT ON TABLE studio_info IS 'Thông tin cơ bản về studio';
COMMENT ON TABLE employees IS 'Danh sách nhân viên và cộng tác viên';
COMMENT ON TABLE customers IS 'Thông tin khách hàng';
COMMENT ON TABLE services IS 'Danh mục dịch vụ, sản phẩm, trang phục';
COMMENT ON TABLE contracts IS 'Hợp đồng với khách hàng';
COMMENT ON TABLE contract_details IS 'Chi tiết dịch vụ trong từng hợp đồng';
COMMENT ON TABLE work_progress IS 'Tiến độ công việc của từng hợp đồng';
COMMENT ON TABLE receipts IS 'Phiếu thu tiền';
COMMENT ON TABLE expenses IS 'Phiếu chi tiền';
COMMENT ON TABLE employee_salaries IS 'Lương nhân viên theo tháng';
COMMENT ON TABLE crm_leads IS 'Quản lý khách hàng tiềm năng';

-- =====================================================
-- 28. BẢNG VẬT TƯ TIÊU HAO (Consumables)
-- =====================================================

CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'Vật liệu in', 'Makeup', 'Văn phòng phẩm'
    unit VARCHAR(50), -- 'Cái', 'Cuộn', 'Bộ'
    min_stock INTEGER DEFAULT 5, -- Cảnh báo khi dưới mức này
    current_stock INTEGER DEFAULT 0,
    average_unit_price DECIMAL(15,2) DEFAULT 0,
    supplier VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 29. BẢNG NHẬT KÝ THAO TÁC (Audit Logs)
-- =====================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    action VARCHAR(100) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'
    table_name VARCHAR(100),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_employee ON audit_logs(employee_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, record_id);

-- =====================================================
-- 30. BẢNG KHUYẾN MÃI & VOUCHER (Promotions)
-- =====================================================

CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promo_code VARCHAR(50) UNIQUE NOT NULL,
    promo_name VARCHAR(255) NOT NULL,
    discount_type VARCHAR(20), -- 'Percentage', 'Fixed'
    discount_value DECIMAL(15,2) NOT NULL,
    min_order_value DECIMAL(15,2) DEFAULT 0,
    max_discount_amount DECIMAL(15,2),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 31. BẢNG THÔNG BÁO (Notifications)
-- =====================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id), -- NULL nếu gửi cho tất cả
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50), -- 'Alert', 'Reminder', 'Message', 'System'
    is_read BOOLEAN DEFAULT FALSE,
    link_url TEXT, -- Link dẫn đến record liên quan
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_employee ON notifications(employee_id, is_read);

-- =====================================================
-- BỔ SUNG COMMENTS
-- =====================================================

COMMENT ON TABLE inventory_items IS 'Quản lý vật tư tiêu hao (phôi ảnh, đồ makeup...)';
COMMENT ON TABLE audit_logs IS 'Nhật ký thay đổi dữ liệu để truy vết';
COMMENT ON TABLE promotions IS 'Mã giảm giá và chương trình khuyến mãi';
COMMENT ON TABLE notifications IS 'Thông báo dành cho nhân viên';

-- =====================================================
-- 33. BẢNG QUẢN LÝ XƯỞNG IN (LABS)
-- =====================================================

CREATE TABLE labs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE printing_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id),
    contract_code VARCHAR(50),
    lab_id UUID REFERENCES labs(id),
    item_name VARCHAR(255) NOT NULL, -- Tên sản phẩm in (VD: Album 30x30, Ảnh cổng 60x90)
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2),
    order_date DATE DEFAULT CURRENT_DATE,
    expected_date DATE,
    received_date DATE,
    status VARCHAR(50) DEFAULT 'Đang in', -- 'Đang in', 'Đã về', 'Đã giao khách'
    payment_status VARCHAR(50) DEFAULT 'Chưa thanh toán', -- 'Chưa thanh toán', 'Đã thanh toán'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 34. BẢNG QUẢN LÝ VÁY CƯỚI & TRANG PHỤC
-- =====================================================

CREATE TABLE wedding_dresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dress_code VARCHAR(50) UNIQUE NOT NULL,
    dress_name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'Váy cưới', 'Váy lửng', 'Áo dài', 'Vest'
    color VARCHAR(50),
    size VARCHAR(20),
    image_url TEXT,
    purchase_price DECIMAL(15,2) DEFAULT 0,
    rental_price DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Sẵn sàng', -- 'Sẵn sàng', 'Đang giặt', 'Hỏng', 'Thanh lý'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dress_rentals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id),
    dress_id UUID REFERENCES wedding_dresses(id),
    pickup_date DATE,
    return_date DATE,
    status VARCHAR(50) DEFAULT 'Đã đặt', -- 'Đã đặt', 'Đã lấy', 'Đã trả'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 35. BẢNG KẾ HOẠCH THANH TOÁN (PAYMENT MILESTONES)
-- =====================================================

CREATE TABLE payment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id),
    milestone_name VARCHAR(255) NOT NULL, -- 'Cọc lần 1', 'Thanh toán ngày chụp', 'Lấy Album'
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'Chưa thu', -- 'Chưa thu', 'Đã thu'
    paid_date DATE,
    receipt_id UUID REFERENCES receipts(id), -- Liên kết với phiếu thu thực tế
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apply Triggers for new tables
CREATE TRIGGER update_printing_orders_updated_at BEFORE UPDATE ON printing_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wedding_dresses_updated_at BEFORE UPDATE ON wedding_dresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit logging for new sensitive tables
CREATE TRIGGER audit_printing_orders AFTER INSERT OR UPDATE OR DELETE ON printing_orders FOR EACH ROW EXECUTE FUNCTION log_audit_action();
CREATE TRIGGER audit_wedding_dresses AFTER INSERT OR UPDATE OR DELETE ON wedding_dresses FOR EACH ROW EXECUTE FUNCTION log_audit_action();
CREATE TRIGGER audit_payment_plans AFTER INSERT OR UPDATE OR DELETE ON payment_plans FOR EACH ROW EXECUTE FUNCTION log_audit_action();

-- =====================================================
-- 21. BẢNG GIÁ DỊCH VỤ XƯỞNG IN (LAB PRICES)
-- =====================================================

CREATE TABLE lab_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_id UUID REFERENCES labs(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    cost_price DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lab_services_lab ON lab_services(lab_id);

-- Trigger cập nhật updated_at
CREATE TRIGGER update_lab_services_modtime BEFORE UPDATE ON lab_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit logging
CREATE TRIGGER audit_lab_services AFTER INSERT OR UPDATE OR DELETE ON lab_services FOR EACH ROW EXECUTE FUNCTION log_audit_action();

-- =====================================================
-- END OF SCHEMA
-- =====================================================
