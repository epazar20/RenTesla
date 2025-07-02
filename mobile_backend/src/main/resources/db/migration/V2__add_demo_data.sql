-- Insert demo admin user
INSERT INTO users (
    first_name,
    last_name,
    email,
    phone,
    role,
    document_verified,
    kyck_consent_given,
    open_consent_given,
    created_by,
    updated_by
) VALUES (
    'Admin',
    'User',
    'admin@rentesla.com',
    '+905551234567',
    'ADMIN',
    TRUE,
    TRUE,
    TRUE,
    'system',
    'system'
);

-- Insert demo customer user
INSERT INTO users (
    first_name,
    last_name,
    email,
    phone,
    role,
    document_verified,
    kyck_consent_given,
    open_consent_given,
    created_by,
    updated_by
) VALUES (
    'Demo',
    'User',
    'demo@rentesla.com',
    '+905559876543',
    'CUSTOMER',
    FALSE,
    TRUE,
    TRUE,
    'system',
    'system'
); 