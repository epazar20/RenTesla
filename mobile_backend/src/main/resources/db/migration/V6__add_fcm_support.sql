-- V6: Add FCM (Firebase Cloud Messaging) support
-- Add FCM token storage to users table
ALTER TABLE users ADD COLUMN fcm_token VARCHAR(255);
ALTER TABLE users ADD COLUMN fcm_token_updated_at TIMESTAMP;

-- Create notifications table for storing notification history
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSON,
    type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered BOOLEAN DEFAULT FALSE,
    opened BOOLEAN DEFAULT FALSE,
    fcm_message_id VARCHAR(255),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Foreign key constraints
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_delivered ON notifications(delivered);
CREATE INDEX idx_users_fcm_token ON users(fcm_token);
CREATE INDEX idx_users_role ON users(role);

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'Stores push notification history and delivery status';
COMMENT ON COLUMN users.fcm_token IS 'Firebase Cloud Messaging registration token for push notifications';
COMMENT ON COLUMN users.fcm_token_updated_at IS 'Timestamp when FCM token was last updated';
COMMENT ON COLUMN notifications.type IS 'Notification type: DOCUMENT_UPLOADED, DOCUMENT_APPROVED, etc.';
COMMENT ON COLUMN notifications.data IS 'Additional JSON data for the notification';
COMMENT ON COLUMN notifications.fcm_message_id IS 'Firebase message ID for tracking';
COMMENT ON COLUMN notifications.retry_count IS 'Number of retry attempts for failed notifications'; 
 